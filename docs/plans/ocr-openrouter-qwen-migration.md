# OCR Provider Migration: Gemini → OpenRouter (Qwen3-VL) with Gemini Fallback

> **Status:** `pending approval` (ralplan consensus draft v1)
> **Scope decision (user-confirmed 2026-06-28):** OpenRouter (Qwen3-VL) = **primary**; Gemini = **automatic fallback**; **MiniMax is excluded** from OCR entirely.
> **Risk band:** Short mode. No auth/security, no DB migrations, no PII/compliance, no public-API contract break (only an *additive* optional `provider` field). Touches one service, one config file, one route, one env-example, one frontend type.

---

## RALPLAN-DR Summary

### Principles (4)
1. **Faithful port, not a re-imagining.** Mirror vantaiphucloc's proven `openrouter.py` + multi-provider `ocr.py` design rather than inventing a new OCR architecture. Proven > clever.
2. **Key-presence gating, no new feature-flags.** A provider is "enabled" iff its API key is set — mirroring how `geminiApiKey` already works. Honors the project's "no agent feature-flags" stance: no `OPENROUTER_ENABLE` boolean.
3. **Preserve nepocorp's SEAL path.** vantaiphucloc's OCR only handles containers; nepocorp's `extractContainerAndSeal` handles **both CONTAINER and SEAL**. The OpenRouter client is prompt-generic, so both types must keep working through the new provider.
4. **No contract break.** The `/api/ocr` response shape stays byte-compatible; the only addition is an optional `provider` string. The existing `parseResponse()` JSON+regex safety net is reused unchanged.

### Decision Drivers (top 3)
1. **The user said "instead of Gemini"** → OpenRouter must be the *primary* provider tried first, every time. Gemini becomes insurance, not the default.
2. **Driver-facing latency + accuracy** → a misread container/seal number is worse than a slightly slower call. Fallback on *any* OpenRouter failure (HTTP error, empty, no-valid-numbers) keeps OCR resilient.
3. **`no-agent-feature-flags` memory** → don't ship `OPENROUTER_ENABLE`/`GEMINI_ENABLE` booleans. Gate purely on whether each key is present. One env var (the key) does the work of two.

### Viable Options
- **Option A — Multi-provider orchestrator (OpenRouter primary → Gemini fallback), key-gated.** *(Chosen.)* Ports vantaiphucloc's `openrouter.py` to TS and refactors `extractContainerAndSeal` to iterate providers first-valid-wins. Pros: proven in vantaiphucloc prod; resilient; honors "no flags"; Gemini stays as zero-cost insurance. Cons: larger diff than a pure swap; two providers to keep configured.
- **Option B — Pure replacement (rip Gemini out, OpenRouter only).** Smaller diff, but loses the automatic fallback that vantaiphucloc relies on (a single OpenRouter 429/timeout → driver sees "Không nhận dạng được"). Rejected: user explicitly wants Gemini retained as fallback.
- **Option C — Add MiniMax as last-resort (full vantaiphucloc parity).** Rejected: user explicitly excluded MiniMax from OCR. (MiniMax remains in use only for the chatbot/agent, untouched.)

> Alternatives B and C are invalidated by explicit user instruction, not by analysis alone.

### ADR
- **Decision:** Migrate OCR to OpenRouter (Qwen3-VL) primary with Gemini key-presence-gated fallback; no MiniMax; no enable booleans.
- **Drivers:** user directive ("use openrouter qwen instead of gemini", then "fallback Gemini too, no minimax"); vantaiphucloc has the working reference; accuracy > raw speed for OCR.
- **Alternatives considered:** B (pure removal — loses resilience), C (add MiniMax — explicitly disallowed).
- **Why chosen:** Matches the exact provider chain the user named, reuses a proven design, and keeps the blast radius to one service + config.
- **Consequences:** New env vars `OPENROUTER_API_KEY` / `OPENROUTER_BASE_URL` / `OPENROUTER_MODEL` must be set (else OCR degrades to Gemini-only, or to "chưa cấu hình" if neither key is set). tsx watch will not pick up new `.env` values — backend restart required (per `gemini-env-staleness` memory).
- **Follow-ups (out of scope):** (1) OpenRouter accuracy baseline harness (vantaiphucloc's `diag_minimax_ocr.py` only covers MiniMax — no OpenRouter baseline exists); (2) optional `provider` surfacing in any future OCR-analytics UI.

### Decisions to confirm at approval (minor, non-blocking)
1. **Model slug:** default `qwen/qwen3-vl-32b-instruct` (matches what vantaiphucloc *actually runs in prod*, despite its docs saying 8B). Alternative: `qwen/qwen3-vl-8b-instruct` (cheaper/faster, lower accuracy). Env-overridable either way. *Recommend 32B.*
2. **Surface `provider` in the API response + frontend type** (additive optional field, shows which provider won). *Recommend yes* — useful, zero-cost, backward-compatible.

---

## Files

| File | Change | Type |
|------|--------|------|
| `backend/src/services/ocr.service.ts` | Add `callOpenRouterVision()`; generalize provider abstraction; multi-provider `extractContainerAndSeal` (OpenRouter→Gemini, first-valid-wins, preserve CONTAINER+SEAL); add `<think>` stripping; widen `provider` type. | Major |
| `backend/src/config/index.ts` | Add `openrouterApiKey` / `openrouterBaseUrl` / `openrouterModel` in the existing **4 places** (schema, raw, withDefaults, fallback). | Additive |
| `backend/.env.example` | Add `OPENROUTER_API_KEY=` / `OPENROUTER_BASE_URL` / `OPENROUTER_MODEL` (placeholders only — never real keys). | Additive |
| `backend/.env` | Add real `OPENROUTER_API_KEY` (**user action, gitignored, not committed**). | Config |
| `backend/src/routes/ocr.ts` | Add `provider: result.provider` to the 200 response (additive). | Additive |
| `frontend/src/hooks/useTripFormPhotos.ts` | Add `provider?: string \| null` to `OcrResponse` (additive, optional). | Additive |
| OCR service tests | Add `callOpenRouterVision` unit tests (success, 429→failover, empty, `<think>` strip); assert OpenRouter-before-Gemini ordering. | Tests |

**NOT modified:** `@tingting/shared` (ISO 6346 helpers reused as-is — so no shared rebuild needed), the `/api/ocr` route path/auth/multipart contract, `sharp` preprocessing, frontend camera/upload flow, agent/MiniMax code.

---

## Implementation detail (sketches for review)

### 1. Config (`backend/src/config/index.ts`) — mirror the `geminiApiKey` 4-place pattern
```ts
// schema (near geminiApiKey, ~line 46)
geminiApiKey: z.string().default(''),
openrouterApiKey: z.string().default(''),
openrouterBaseUrl: z.string().url().default('https://openrouter.ai/api/v1'),
openrouterModel: z.string().default('qwen/qwen3-vl-32b-instruct'),

// raw (near line 108)
geminiApiKey: process.env.GEMINI_API_KEY,
openrouterApiKey: process.env.OPENROUTER_API_KEY,
openrouterBaseUrl: process.env.OPENROUTER_BASE_URL,
openrouterModel: process.env.OPENROUTER_MODEL,

// withDefaults (near line 140)
geminiApiKey: raw.geminiApiKey || '',
openrouterApiKey: raw.openrouterApiKey || '',
openrouterBaseUrl: raw.openrouterBaseUrl || 'https://openrouter.ai/api/v1',
openrouterModel: raw.openrouterModel || 'qwen/qwen3-vl-32b-instruct',

// final safeParse fallback (near line 185)
geminiApiKey: '',
openrouterApiKey: '',
openrouterBaseUrl: 'https://openrouter.ai/api/v1',
openrouterModel: 'qwen/qwen3-vl-32b-instruct',
```

### 2. New OpenRouter client (`ocr.service.ts`) — faithful port of `openrouter.py`
```ts
const OPENROUTER_TIMEOUT_MS = 60_000;
const THINK_RE = /<think>.*?<\/think>/gis;
const THINK_TRAILING_RE = /<think>.*/gis;

/** Strip Qwen reasoning blocks (closed + trailing if truncated mid-thought). */
function stripThink(text: string): string {
  return text.replace(THINK_RE, '').replace(THINK_TRAILING_RE, '').trim();
}

interface OpenRouterChoice { message?: { content?: unknown } }
interface OpenRouterResponse { choices?: OpenRouterChoice[]; model?: string }

/**
 * OpenAI-compatible vision call to OpenRouter. Image goes as a base64 data URI
 * in an `image_url` block (per vantaiphucloc openrouter.py). Uses
 * response_format json_object so Qwen3-VL emits clean JSON; the existing
 * parseResponse() regex fallback is the safety net if it doesn't.
 */
export async function callOpenRouterVision(
  prompt: string,
  imageBuffer: Buffer,
  mimeType: string,
): Promise<VisionResult> {
  if (!config.openrouterApiKey) {
    return { success:false, text:null, error:'OCR chưa cấu hình (thiếu OPENROUTER_API_KEY)', provider:'openrouter', model:null };
  }
  const dataUri = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  const payload = {
    model: config.openrouterModel,
    temperature: 0,
    max_tokens: 2048,
    response_format: { type: 'json_object' },   // structured output, like Gemini's responseMimeType
    messages: [{ role:'user', content:[
      { type:'text', text: prompt },
      { type:'image_url', image_url:{ url: dataUri } },
    ]}],
  };
  const url = `${config.openrouterBaseUrl.replace(/\/+$/,'')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${config.openrouterApiKey}`, 'Content-Type':'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '<no body>');
      console.error(`[ocr] OpenRouter → ${response.status}: ${errBody.slice(0,500)}`);
      return { success:false, text:null, error:`HTTP ${response.status}`, provider:'openrouter', model:config.openrouterModel };
    }
    const result = (await response.json()) as OpenRouterResponse;
    const choice = result.choices?.[0];
    const raw = choice?.message?.content;
    const text = stripThink(typeof raw === 'string' ? raw : ''); // content may be string or parts[]
    if (!text) return { success:false, text:null, error:'Empty OpenRouter response', provider:'openrouter', model:result.model ?? config.openrouterModel };
    return { success:true, text, error:null, provider:'openrouter', model:result.model ?? config.openrouterModel };
  } catch (e) {
    const msg = e instanceof Error ? (e.name==='AbortError'?`Timeout after ${OPENROUTER_TIMEOUT_MS}ms`:`${e.name}: ${e.message}`) : 'Request failed';
    return { success:false, text:null, error:msg, provider:'openrouter', model:config.openrouterModel };
  } finally { clearTimeout(timer); }
}
```

### 3. Provider abstraction + multi-provider `extractContainerAndSeal`
- Generalize the return type: rename `provider:'gemini'` literal → `provider:'openrouter'|'gemini'` (union). Introduce a private `VisionResult` interface shared by both `callOpenRouterVision` and `callGeminiVision`.
- Add a key-presence-gated ordered provider list:
```ts
function orderedProviders(): { name:'openrouter'|'gemini'; call: typeof callOpenRouterVision }[] {
  const list = [];
  if (config.openrouterApiKey) list.push({ name:'openrouter', call: callOpenRouterVision });   // primary
  if (config.geminiApiKey)     list.push({ name:'gemini',     call: callGeminiVision });        // fallback
  return list;
}
```
- `extractContainerAndSeal()` loops `orderedProviders()`, choosing the type-specific `prompt`/`schema` (CONTAINER vs SEAL) exactly as today, running `parseResponse()` + ISO-6346 auto-correct on the first success. First provider returning ≥1 valid number (or a seal) wins; on any failure/empty it transparently tries the next. If the list is empty → existing "chưa cấu hình" error. Return shape `ExtractResult` gains a real `provider` field (no longer hardcoded `'gemini'`).
- `callGeminiVision` keeps its current 2-model internal fallback unchanged.

---

## Acceptance criteria
- [ ] `OPENROUTER_API_KEY` unset + `GEMINI_API_KEY` set → OCR works via Gemini (no regression).
- [ ] Both keys set → OpenRouter is tried **first**; a forced OpenRouter failure (mock 429) transparently falls back to Gemini and still returns numbers.
- [ ] Both keys unset → `ok:false` with the "chưa cấu hình" message (no 500).
- [ ] CONTAINER **and** SEAL both work through OpenRouter (existing two-prompt dispatch preserved).
- [ ] `<think>…</think>` blocks in an OpenRouter response do not break JSON parsing.
- [ ] `/api/ocr` response is unchanged except for an additive optional `provider` field.
- [ ] No `any` types; explicit `OpenRouterResponse` interfaces (strict mode clean).
- [ ] Unit tests pass: `cd backend && npm test` (Vitest). Frontend `tsc -b` clean.

## Verification steps (agent-run, before claiming done)
1. `cd backend && npx tsc --noEmit` — strict-mode clean.
2. `cd backend && npm test` — OCR service tests green (incl. new OpenRouter + failover + `<think>` cases).
3. Restart backend (tsx won't re-read `.env`), then `curl -F file=@container.jpg -F type=CONTAINER http://localhost:3090/api/ocr` (with a valid session) → `provider:"openrouter"`, valid `containerNumbers`.
4. Temporarily blank `OPENROUTER_API_KEY`, restart, re-curl → `provider:"gemini"` (failover proven), numbers still returned.
5. `cd frontend && npx tsc -b` — clean (additive `provider?: string | null`).

## Risks & gotchas
- **OpenRouter latency vs Gemini Flash** — Qwen3-VL (esp. 32B) may be slower than Flash. Mitigated by 60s timeout + automatic Gemini fallback. Worth measuring post-deploy; if p95 unacceptable, drop to 8B via one env line.
- **`response_format: json_object` model support** — if a chosen Qwen variant on OpenRouter rejects it (400), `parseResponse()`'s regex fallback still recovers container numbers; seal recovery is weaker. Fallback to prompt-only mode is a one-line change if needed.
- **`<think>` truncation** — Qwen "Thinking" variants can emit huge reasoning that truncates before the answer. We default to the **Instruct** (non-Thinking) variant and strip any `<think>` defensively. Do not switch to a `-thinking` slug.
- **Env staleness** — after editing `.env`, restart the backend (per `gemini-env-staleness`).
- **Key hygiene** — never commit a real `OPENROUTER_API_KEY`; `.env.example` gets placeholders only.
- **Deploy** — CI is billing-blocked (per `ci-billing-blocked-manual-deploy`); ships via normal manual backend deploy. vantai is a separate deployment and is NOT touched (this is nepocorp-only; vantaiphucloc is the reference, not a target).
