// Shared OpenAI-compatible Chat Completions runner used by both provider
// clients (MiniMax, OpenRouter). Extracted from minimax.client.ts so each
// provider is a thin config wrapper around the same fetch/parse/timeout logic.
//
// Keeps every nuance of the original implementation:
//   - AbortController timeout (per-provider boundary) + honour caller signal
//   - listener cleanup in `finally` (no leaked parent-signal listeners)
//   - OpenAI-shaped request body + response parsing
//   - finish_reason propagation ('length' → truncated content must not be healed)
//   - OTel span via withSpan; latencyMs from performance.now() (sampler-safe)
import { withSpan, type SpanAttrs } from '../agent/telemetry.js';
import {
  MiniMaxError,
  type MiniMaxCallResult,
  type MiniMaxFunctionCall,
  type MiniMaxMessage,
  type MiniMaxResponseFormat,
  type MiniMaxTool,
} from './minimax.client';

// NOTE: this module + minimax.client.ts form a benign ESM cycle:
// minimax.client → openai-runner (for runOpenAiCompletion) → minimax.client
// (for the MiniMaxError class + types). It is safe because every cross-module
// reference is resolved lazily inside a function body, never at module-
// evaluation time. The types are erased at compile time; MiniMaxError is only
// constructed inside runOpenAiCompletion, which runs after both modules are
// fully loaded.

export interface OpenAiRunnerConfig {
  /** Provider id, surfaced in telemetry ('minimax' | 'openrouter'). */
  providerId: string;
  /** Chat Completions base URL (no trailing slash), e.g. https://api.minimax.io/v1. */
  baseUrl: string;
  /** Bearer token. */
  apiKey: string;
  /** Model id sent in the body. */
  model: string;
  /** Per-call timeout (ms). */
  timeoutMs: number;
  /** Provider-specific extra body fields (e.g. MiniMax `reasoning_split`). */
  extraBody?: Record<string, unknown>;
  /** Hook to clean a returned content string (e.g. stripThink for MiniMax).
   *  Defaults to identity (OpenRouter doesn't leak <think> blocks). */
  cleanContent?: (s: string | null | undefined) => string | null;
}

interface OpenAIChoice {
  message?: {
    content?: string | null;
    tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  };
  finish_reason?: string;
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** Run one OpenAI-compatible completion. Mirrors the original callMiniMax
 *  behaviour exactly — see module header for the preserved nuances. */
export async function runOpenAiCompletion(
  cfg: OpenAiRunnerConfig,
  opts: {
    messages: MiniMaxMessage[];
    tools?: MiniMaxTool[];
    responseFormat?: MiniMaxResponseFormat;
    maxTokens?: number;
    signal?: AbortSignal;
  },
): Promise<MiniMaxCallResult> {
  const cleanContent = cfg.cleanContent ?? ((s) => s ?? null);

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: opts.messages,
    temperature: 0.2, // low — analytical answers + tool selection should be deterministic-ish
    ...(cfg.extraBody ?? {}),
  };
  if (opts.tools && opts.tools.length > 0) {
    body.tools = opts.tools;
    body.tool_choice = 'auto';
  }
  if (opts.responseFormat) body.response_format = opts.responseFormat;
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  // Honour a caller-supplied signal too (e.g. client disconnect). The listener
  // is removed in `finally` so a long-lived parent signal (the req-close signal
  // spans the whole SSE turn) doesn't accumulate one listener and retain each
  // per-call controller across every ReAct iteration.
  const onParentAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', onParentAbort, { once: true });
  }

  // ── Instrumented LLM call ────────────────────────────────────────────────
  // latencyMs comes from withSpan's performance.now() timer, NOT span.duration
  // (the sampler may discard the span — see telemetry.ts LATENCY CONTRACT).
  const tracePrompts = process.env.AGENT_TRACE_PROMPTS === '1';
  const llmAttrs: SpanAttrs = {
    'gen_ai.operation.name': 'chat',
    'gen_ai.request.model': cfg.model,
    'gen_ai.system': cfg.providerId,
  };
  if (tracePrompts) {
    llmAttrs['gen_ai.prompt'] = JSON.stringify(opts.messages).slice(0, 8000);
  }

  try {
    const { result: callResult, durationMs: latencyMs } = await withSpan(
      `agent.llm.${cfg.providerId}_call`,
      llmAttrs,
      async () => {
        const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '<no body>');
          console.error(`[agent] ${cfg.providerId} → ${res.status}: ${errBody.slice(0, 500)}`);
          throw new MiniMaxError(`${cfg.providerId} HTTP ${res.status}`, 'http');
        }

        const data = (await res.json()) as OpenAIResponse;
        const choice = data.choices?.[0];
        const msg = choice?.message;

        const toolCalls: MiniMaxFunctionCall[] = (msg?.tool_calls ?? []).map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        }));

        const promptTokens = data.usage?.prompt_tokens ?? 0;
        const completionTokens = data.usage?.completion_tokens ?? 0;
        return {
          content: cleanContent(msg?.content),
          toolCalls,
          usage: { promptTokens, completionTokens },
          finishReason: choice?.finish_reason ?? null,
        };
      },
    );

    return {
      content: callResult.content,
      toolCalls: callResult.toolCalls,
      usage: callResult.usage,
      latencyMs,
      finishReason: callResult.finishReason,
    };
  } catch (e) {
    if (e instanceof MiniMaxError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new MiniMaxError(`${cfg.providerId} timeout after ${cfg.timeoutMs}ms`, 'timeout');
    }
    throw new MiniMaxError(
      `${cfg.providerId} request failed: ${e instanceof Error ? e.message : 'unknown'}`,
      'parse',
    );
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', onParentAbort);
  }
}

// Suppress the unused-import lint for re-exported types consumed only by the
// type signature above (MiniMaxMessage/Tool/ResponseFormat/FunctionCall).
export type {
  MiniMaxMessage,
  MiniMaxTool,
  MiniMaxFunctionCall,
  MiniMaxResponseFormat,
};
