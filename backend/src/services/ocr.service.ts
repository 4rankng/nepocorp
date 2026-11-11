/**
 * OCR service for extracting container & seal numbers from photos.
 *
 * Single vision provider: OpenRouter (callOpenRouterVision) — the only
 * provider this product uses. The admin configures the key + model in
 * Cài đặt ứng dụng; an upstream error fails the request with the true
 * upstream error — no second provider masks it. Extraction is allowed ONE
 * same-model retry when a call succeeds but no type-valid number comes back
 * (per-attempt flakiness on worn, low-contrast seals).
 *
 * The OpenRouter key + model come from the ADMIN settings
 * (services/ocr/settings.ts — encrypted key + model slug, NEPO-28), falling
 * back to the env `OPENROUTER_API_KEY` and the default model
 * (`anthropic/claude-haiku-5.5`) when the admin has not configured anything.
 * The earlier Qwen3-VL-32B slug stopped recognizing numbers reliably on
 * container/seal photos (empty extractions, seal numbers never returned);
 * Haiku 5.5 restored extraction quality.
 *
 * Ported (faithfully) from vantaiphucloc:
 *   - app/contexts/operations/infrastructure/openrouter.py → callOpenRouterVision
 *   - app/contexts/operations/infrastructure/ai.py         → preprocessImage
 *   - app/contexts/operations/infrastructure/ocr.py        → extractContainerAndSeal
 *
 * Accuracy techniques:
 *   - Prompt-only JSON + regex net (temperature 0.0)
 *   - `think` stripping for reasoning-model output (defensive; cheap)
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
import { OCR_AI_DEFAULT_MODEL } from '@tingting/shared';
import { getOcrAiSettings } from './ocr/settings';

const MAX_IMAGE_DIMENSION = 2048;
const MAX_DETECT = 10;

// Format validator (anchored) and global extractor (for free-text fallback).
const CONTAINER_RE = /^[A-Z]{4}\d{7}$/;
const CONTAINER_RE_G = /[A-Z]{4}\d{7}/g;

// OpenRouter vision transport — endpoint AND model come from the admin
// settings (services/ocr/settings.ts), falling back to the env key and the
// default model. Only the endpoint itself is a constant (fixed
// OpenAI-compatible endpoint; mirrors the MiniMax LLM pattern,
// services/llm/models.ts).
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
// Default vision model — single source in shared. Production evidence
// (nepocorp ocr_requests, 2026-11): google/gemini-2.5-flash extracted zero
// seal numbers from live fleet photos (17 failed reads) while the prior
// anthropic/claude-haiku-5.5 window completed 32/32 including seals — so
// Haiku is the default. The ADMIN can pick another model in Cài đặt ứng
// dụng; this constant is only the fallback.
const OCR_MODEL = OCR_AI_DEFAULT_MODEL;

/**
 * The credentials + model one OCR call runs with.
 *
 * Injected into the vision calls so the transport has no hidden global state:
 * the admin settings service resolves it (DB → env fallback) and the tests
 * pass a pinned value.
 */
export interface OcrAiConfig {
  /** OpenRouter API key. '' means OCR is not configured. */
  apiKey: string;
  /** OpenRouter model slug, e.g. 'anthropic/claude-haiku-5.5'. */
  model: string;
}

/**
 * Resolve the effective OCR AI config from the admin settings, with the env
 * key + default model as the fallback. A settings-store failure must never
 * break OCR, so it degrades to the env configuration instead of throwing.
 */
export async function resolveOcrAiConfig(): Promise<OcrAiConfig> {
  try {
    const settings = await getOcrAiSettings();
    return {
      apiKey: settings.apiKey || config.openrouterApiKey,
      model: settings.model || OCR_MODEL,
    };
  } catch (error) {
    console.error('[ocr] failed to load AI settings, falling back to env:', error);
    return { apiKey: config.openrouterApiKey, model: OCR_MODEL };
  }
}

// OpenRouter (OpenAI-compatible) call budget. Reasoning models can wrap
// chain-of-thought in `think…` blocks; strip both closed blocks and an
// unclosed trailing one (truncation mid-thought). Ported from vantaiphucloc
// openrouter.py.
const OPENROUTER_TIMEOUT_MS = 60_000;
const THINK_RE = /<think>.*?<\/think>/gis;
const THINK_TRAILING_RE = /<think>.*$/gis;

const MULTI_CONTAINER_PROMPT = `Role: You are an expert logistics OCR assistant specializing in shipping containers. Examine the provided image and extract all standard ISO shipping container numbers.

Extraction Rules:

Format: A valid container number ALWAYS consists of exactly 4 uppercase letters followed by exactly 7 digits (e.g., MSKU1234567 or ALLU5216535).

Layout: The letters and digits may be separated by spaces, dashes, or printed across multiple lines. Concatenate them into a single, continuous 11-character alphanumeric string without spaces.

Exclusions: Strictly ignore ISO size/type codes (e.g., 22G1, 45G1, 42G1), company names, and weight/capacity specifications (e.g., MAX GW, TARE, NET, CU CAP, KG, LB). Also ignore any seal number — focus on container numbers only.

Common Errors: Pay close attention to characters that look similar (e.g., distinguish the letter O from the number 0, the letter Q from O, and the letter S from the number 5). Remember: the first 4 characters are always letters, and the last 7 are numbers.

Output: Return ONLY a clean JSON object containing the recognized container numbers. Do not include any conversational text. Example: {"container_numbers": ["ALLU5216535", "LSQU1077376"]}`;

const SEAL_PROMPT = `Role: You are an expert logistics OCR assistant specializing in shipping container seals. Examine the provided image and extract the seal number printed on the container seal.

Extraction Rules:

Format: A seal number is alphanumeric, UPPERCASE, no spaces (e.g., "VN123456", "SL1234567", "ABC12345"). It often appears on a bolt seal, cable seal, or a sticker near the container door handles.

Layout: The characters may be separated by spaces or dashes. Concatenate them into a single continuous string without spaces.

Image quality: Laser-etched seals are often worn, faint, or low-contrast — especially dark blue/black seals photographed in shade, where the etching appears as shallow dots or scratches. The characters are usually still legible on close inspection; read them carefully before concluding no seal is present.

Exclusions: Strictly ignore ISO container numbers (4 letters + 7 digits such as MSKU1234567), ISO size/type codes (e.g., 22G1, 45G1), company names, and weight/capacity specifications (e.g., MAX GW, TARE, NET, CU CAP, KG, LB). Focus on the seal number only.

Common Errors: Pay close attention to characters that look similar (e.g., distinguish the letter O from the number 0, the letter I from the number 1). Seal numbers have no fixed length — return the full value exactly as printed.

Output: Return ONLY a clean JSON object containing the recognized seal number. Do not include any conversational text. Example: {"seal_number": "VN123456"}`;

/** Which vision provider produced (or failed to produce) a result. */
export type VisionProvider = 'openrouter';

/** Provider-agnostic result of a single vision call. */
export interface VisionResult {
  success: boolean;
  text: string | null;
  error: string | null;
  provider: VisionProvider;
  model: string | null;
}

// OpenAI-compatible (OpenRouter) response shapes. `message.content` may be a
// plain string OR an array of typed parts — extractContentText normalizes both.
interface OpenRouterTextPart { type: 'text'; text: string }
interface OpenRouterMessage { content?: unknown }
interface OpenRouterChoice { message?: OpenRouterMessage }
interface OpenRouterResponse { choices?: OpenRouterChoice[]; model?: string }

// ── OpenRouter vision client (Anthropic Claude Haiku 5.5) ───────────────────
// Faithful port of vantaiphucloc openrouter.py: OpenAI-compatible Chat
// Completions, image as a base64 data URI, temperature 0, NO response_format
// (model support for json_object is uneven — a 400 would fail every request;
// parseResponse()'s regex net is the safety net).

/** Remove <think> reasoning blocks (closed, and a trailing unclosed one). */
function stripThink(text: string): string {
  return text.replace(THINK_RE, '').replace(THINK_TRAILING_RE, '').trim();
}

/**
 * Normalize an OpenAI-style `message.content` to a string. Per the spec the
 * field may be a plain string OR an array of typed parts [{type:'text',text}].
 * Narrowing to `typeof === 'string'` only would silently drop parts-array
 * responses (spurious "empty" failures). Ported from openrouter.py
 * `_extract_text`.
 */
function extractContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b): b is OpenRouterTextPart =>
        typeof b === 'object' && b !== null && (b as { type?: string }).type === 'text')
      .map(b => b.text)
      .join('\n');
  }
  return '';
}

/**
 * Call an OpenRouter vision model. Empty key → friendly error (no throw). On a
 * non-2xx the status is returned as `HTTP <status>` (with a server-side log of
 * the upstream body) so a 429/401/404 is distinguishable. A 60s AbortController
 * guards against hangs; on abort the error names the timeout.
 *
 * `ai` carries the API key + model. When omitted it is resolved from the
 * admin settings (DB → env fallback); callers that already resolved it pass
 * it in so one OCR request never resolves the settings twice.
 */
export async function callOpenRouterVision(
  prompt: string,
  imageBuffer: Buffer,
  mimeType: string,
  ai?: OcrAiConfig,
): Promise<VisionResult> {
  const resolved = ai ?? (await resolveOcrAiConfig());

  if (!resolved.apiKey) {
    return {
      success: false,
      text: null,
      error: 'OCR chưa cấu hình (thiếu OPENROUTER_API_KEY)',
      provider: 'openrouter',
      model: null,
    };
  }

  const model = resolved.model || OCR_MODEL;
  const dataUri = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  const payload = {
    model,
    temperature: 0,
    // The completion budget INCLUDES any <think> reasoning tokens; 2048 can
    // truncate the answer mid-JSON when the model reasons, silently failing
    // the request. 4096 leaves room.
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUri } },
      ],
    }],
  };

  const url = `${OPENROUTER_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '<no body>');
      console.error(`[ocr] OpenRouter → ${response.status}: ${errBody.slice(0, 500)}`);
      return {
        success: false,
        text: null,
        error: `HTTP ${response.status}`,
        provider: 'openrouter',
        model,
      };
    }

    const result = (await response.json()) as OpenRouterResponse;
    const choice = result.choices?.[0];
    const text = stripThink(extractContentText(choice?.message?.content));
    if (!text) {
      return {
        success: false,
        text: null,
        error: 'Empty OpenRouter response',
        provider: 'openrouter',
        model: result.model ?? model,
      };
    }
    return {
      success: true,
      text,
      error: null,
      provider: 'openrouter',
      model: result.model ?? model,
    };
  } catch (e) {
    const msg = e instanceof Error
      ? (e.name === 'AbortError' ? `Timeout after ${OPENROUTER_TIMEOUT_MS}ms` : `${e.name}: ${e.message}`)
      : 'Request failed';
    return {
      success: false,
      text: null,
      error: msg,
      provider: 'openrouter',
      model,
    };
  } finally {
    clearTimeout(timer);
  }
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

/** Extract container numbers + seal from the model response (JSON, then regex fallback). */
function parseResponse(text: string | null): ParsedResponse {
  if (!text) return { containerNumbers: [], sealNumber: null };

  // 1. Structured JSON first
  try {
    const data = JSON.parse(text) as { container_numbers?: unknown; seal_number?: unknown };
    // The model may print grouped characters — "TIIU 674601 2" — the prompt
    // itself says separators may appear; squeeze them before validating or a
    // correct read is dropped as malformed.
    const nums = Array.isArray(data.container_numbers)
      ? data.container_numbers
          .map(n => String(n).toUpperCase().replace(/[\s-]/g, '').trim())
          .filter(n => CONTAINER_RE.test(n))
      : [];
    const seal = typeof data.seal_number === 'string' && data.seal_number.trim()
      ? data.seal_number.toUpperCase().replace(/[\s-]/g, '').trim()
      : null;
    // Only trust the JSON shape when it actually yielded a result. OpenRouter
    // sends NO response_format, so the model can return valid JSON under a
    // different key (e.g. {"numbers":[...]} or a bare array); returning an
    // empty miss there would drop a valid number. Fall through to the regex
    // net so the number is recovered. Mirrors vantaiphucloc ocr.py
    // `_parse_numbers_from_response`.
    if (nums.length > 0 || seal) {
      return { containerNumbers: dedupe(nums), sealNumber: seal };
    }
  } catch {
    // fall through to regex
  }

  // 2. Fallback: regex extraction from free-text response (containers only).
  // Tolerate grouped printing — "TIIU 674601 2" — by matching 4 letters + 7
  // digits with optional single separators between characters, then squeeze.
  const tolerantMatches = text
    .replace(/[`"'\n\r]/g, '')
    .toUpperCase()
    .match(/[A-Z]{4}[ -]?\d[ -]?\d[ -]?\d[ -]?\d[ -]?\d[ -]?\d[ -]?\d[ -]?\d/g) ?? [];
  if (tolerantMatches.length === 0 && text.replace(/[`"'\n\r\s-]/g, '').toUpperCase().trim() === 'NONE') {
    return { containerNumbers: [], sealNumber: null };
  }
  return { containerNumbers: dedupe(tolerantMatches.map(m => m.replace(/[\s-]/g, ''))), sealNumber: null };
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
  provider: VisionProvider | null;
  model: string | null;
}

/**
 * Extract container or seal numbers from an image based on the requested type.
 *
 * - `CONTAINER`: extracts ISO 6346 container numbers only.
 * - `SEAL`: extracts the seal number only.
 *
 * Type-specific prompts prevent cross-contamination (e.g. a seal photo being
 * misread as a container number). Container numbers with invalid ISO 6346 check
 * digits are auto-corrected when a near-miss valid number exists.
 */
export async function extractContainerAndSeal(
  imageBuffer: Buffer,
  type: 'CONTAINER' | 'SEAL' = 'CONTAINER',
  mimeType = 'image/jpeg',
  ai?: OcrAiConfig,
): Promise<ExtractResult> {
  const resolvedAi = ai ?? (await resolveOcrAiConfig());

  let buffer = imageBuffer;
  let mime = mimeType;
  try {
    const pre = await preprocessImage(imageBuffer);
    buffer = pre.buffer;
    mime = pre.mimeType;
  } catch {
    // keep raw image if preprocessing fails
  }

  const prompt = type === 'SEAL' ? SEAL_PROMPT : MULTI_CONTAINER_PROMPT;

  // Not configured → provider null (the route deliberately does not count a
  // request that never reached a provider).
  if (!resolvedAi.apiKey) {
    return {
      success: false,
      containerNumbers: [],
      sealNumber: null,
      checkDigitWarnings: [],
      error: 'OCR chưa cấu hình (thiếu OPENROUTER_API_KEY)',
      provider: null,
      model: null,
    };
  }

  // OpenRouter is the only provider. VLM extraction on hard photos (worn,
  // low-contrast etching) is per-attempt flaky — production showed the same
  // seal read on one attempt and missed on the next — so one bounded
  // same-model retry replaces the removed fallback provider: an upstream
  // error still surfaces as-is, but a flaky no-parse gets a second chance.
  let result: VisionResult | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    result = await callOpenRouterVision(prompt, buffer, mime, resolvedAi);
    if (result.success && result.text) {
      const parsed = parseResponse(result.text);
      const typeValid = type === 'SEAL'
        ? parsed.sealNumber !== null
        : parsed.containerNumbers.some(n => CONTAINER_RE.test(n));
      if (typeValid) break;
    }
  }
  if (!result || !result.success || !result.text) {
    return {
      success: false,
      containerNumbers: [],
      sealNumber: null,
      checkDigitWarnings: [],
      error: result?.error ?? 'Request failed',
      provider: 'openrouter',
      model: result?.model ?? null,
    };
  }

  const parsed = parseResponse(result.text);

  if (type === 'SEAL') {
    // SEAL succeeds only when a seal number was extracted; a container-style
    // misread is not a seal.
    if (parsed.sealNumber) {
      return {
        success: true,
        containerNumbers: [],
        sealNumber: parsed.sealNumber,
        checkDigitWarnings: [],
        error: null,
        provider: 'openrouter',
        model: result.model,
      };
    }
    return {
      success: false,
      containerNumbers: [],
      sealNumber: null,
      checkDigitWarnings: [],
      error: 'Không nhận dạng được số seal',
      provider: 'openrouter',
      model: result.model,
    };
  }

  // CONTAINER: validate FORMAT only (4 letters + 7 digits). We intentionally
  // skip ISO 6346 check-digit verification here — VLMs misread 1–2 chars.
  // The user visually confirms; checkDigitWarnings surface auto-corrections.
  const valid = parsed.containerNumbers.filter(n => CONTAINER_RE.test(n));

  if (valid.length === 0) {
    return {
      success: false,
      containerNumbers: [],
      sealNumber: null,
      checkDigitWarnings: [],
      error: 'Không nhận dạng được số cont',
      provider: 'openrouter',
      model: result.model,
    };
  }

  const { numbers, warnings } = autoCorrectNumbers(valid);
  return {
    success: true,
    containerNumbers: numbers.slice(0, MAX_DETECT),
    sealNumber: null,
    checkDigitWarnings: warnings,
    error: null,
    provider: 'openrouter',
    model: result.model,
  };
}
