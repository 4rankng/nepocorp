/**
 * OCR OpenRouter transport (Anthropic Claude Haiku 5.5) — provider ordering,
 * failover, the model/prompt contract, and the OpenRouter-specific parsing
 * edge cases (`think` stripping, parts-array content, HTTP error handling).
 * Run with the project's tsx --test runner.
 *
 * globalThis.fetch is mocked per-test and routed by URL so we can prove:
 *   - OpenRouter is tried FIRST and, on success, Gemini is never called.
 *   - an OpenRouter failure (HTTP 429) transparently fails over to Gemini.
 *   - the vision call targets the configured model with the type-specific prompt.
 *   - `think` reasoning and parts-array `content` are normalized before parsing.
 *
 * The API key + model are passed in explicitly (`OcrAiConfig`) rather than read
 * from the environment: since NEPO-28 the model and key are ADMIN settings
 * stored in the DB, so the transport takes them as an argument. Pinning them
 * here keeps the suite hermetic — no env var and no database row can change
 * what these tests exercise.
 *
 * Note: no before/after hooks — this Node/tsx ESM surface doesn't expose
 * `afterAll`. Config keys are pinned at module top-level (each test file runs
 * in its own process under `tsx --test`, so there is no cross-file leakage),
 * and per-test state is set up inline with try/finally.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  callOpenRouterVision,
  extractContainerAndSeal,
  type OcrAiConfig,
} from '../services/ocr.service';
import { config } from '../config';

const originalFetch = globalThis.fetch;

// Pin both keys so orderedProviders() = [openrouter, gemini] regardless of the
// local .env (hermetic). Restore is unnecessary: each test file runs in its own
// process under `tsx --test`.
config.openrouterApiKey = 'test-or-key';
config.geminiApiKey = 'test-gemini-key';

const MODEL = 'anthropic/claude-haiku-5.5';
/** The OCR credentials every test runs with — pinned, not read from the DB. */
const AI: OcrAiConfig = { apiKey: 'test-or-key', model: MODEL };

// 1×1 PNG — a valid image so sharp's preprocessImage succeeds cleanly (the
// mocked fetch ignores the bytes; we just want no preprocessing noise).
const IMG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

// Valid ISO 6346 container number (check digit 5) — autoCorrect keeps it as-is.
const VALID_CONTAINER = 'ALLU5216535';

/** Minimal Response stand-in for the mocked global fetch. */
function res(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    headers: new Headers(),
  } as Response;
}

const orBody = (content: unknown) => ({ choices: [{ message: { content } }], model: 'anthropic/claude-haiku-5.5' });
const geminiBody = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });

describe('OCR: OpenRouter transport (Claude Haiku 5.5)', () => {
  test('callOpenRouterVision: success → provider=openrouter + parsed JSON text', async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      urls.push(String(url));
      return res(orBody(JSON.stringify({ container_numbers: [VALID_CONTAINER] })));
    }) as unknown as typeof globalThis.fetch;
    try {
      const r = await callOpenRouterVision('prompt', IMG, 'image/jpeg', AI);
      assert.equal(r.success, true);
      assert.equal(r.provider, 'openrouter');
      assert.equal(r.model, 'anthropic/claude-haiku-5.5');
      assert.deepEqual(JSON.parse(r.text!), { container_numbers: [VALID_CONTAINER] });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('callOpenRouterVision: strips <think> reasoning before the JSON answer', async () => {
    globalThis.fetch = (async (_url: string | URL | Request) => {
      return res(orBody(`<think>reasoning about the image...</think>{"container_numbers":["${VALID_CONTAINER}"]}`));
    }) as unknown as typeof globalThis.fetch;
    try {
      const r = await callOpenRouterVision('prompt', IMG, 'image/jpeg', AI);
      assert.equal(r.success, true);
      assert.equal(r.text!.includes('<think>'), false);
      assert.deepEqual(JSON.parse(r.text!), { container_numbers: [VALID_CONTAINER] });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('callOpenRouterVision: normalizes parts-array content (not only string)', async () => {
    globalThis.fetch = (async () =>
      res(orBody([{ type: 'text', text: `{"container_numbers":["${VALID_CONTAINER}"]}` }]))) as unknown as typeof globalThis.fetch;
    try {
      const r = await callOpenRouterVision('prompt', IMG, 'image/jpeg', AI);
      assert.equal(r.success, true);
      assert.deepEqual(JSON.parse(r.text!), { container_numbers: [VALID_CONTAINER] });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('callOpenRouterVision: HTTP 429 → failure "HTTP 429", no throw', async () => {
    globalThis.fetch = (async () => res({ error: 'rate limited' }, 429)) as unknown as typeof globalThis.fetch;
    try {
      const r = await callOpenRouterVision('prompt', IMG, 'image/jpeg', AI);
      assert.equal(r.success, false);
      assert.equal(r.provider, 'openrouter');
      assert.equal(r.error, 'HTTP 429');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('callOpenRouterVision: empty key → friendly error, fetch NOT called', async () => {
    const saved = config.openrouterApiKey;
    let calls = 0;
    config.openrouterApiKey = '';
    globalThis.fetch = (async () => { calls++; return res(orBody('{}')); }) as unknown as typeof globalThis.fetch;
    try {
      // An empty key in the ADMIN settings → no upstream call at all.
      const r = await callOpenRouterVision('prompt', IMG, 'image/jpeg', { apiKey: '', model: MODEL });
      assert.equal(r.success, false);
      assert.equal(r.provider, 'openrouter');
      assert.match(r.error!, /OPENROUTER_API_KEY/);
      assert.equal(calls, 0);
    } finally {
      config.openrouterApiKey = saved;
      globalThis.fetch = originalFetch;
    }
  });

  test('extractContainerAndSeal: OpenRouter succeeds first → Gemini NOT called', async () => {
    const urls: string[] = [];
    let geminiCalled = 0;
    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      urls.push(u);
      if (u.includes('openrouter.ai')) {
        return res(orBody(JSON.stringify({ container_numbers: [VALID_CONTAINER] })));
      }
      geminiCalled++;
      return res(geminiBody(JSON.stringify({ container_numbers: ['TEMU0000000'] })));
    }) as unknown as typeof globalThis.fetch;
    try {
      const r = await extractContainerAndSeal(IMG, 'CONTAINER', 'image/jpeg', AI);
      assert.equal(r.success, true);
      assert.equal(r.provider, 'openrouter');
      assert.deepEqual(r.containerNumbers, [VALID_CONTAINER]);
      assert.equal(geminiCalled, 0, 'Gemini must not be called when OpenRouter succeeds');
      assert.equal(urls.filter((u) => u.includes('openrouter.ai')).length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('extractContainerAndSeal: OpenRouter 429 → transparent failover to Gemini', async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      urls.push(u);
      if (u.includes('openrouter.ai')) return res({ error: 'rate limited' }, 429);
      return res(geminiBody(JSON.stringify({ container_numbers: [VALID_CONTAINER] })));
    }) as unknown as typeof globalThis.fetch;
    try {
      const r = await extractContainerAndSeal(IMG, 'CONTAINER', 'image/jpeg', AI);
      assert.equal(r.success, true);
      assert.equal(r.provider, 'gemini');
      assert.deepEqual(r.containerNumbers, [VALID_CONTAINER]);
      assert.ok(urls.some((u) => u.includes('openrouter.ai')), 'OpenRouter was tried first');
      assert.ok(urls.some((u) => u.includes('generativelanguage')), 'Gemini was tried as fallback');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('extractContainerAndSeal: SEAL path returns the seal via OpenRouter', async () => {
    globalThis.fetch = (async () => res(orBody(JSON.stringify({ seal_number: 'VN123456' })))) as unknown as typeof globalThis.fetch;
    try {
      const r = await extractContainerAndSeal(IMG, 'SEAL', 'image/jpeg', AI);
      assert.equal(r.success, true);
      assert.equal(r.provider, 'openrouter');
      assert.equal(r.sealNumber, 'VN123456');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('extractContainerAndSeal: wrong-key JSON (no schema) → regex net recovers the number', async () => {
    // OpenRouter sends NO response_format, so the model may emit valid JSON
    // under a different key. parseResponse must fall through to the regex net
    // and recover the number rather than returning an empty miss that silently
    // regresses every request to Gemini. Parity with vantaiphucloc ocr.py.
    globalThis.fetch = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('openrouter.ai')) return res(orBody('{"numbers":["ALLU5216535"]}'));
      // Gemini canary — a different number; if reached, the assertion fails.
      return res(geminiBody(JSON.stringify({ container_numbers: ['TEMU0000000'] })));
    }) as unknown as typeof globalThis.fetch;
    try {
      const r = await extractContainerAndSeal(IMG, 'CONTAINER', 'image/jpeg', AI);
      assert.equal(r.success, true);
      assert.equal(r.provider, 'openrouter');
      assert.deepEqual(r.containerNumbers, [VALID_CONTAINER]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('extractContainerAndSeal: no keys configured → friendly "chưa cấu hình" error', async () => {
    const savedOr = config.openrouterApiKey;
    const savedG = config.geminiApiKey;
    let calls = 0;
    config.openrouterApiKey = '';
    config.geminiApiKey = '';
    globalThis.fetch = (async () => { calls++; return res({}); }) as unknown as typeof globalThis.fetch;
    try {
      // Neither provider has a key → no upstream call, friendly error.
      const r = await extractContainerAndSeal(IMG, 'CONTAINER', 'image/jpeg', { apiKey: '', model: MODEL });
      assert.equal(r.success, false);
      assert.equal(r.provider, null);
      assert.match(r.error!, /chưa cấu hình/);
      assert.equal(calls, 0);
    } finally {
      config.openrouterApiKey = savedOr;
      config.geminiApiKey = savedG;
      globalThis.fetch = originalFetch;
    }
  });
});

// The extraction contract: WHICH model answers and WHAT it is asked. The
// previous Qwen3-VL slug stopped recognizing numbers on container/seal photos;
// the calls must target Claude Haiku 5.5 with the type-specific prompts below,
// or extraction silently regresses again.
describe('OCR: Haiku 5.5 model + prompt contract', () => {
  interface CapturedRequest { model?: string; messages?: Array<{ content?: Array<{ type: string; text?: string; image_url?: { url: string } }> }> }
  const capture = () => {
    const captured: CapturedRequest[] = [];
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured.push(JSON.parse(String(init?.body)) as CapturedRequest);
      return res(orBody(JSON.stringify({ container_numbers: [VALID_CONTAINER] })));
    }) as unknown as typeof globalThis.fetch;
    return captured;
  };
  const textAndImage = (req: CapturedRequest) => {
    const content = req.messages?.[0]?.content ?? [];
    return {
      text: content.find((p) => p.type === 'text')?.text ?? '',
      image: content.find((p) => p.type === 'image_url')?.image_url?.url ?? '',
    };
  };

  test('vision calls target Claude Haiku 5.5 (anthropic/claude-haiku-5.5)', async () => {
    const captured = capture();
    try {
      const r = await extractContainerAndSeal(IMG, 'CONTAINER', 'image/jpeg', AI);
      assert.equal(r.success, true);
      assert.equal(captured[0].model, 'anthropic/claude-haiku-5.5');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('the ADMIN-configured model is the one the call targets (NEPO-28)', async () => {
    const captured = capture();
    try {
      const r = await extractContainerAndSeal(IMG, 'CONTAINER', 'image/jpeg', {
        apiKey: 'test-or-key',
        model: 'google/gemini-3.5-flash',
      });
      assert.equal(r.success, true);
      assert.equal(captured[0].model, 'google/gemini-3.5-flash');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('CONTAINER extraction sends the ISO 6346 prompt and the image payload', async () => {
    const captured = capture();
    try {
      await extractContainerAndSeal(IMG, 'CONTAINER', 'image/jpeg', AI);
      const { text, image } = textAndImage(captured[0]);
      // The contract the recognition quality depends on: the 4+7 format rule,
      // the JSON output shape, and the ISO size/type + seal exclusions.
      assert.match(text, /4 uppercase letters followed by exactly 7 digits/);
      assert.match(text, /"container_numbers"/);
      assert.match(text, /ignore ISO size\/type codes/);
      assert.match(text, /ignore any seal number/);
      assert.match(image, /^data:image\/jpeg;base64,/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('SEAL extraction sends the seal prompt (never the container prompt)', async () => {
    const captured = capture();
    try {
      await extractContainerAndSeal(IMG, 'SEAL', 'image/jpeg', AI);
      const { text } = textAndImage(captured[0]);
      assert.match(text, /"seal_number"/);
      assert.match(text, /ignore ISO container numbers/);
      assert.match(text, /Seal numbers have no fixed length/);
      assert.doesNotMatch(text, /"container_numbers"/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
