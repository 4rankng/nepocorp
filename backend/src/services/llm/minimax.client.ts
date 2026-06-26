// MiniMax LLM client — OpenAI-compatible Chat Completions.
//
// Mirrors ocr.service.ts: raw `fetch` (no SDK), key guard, AbortController
// timeout, friendly error on missing key. Supports BOTH:
//   - tool/function calling (the ReAct loop): pass `tools`
//   - JSON-mode structured output (the final insight card): pass `responseFormat`
//
// ⚠️ PREREQUISITE: the exact request/response shape (tool_calls, arguments as
// JSON-string, response_format json_schema enforcement) MUST be confirmed by
// the MiniMax spike before this is relied on (plan risk R1). MiniMax advertises
// an OpenAI-compatible surface, so this is written to that shape; the spike
// verifies + corrects if needed.
import { config } from '../../config';

const TIMEOUT_MS = () => config.minimaxTimeoutMs;

export interface MiniMaxFunctionCall {
  id: string;
  name: string;
  /** Raw `arguments` JSON string from the model — parse defensively. */
  arguments: string;
}

export interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  /** assistant turns that requested tool calls. */
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  /** tool-result turns cite the call they answer. */
  tool_call_id?: string;
  name?: string;
}

export interface MiniMaxTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export type MiniMaxResponseFormat =
  | { type: 'json_object' }
  | { type: 'json_schema'; json_schema: { name: string; schema: Record<string, unknown> } };

export interface MiniMaxCallResult {
  content: string | null;
  toolCalls: MiniMaxFunctionCall[];
  usage: { promptTokens: number; completionTokens: number };
}

interface OpenAIChoice {
  message?: {
    content?: string | null;
    tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  };
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class MiniMaxError extends Error {
  constructor(message: string, readonly code: 'no_key' | 'http' | 'timeout' | 'parse' = 'http') {
    super(message);
    this.name = 'MiniMaxError';
  }
}

export async function callMiniMax(opts: {
  messages: MiniMaxMessage[];
  tools?: MiniMaxTool[];
  responseFormat?: MiniMaxResponseFormat;
  /** Cap output tokens. Set high for the final structured answer so a rich
   *  insight_card (plus any <think>) isn't truncated mid-JSON. */
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<MiniMaxCallResult> {
  if (!config.minimaxApiKey) {
    throw new MiniMaxError('MiniMax chưa cấu hình (thiếu MINIMAX_API_KEY)', 'no_key');
  }

  const body: Record<string, unknown> = {
    model: config.minimaxModel,
    messages: opts.messages,
    temperature: 0.2, // low — analytical answers + tool selection should be deterministic-ish
  };
  if (opts.tools && opts.tools.length > 0) {
    body.tools = opts.tools;
    body.tool_choice = 'auto';
  }
  if (opts.responseFormat) {
    body.response_format = opts.responseFormat;
  }
  if (opts.maxTokens) {
    body.max_tokens = opts.maxTokens;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS());
  // Honour a caller-supplied signal too (e.g. client disconnect). The listener
  // is removed in `finally` so a long-lived parent signal (the req-close signal
  // spans the whole SSE turn) doesn't accumulate one listener and retain each
  // per-call controller across every ReAct iteration.
  const onParentAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', onParentAbort, { once: true });
  }

  try {
    const res = await fetch(`${config.minimaxBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.minimaxApiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '<no body>');
      console.error(`[agent] MiniMax → ${res.status}: ${errBody.slice(0, 500)}`);
      throw new MiniMaxError(`MiniMax HTTP ${res.status}`, 'http');
    }

    const data = (await res.json()) as OpenAIResponse;
    const choice = data.choices?.[0];
    const msg = choice?.message;

    const toolCalls: MiniMaxFunctionCall[] = (msg?.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));

    return {
      content: msg?.content ?? null,
      toolCalls,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      },
    };
  } catch (e) {
    if (e instanceof MiniMaxError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new MiniMaxError(`MiniMax timeout after ${TIMEOUT_MS()}ms`, 'timeout');
    }
    throw new MiniMaxError(
      `MiniMax request failed: ${e instanceof Error ? e.message : 'unknown'}`,
      'parse',
    );
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', onParentAbort);
  }
}
