// Agent orchestrator — the ReAct loop that turns a user message into a final
// AgentResponse, streaming progress as SSE events.
//
// Flow:
//   1. system prompt (role-aware, current route, "use only tool numbers")
//   2. loop (≤ agentMaxIterations): callMiniMax(tools) → execute each
//      tool_call (role-checked) → feed results back. ui.* tools also emit a
//      `directive` event so the UI moves immediately.
//   3. final call with JSON-mode → AgentResponse (Zod-validated; retry once,
//      then degrade to text).
//   4. persist the turn (resilient — a missing migration must not kill chat).
//
// ⚠️ Depends on the MiniMax spike (R1): tool-calling + JSON-mode shape. The
// client is written to the OpenAI-compatible surface; verify before enabling.
import { zodToJsonSchema } from 'zod-to-json-schema';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { config } from '../../config';
import {
  agentResponseSchema,
  agentDirectiveSchema,
  type AgentEvent,
  type AgentResponse,
  type AgentDirective,
} from '@tingting/shared';
import { callMiniMax, type MiniMaxMessage, type MiniMaxTool } from '../llm/minimax.client';
import { todayIsoVn } from './tools/period';
import { getToolsForRole, findTool } from './tool.registry';
import type { AgentContext, AgentToolDef } from './tool.types';
import { ToolError } from './tool.types';

const RESPONSE_SHAPE_HINT = `Trả lời cuối cùng PHẢI là JSON theo đúng một trong 3 dạng:
- {"type":"text","content":"..."}  (giải thích ngắn / trợ giúp trang / câu trả lời đơn giản)
- {"type":"insight_card","title":"...","summary":"nguyên nhân/tóm tắt 1-2 câu","widgets":[...],"actions":[{"label":"...","directive":{...}}]}  (câu hỏi phân tích: lợi nhuận, công nợ, chi phí, dầu...)
- {"type":"directive","directive":{"kind":"navigate|focus|open|prefill",...}}  (chỉ điều hướng)
widget có thể là: kpi_grid {items:[{label,value(number),format:"vnd|percent|number|days",delta?}]}, bar_chart {data:[{name,value}],format?}, line_chart {series:[{name,points:[{x,y}]}]}, table {columns,rows}, callout {variant:"info|warning|danger",text}, anomaly_list {items:[{label,detail,severity:"low|med|high"}]}.`;

function buildSystemPrompt(ctx: AgentContext): string {
  return [
    'Bạn là trợ lý TingTing — nền tảng vận tải/logistics cho công ty xe tải Việt Nam.',
    `Bạn đang hỗ trợ người dùng vai trò "${ctx.role}". v1 CHỈ ĐỌC: không tạo/sửa/xóa dữ liệu (chỉ mở form điền sẵn — người dùng tự lưu).`,
    // Date awareness: without this the LLM invented "2025" for "tháng này" and
    // every report dutifully returned zeros for a non-existent period.
    `Hôm nay: ${todayIsoVn()} (YYYY-MM-DD). Khi người dùng nói "tháng này/quý này/nay", mặc định tháng/năm HIỆN TẠI — KHÔNG dùng năm khác.`,
    'Quy tắc:',
    '- LUÔN dùng công cụ để lấy số liệu; KHÔNG bịa số trong insight_card — chỉ dùng số công cụ trả về.',
    '- Với câu hỏi phân tích (lợi nhuận/công nợ/chi phí/dầu): dùng analyzer/report tool rồi trả insight_card có widgets phù hợp + tóm tắt nguyên nhân. Khi nói "tháng này", bỏ qua month/year (server tự lấy tháng hiện tại).',
    '- Với yêu cầu mở trang/tìm/xem: LUÔN gọi ui.navigate (hoặc trả {"type":"directive",...}). KHÔNG mô tả đường dẫn bằng text.',
    '- Với câu hỏi phụ thuộc trang hiện tại (giải thích trang, lỗi): trả text ngắn.',
    '- Trả lời bằng tiếng Việt.',
    ctx.currentRouteKey ? `Người dùng đang ở trang: ${ctx.currentRouteKey}.` : '',
    RESPONSE_SHAPE_HINT,
  ]
    .filter(Boolean)
    .join('\n');
}

function toolsToMiniMax(tools: AgentToolDef[]): MiniMaxTool[] {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: zodToJsonSchema(t.params, { name: t.name }) as Record<string, unknown>,
    },
  }));
}

export interface RunAgentResult {
  response: AgentResponse;
  conversationId: string | undefined;
  toolTrace: unknown[];
}

export async function runAgent(opts: {
  ctx: AgentContext;
  message: string;
  conversationId?: string;
  /** Prior turns in this session (in-memory, supplied by the socket layer) so
   *  a follow-up question shares context. Compact text only — no widgets. */
  priorMessages?: MiniMaxMessage[];
  emit: (event: AgentEvent) => void;
  signal?: AbortSignal;
}): Promise<RunAgentResult> {
  const { ctx, emit, signal } = opts;
  const tools = getToolsForRole(ctx.role);
  const miniMaxTools = toolsToMiniMax(tools);
  const toolTrace: unknown[] = [];

  const messages: MiniMaxMessage[] = [
    { role: 'system', content: buildSystemPrompt(ctx) },
    ...(opts.priorMessages ?? []),
    { role: 'user', content: opts.message },
  ];

  // ── ReAct loop ──────────────────────────────────────────────────────────
  // Accumulate tokens across every MiniMax call (each call is billed for its
  // full prompt context, so summing == actual consumption).
  let totalUsage = { promptTokens: 0, completionTokens: 0 };
  const addUsage = (u: { promptTokens: number; completionTokens: number }) => {
    totalUsage.promptTokens += u.promptTokens;
    totalUsage.completionTokens += u.completionTokens;
  };
  for (let i = 0; i < config.agentMaxIterations; i++) {
    // Stop spending tokens the moment the client disconnects.
    if (opts.signal?.aborted) {
      return { response: { type: 'text', content: '' }, conversationId: undefined, toolTrace };
    }
    const result = await callMiniMax({ messages, tools: miniMaxTools, signal });
    addUsage(result.usage);

    if (result.toolCalls.length === 0) {
      // Model is ready to answer — break to the structured final call.
      if (result.content) {
        messages.push({ role: 'assistant', content: result.content });
      }
      break;
    }

    // Record the assistant's tool-request turn, then answer each call.
    messages.push({
      role: 'assistant',
      content: result.content,
      tool_calls: result.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    });

    // Client disconnected between the MiniMax call returning and tool
    // execution — stop before running DB-backed tools for a gone client.
    if (opts.signal?.aborted) {
      return { response: { type: 'text', content: '' }, conversationId: undefined, toolTrace };
    }

    for (const call of result.toolCalls) {
      emit({ event: 'tool_start', toolName: call.name, args: safeParseArgs(call.arguments) });
      const tool = findTool(call.name);

      if (!tool) {
        const msg = `Công cụ không tồn tại: ${call.name}`;
        emit({ event: 'tool_result', toolName: call.name, toolCallId: call.id, ok: false, label: msg });
        messages.push({ role: 'tool', tool_call_id: call.id, name: call.name, content: msg });
        toolTrace.push({ toolName: call.name, ok: false, error: msg });
        continue;
      }

      let toolResult;
      try {
        toolResult = await tool.execute(safeParseArgs(call.arguments), ctx);
      } catch (e) {
        const msg = e instanceof ToolError ? e.message : e instanceof Error ? e.message : 'Lỗi công cụ';
        emit({ event: 'tool_result', toolName: call.name, toolCallId: call.id, ok: false, label: msg });
        messages.push({ role: 'tool', tool_call_id: call.id, name: call.name, content: `Lỗi: ${msg}` });
        toolTrace.push({ toolName: call.name, ok: false, error: msg });
        continue;
      }

      emit({ event: 'tool_result', toolName: call.name, toolCallId: call.id, ok: true, label: toolResult.label });

      // ui.* tools produce a directive — move the UI immediately.
      if (call.name.startsWith('ui.')) {
        const parsed = agentDirectiveSchema.safeParse(toolResult.data);
        if (parsed.success) {
          emit({ event: 'directive', directive: parsed.data as AgentDirective });
        }
      }

      // Feed a size-capped JSON view back to the model.
      const view = truncateForModel(toolResult.data);
      messages.push({ role: 'tool', tool_call_id: call.id, name: call.name, content: view });
      toolTrace.push({ toolName: call.name, ok: true, args: safeParseArgs(call.arguments), label: toolResult.label });
    }
  }

  // ── Final structured answer (JSON-mode) ─────────────────────────────────
  if (opts.signal?.aborted) {
    return { response: { type: 'text', content: '' }, conversationId: undefined, toolTrace };
  }
  const { response, usage: finalUsage } = await produceFinalAnswer(messages, signal);
  addUsage(finalUsage);

  // ── Persist (resilient — never crash the chat over storage) ─────────────
  const conversationId = await persistTurn({
    ctx,
    userMessage: opts.message,
    response,
    toolTrace,
    conversationId: opts.conversationId,
    promptTokens: totalUsage.promptTokens,
    completionTokens: totalUsage.completionTokens,
  }).catch((e) => {
    console.error('[agent] persist failed (migration applied?)', e);
    // Do NOT return a fake id like 'pending' — the next turn would send it
    // back and Number('pending')=NaN would poison every subsequent insert.
    // Returning undefined makes the client start a fresh conversation.
    return undefined;
  });

  return { response, conversationId, toolTrace };
}

async function produceFinalAnswer(
  messages: MiniMaxMessage[],
  signal?: AbortSignal,
): Promise<{ response: AgentResponse; usage: { promptTokens: number; completionTokens: number } }> {
  const tryParse = (content: string | null): AgentResponse | null => {
    if (!content) return null;
    // MiniMax-M3 is a hybrid reasoning model: it prepends <think>…</think>
    // blocks to EVERY response — including json_object mode — so the raw
    // content looks like '<think>…</think>\n\n{"type":"text",…}'. Parsing that
    // verbatim throws, the final answer never validated, and every turn
    // degraded to the generic apology. Strip reasoning blocks first, then fall
    // back to the first balanced {...} object in case prose/tags remain.
    const stripped = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const candidate = stripped || content;
    const jsonObj = extractFirstJsonObject(candidate) ?? candidate;
    try {
      const parsed = agentResponseSchema.safeParse(JSON.parse(jsonObj));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };

  // json_object mode requires the final message to be a user/system turn. If
  // the ReAct loop exhausted maxIterations, `messages` ends in a `tool` result
  // and the provider rejects the call (HTTP 400). Prompt the model to
  // synthesize so the final call is always well-formed.
  const base =
    messages[messages.length - 1]?.role === 'tool'
      ? [...messages, { role: 'user' as const, content: 'Đã có đủ dữ liệu. Trả lời cuối cùng theo schema JSON.' }]
      : messages;

  let usage = { promptTokens: 0, completionTokens: 0 };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callMiniMax({
        messages: attempt === 0
          ? base
          : [...base, { role: 'user', content: 'Output không hợp lệ. Trả lại JSON đúng schema.' }],
        responseFormat: { type: 'json_object' },
        signal,
      });
      usage = result.usage;
      const parsed = tryParse(result.content);
      if (parsed) return { response: parsed, usage };
    } catch (e) {
      // A client disconnect surfaces as an abort-timeout — let it throw so
      // runAgent skips persistTurn (no DB writes for a gone client).
      if (signal?.aborted) throw e;
      // Any other failure (HTTP/parse): retry once, then degrade below —
      // never surface a raw error over a missing final answer. Previously a
      // thrown callMiniMax bypassed this graceful path entirely.
      if (attempt === 1) console.error('[agent] produceFinalAnswer failed', e);
    }
  }
  // Degrade gracefully — never leave the user without an answer.
  return { response: { type: 'text', content: 'Xin lỗi, tôi không thể xử lý yêu cầu này lúc này.' }, usage };
}

function safeParseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Find the first balanced `{…}` JSON object in `s`. Reasoning models sometimes
 * wrap the JSON in leftover prose or tags even after stripping <think>; this
 * locates the real object without trusting the string to start with `{`.
 * Returns null if no balanced object is present.
 */
function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** Cap the JSON view fed back to the model to bound token cost. */
function truncateForModel(data: unknown): string {
  const json = JSON.stringify(data);
  return json.length > 12_000 ? `${json.slice(0, 12_000)}…(đã cắt)` : json;
}

// ── Persistence ────────────────────────────────────────────────────────────
async function persistTurn(opts: {
  ctx: AgentContext;
  userMessage: string;
  response: AgentResponse;
  toolTrace: unknown[];
  conversationId?: string;
  promptTokens: number;
  completionTokens: number;
}): Promise<string | undefined> {
  let conversationId = opts.conversationId;

  // IDOR guard: if continuing, the conversation MUST belong to the caller.
  // A missing, non-numeric, or other-user id falls back to a fresh
  // conversation (keeps chat working) instead of writing into someone
  // else's thread.
  if (conversationId) {
    const numericId = Number(conversationId);
    const [existing] = Number.isFinite(numericId)
      ? await db
          .select({ userId: schema.agentConversations.userId })
          .from(schema.agentConversations)
          .where(eq(schema.agentConversations.id, numericId))
          .limit(1)
      : [];
    if (!existing || existing.userId !== opts.ctx.userId) {
      conversationId = undefined;
    }
  }

  if (!conversationId) {
    const [row] = await db
      .insert(schema.agentConversations)
      .values({
        userId: opts.ctx.userId,
        role: opts.ctx.role,
        title: opts.userMessage.slice(0, 120),
      })
      .returning({ id: schema.agentConversations.id });
    conversationId = String(row.id);
  }

  await db.insert(schema.agentMessages).values({
    conversationId: Number(conversationId),
    role: 'user',
    content: opts.userMessage,
  });

  const directives = opts.response.type === 'directive' ? [opts.response.directive] : [];
  await db.insert(schema.agentMessages).values({
    conversationId: Number(conversationId),
    role: 'assistant',
    response: opts.response,
    toolTrace: opts.toolTrace,
    directives,
    tokensIn: opts.promptTokens,
    tokensOut: opts.completionTokens,
  });

  await db
    .update(schema.agentConversations)
    .set({ updatedAt: new Date() })
    .where(eq(schema.agentConversations.id, Number(conversationId)));

  return conversationId;
}
