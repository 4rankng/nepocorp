/**
 * OCR service for extracting container & seal numbers from photos via Google Gemini.
 *
 * Ported (faithfully) from vantaiphucloc:
 *   - app/contexts/operations/infrastructure/ai.py   → callGeminiVision / preprocessImage
 *   - app/contexts/operations/infrastructure/ocr.py   → extractContainerAndSeal
 *
 * Accuracy techniques:
 *   - Structured JSON output via Gemini responseSchema (temperature 0.0 = deterministic)
 *   - Hard-coded 2-model fallback chain (mirrors vantaiphucloc ai.py)
 *   - Image preprocessing: downscale + auto-contrast (.normalise())
 *   - ISO 6346 check-digit auto-correction for near-miss container numbers
 *
 * Design (matches phucloc + spec Decision 1): we validate FORMAT only and
 * intentionally do NOT reject numbers with a bad check digit — VLMs misread
 * 1–2 characters. The driver/user visually confirms; the frontend flags
 * check-digit mismatches as a warning. Numbers are never auto-committed here.
 */
import sharp from 'sharp';
import { config } from '../config';
import { validateCheckDigit, suggestCorrections } from '@tingting/shared';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Hard-coded model fallback chain — tries each in order until one succeeds.
 * Mirrors vantaiphucloc ai.py `_GEMINI_MODELS`. Using capable multimodal
 * models avoids a 2-pass fallback and survives single-model 503 overload.
 */
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'] as const;

const VISION_TIMEOUT_MS = 60_000;
const MAX_IMAGE_DIMENSION = 2048;
const MAX_DETECT = 10;

// Format validator (anchored) and global extractor (for free-text fallback).
const CONTAINER_RE = /^[A-Z]{4}\d{7}$/;
const CONTAINER_RE_G = /[A-Z]{4}\d{7}/g;

const MULTI_CONTAINER_PROMPT = `Role: You are an expert logistics OCR assistant specializing in shipping containers. Examine the provided image and extract all standard ISO shipping container numbers.

Extraction Rules:

Format: A valid container number ALWAYS consists of exactly 4 uppercase letters followed by exactly 7 digits (e.g., MSKU1234567 or ALLU5216535).

Layout: The letters and digits may be separated by spaces, dashes, or printed across multiple lines. Concatenate them into a single, continuous 11-character alphanumeric string without spaces.

Exclusions: Strictly ignore ISO size/type codes (e.g., 22G1, 45G1, 42G1), company names, and weight/capacity specifications (e.g., MAX GW, TARE, NET, CU CAP, KG, LB).

Common Errors: Pay close attention to characters that look similar (e.g., distinguish the letter O from the number 0, the letter Q from O, and the letter S from the number 5). Remember: the first 4 characters are always letters, and the last 7 are always numbers.

Output: Return ONLY a clean JSON object containing the recognized container numbers and the seal number. Do not include any conversational text. Example: {"container_numbers": ["ALLU5216535", "LSQU1077376"], "seal_number": "VN123456"}

Also extract the seal number printed on the seal. A seal number is alphanumeric, UPPERCASE, no spaces (e.g. "VN123456"). If no seal is visible, return null for seal_number. A seal has no check-digit standard — return it verbatim.`;

// JSON schema enforced at the Gemini engine level (Gemini v1beta schema format).
const CONTAINER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    container_numbers: {
      type: 'ARRAY',
      description: 'List of all valid ISO 6346 container numbers found in the image.',
      items: { type: 'STRING', pattern: '^[A-Z]{4}\\d{7}$' },
    },
    seal_number: {
      type: 'STRING',
      nullable: true,
      description: 'Alphanumeric seal number printed on the seal (uppercase, no spaces), or null if none.',
    },
  },
  required: ['container_numbers'],
};

export interface GeminiVisionResult {
  success: boolean;
  text: string | null;
  error: string | null;
  provider: 'gemini';
  model: string | null;
  fallbackUsed: boolean;
}

interface GeminiPart { text?: string }
interface GeminiContent { parts?: GeminiPart[] }
interface GeminiCandidate { content?: GeminiContent }
interface GeminiResponse { candidates?: GeminiCandidate[] }

/**
 * Call Gemini with an image + prompt. Iterates the hard-coded model chain,
 * returning on the first success. Empty key → friendly error (no 500).
 */
export async function callGeminiVision(
  prompt: string,
  imageBuffer: Buffer,
  mimeType: string,
  responseSchema?: Record<string, unknown>,
): Promise<GeminiVisionResult> {
  if (!config.geminiApiKey) {
    return {
      success: false,
      text: null,
      error: 'OCR chưa cấu hình (thiếu GEMINI_API_KEY)',
      provider: 'gemini',
      model: null,
      fallbackUsed: false,
    };
  }

  const encoded = imageBuffer.toString('base64');
  const generationConfig: Record<string, unknown> = {
    temperature: 0.0,
    maxOutputTokens: 4096,
  };
  if (responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = responseSchema;
  }

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: encoded } },
      ],
    }],
    generationConfig,
  };

  let lastError: string | null = null;

  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_ENDPOINT}/models/${model}:generateContent?key=${config.geminiApiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '<no body>');
        console.error(`[ocr] Gemini ${model} → ${response.status}: ${errBody.slice(0, 600)} | keyPrefix=${config.geminiApiKey.slice(0, 6)}… keyLen=${config.geminiApiKey.length} | buffer=${buffer.length}B mime=${mime} schemaKeys=${Object.keys(responseSchema ?? {}).join(',')}`);
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const result = (await response.json()) as GeminiResponse;
      const candidates = result.candidates;
      if (!candidates || candidates.length === 0) {
        lastError = 'No response generated';
        continue;
      }

      const text = (candidates[0]?.content?.parts?.[0]?.text ?? '').trim();
      return {
        success: true,
        text,
        error: null,
        provider: 'gemini',
        model,
        fallbackUsed: model !== GEMINI_MODELS[0],
      };
    } catch (e) {
      lastError = e instanceof Error
        ? (e.name === 'AbortError' ? `Timeout after ${VISION_TIMEOUT_MS}ms` : `${e.name}: ${e.message}`)
        : 'Request failed';
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    success: false,
    text: null,
    error: lastError ?? 'All models failed',
    provider: 'gemini',
    model: null,
    fallbackUsed: false,
  };
}

/**
 * Lightweight preprocessing — downscale + auto-contrast. Equivalent to
 * vantaiphucloc `preprocess_image` (PIL autocontrast cutoff=1 + LANCZOS
 * downscale). Modern VLMs read faded/night/shadowed paint better when text
 * stands out. Returns JPEG bytes + mime.
 */
export async function preprocessImage(imageBuffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
  const processed = await sharp(imageBuffer)
    .rotate() // auto-orient from EXIF, then strip metadata
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .normalise() // auto-contrast (≈ PIL ImageOps.autocontrast cutoff=1)
    .jpeg({ quality: 95 })
    .toBuffer();
  return { buffer: processed, mimeType: 'image/jpeg' };
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

interface ParsedResponse {
  containerNumbers: string[];
  sealNumber: string | null;
}

/** Extract container numbers + seal from the Gemini response (JSON, then regex fallback). */
function parseResponse(text: string | null): ParsedResponse {
  if (!text) return { containerNumbers: [], sealNumber: null };

  // 1. Structured JSON first
  try {
    const data = JSON.parse(text) as { container_numbers?: unknown; seal_number?: unknown };
    const nums = Array.isArray(data.container_numbers)
      ? data.container_numbers
          .map(n => String(n).toUpperCase().trim())
          .filter(n => CONTAINER_RE.test(n))
      : [];
    const seal = typeof data.seal_number === 'string' && data.seal_number.trim()
      ? data.seal_number.toUpperCase().trim()
      : null;
    return { containerNumbers: dedupe(nums), sealNumber: seal };
  } catch {
    // fall through to regex
  }

  // 2. Fallback: regex extraction from free-text response (containers only)
  const cleaned = text.replace(/[`"'\n\r]/g, '').trim().toUpperCase();
  if (cleaned === 'NONE') return { containerNumbers: [], sealNumber: null };
  const matches = cleaned.match(CONTAINER_RE_G) ?? [];
  return { containerNumbers: dedupe(matches), sealNumber: null };
}

interface AutoCorrectResult {
  numbers: string[];
  warnings: string[];
}

/** Auto-correct numbers with bad check digits using ISO 6346 suggestions. */
function autoCorrectNumbers(numbers: string[]): AutoCorrectResult {
  const warnings: string[] = [];
  const corrected: string[] = [];
  for (const n of numbers) {
    if (validateCheckDigit(n)) {
      corrected.push(n);
    } else {
      const suggestions = suggestCorrections(n, 1);
      if (suggestions.length > 0) {
        warnings.push(`${n} → ${suggestions[0]}`);
        corrected.push(suggestions[0]);
      } else {
        corrected.push(n);
      }
    }
  }
  return { numbers: dedupe(corrected), warnings };
}

export interface ExtractResult {
  success: boolean;
  containerNumbers: string[];
  sealNumber: string | null;
  /** Near-miss corrections applied, formatted "ORIGINAL → CORRECTED". */
  checkDigitWarnings: string[];
  error: string | null;
  provider: 'gemini';
  model: string | null;
}

/**
 * Extract ALL container numbers + the seal number from an image.
 *
 * Single deterministic call (temperature 0.0). Container numbers with invalid
 * ISO 6346 check digits are auto-corrected when a near-miss valid number exists;
 * the original→corrected mapping is returned in `checkDigitWarnings` so the UI
 * can show it for manual confirmation.
 */
export async function extractContainerAndSeal(
  imageBuffer: Buffer,
  mimeType = 'image/jpeg',
): Promise<ExtractResult> {
  let buffer = imageBuffer;
  let mime = mimeType;
  try {
    const pre = await preprocessImage(imageBuffer);
    buffer = pre.buffer;
    mime = pre.mimeType;
  } catch {
    // keep raw image if preprocessing fails
  }

  const result = await callGeminiVision(MULTI_CONTAINER_PROMPT, buffer, mime, CONTAINER_SCHEMA);

  if (!result.success || !result.text) {
    return {
      success: false,
      containerNumbers: [],
      sealNumber: null,
      checkDigitWarnings: [],
      error: result.error ?? 'Không nhận dạng được số cont',
      provider: 'gemini',
      model: result.model,
    };
  }

  const parsed = parseResponse(result.text);
  // Validate FORMAT only (4 letters + 7 digits). We intentionally skip the
  // ISO 6346 check-digit verification here — VLMs misread 1–2 chars. The user
  // visually confirms; checkDigitWarnings surface auto-corrections.
  const valid = parsed.containerNumbers.filter(n => CONTAINER_RE.test(n));

  if (valid.length === 0) {
    return {
      success: false,
      containerNumbers: [],
      sealNumber: parsed.sealNumber,
      checkDigitWarnings: [],
      error: 'Không nhận dạng được số cont',
      provider: 'gemini',
      model: result.model,
    };
  }

  const { numbers, warnings } = autoCorrectNumbers(valid);
  const capped = numbers.slice(0, MAX_DETECT);

  return {
    success: true,
    containerNumbers: capped,
    sealNumber: parsed.sealNumber,
    checkDigitWarnings: warnings,
    error: null,
    provider: 'gemini',
    model: result.model,
  };
}
