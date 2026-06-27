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
import { ZodError } from 'zod';
import { randomUUID } from 'crypto';
import { performance } from 'node:perf_hooks';
import { db } from '../../db';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { config } from '../../config';
import {
  agentResponseSchema,
  agentDirectiveSchema,
  ACKED_DIRECTIVE_KINDS,
  Role,
  toursForRole,
  getTour,
  type AgentEvent,
  type AgentResponse,
  type AgentDirective,
  type AgentActionChip,
  type AgentActionResult,
} from '@tingting/shared';
import {
  callMiniMax,
  MODEL_FAST,
  AGENT_MAX_ITERATIONS,
  MiniMaxError,
  type MiniMaxMessage,
  type MiniMaxTool,
  type MiniMaxFunctionCall,
} from '../llm/minimax.client';
import { todayIsoVn } from './tools/period';
import { getToolsForRole, findTool } from './tool.registry';
import {
  matchRoute,
  sameRoute,
  hasOnlyNumericParams,
  NAV_HIGHLIGHT_DEFAULTS,
} from './routeMatcher';
import type { AgentContext, AgentToolDef, ToolResult } from './tool.types';
import { ToolError } from './tool.types';
import { withSpan, withRootSpan, type SpanAttrs } from './telemetry.js';
import logger from '../../lib/logger.js';

// ── Latency computation (pure, unit-tested) ─────────────────────────────────
// LATENCY CONTRACT — read before editing the metrics row:
//   latency_total_ms          = LLM + tools + final            (EXCLUDES ack + persist)
//   latency_user_perceived_ms = server-side wait fallback = root durationMs
//   latency_ack_ms / latency_persist_ms : tracked in their own columns
// All durations come from performance.now() (via withSpan.durationMs or a local
// timer), NEVER from the OTel span duration. See telemetry.ts LATENCY CONTRACT.
export interface MetricsAccumulator {
  latencyLlmMs: number;
  latencyToolsMs: number;
  latencyFinalMs: number;
  latencyAckMs: number;
  latencyPersistMs: number;
  reactIterations: number;
  toolCallCount: number;
  fallbackUsed: boolean;
  aborted: boolean;
  errorKind: string | undefined;
  /** True iff a navigate/focus directive was emitted this turn (mid-loop tool,
   *  terminal answer, or guardrail-synthesized). Powers the dashboard's
   *  navigate-compliance KPI (A4) and gates the A3 guardrail. */
  navigateDirectiveEmitted: boolean;
  /** True iff the A3 guardrail converted a prose-with-path answer into a
   *  navigate directive (the model failed to call ui.navigate on its own). */
  guardrailFired: boolean;
}

export interface LatencyBreakdown {
  latencyTotalMs: number;
  latencyUserPerceivedMs: number;
  latencyAckMs: number;
  latencyPersistMs: number;
}

export function computeLatencies(
  acc: Pick<MetricsAccumulator, 'latencyLlmMs' | 'latencyToolsMs' | 'latencyFinalMs' | 'latencyAckMs' | 'latencyPersistMs'>,
  rootDurationMs: number,
): LatencyBreakdown {
  // invariant: user_perceived = total + ack + persist (+overhead)
  return {
    latencyTotalMs: acc.latencyLlmMs + acc.latencyToolsMs + acc.latencyFinalMs,
    latencyUserPerceivedMs: rootDurationMs,
    latencyAckMs: acc.latencyAckMs,
    latencyPersistMs: acc.latencyPersistMs,
  };
}

const RESPONSE_SHAPE_HINT = `Trả lời cuối cùng PHẢI là JSON theo đúng một trong 5 dạng:
- {"type":"text","content":"...","actions":[{"label":"...","directive":{...}}]}  (giải thích ngắn / trợ giúp trang / câu trả lời đơn giản; actions tùy chọn khi có bước tiếp theo rõ ràng)
- {"type":"insight_card","title":"...","summary":"nguyên nhân/tóm tắt 1-2 câu","widgets":[...],"actions":[{"label":"...","directive":{...}}]}  (câu hỏi phân tích: lợi nhuận, công nợ, chi phí, dầu...)
- {"type":"tutorial","title":"...","summary":"...","steps":[{"title":"...","body":"...","example":"...","directive":{"kind":"scrollTo","targetId":"...","durationMs":3000}}],"actions":[{"label":"...","directive":{...}}]}  (khi người dùng hỏi cách thao tác/hướng dẫn từng bước trên UI)
- {"type":"start_tour","tourId":"create-trip|lock-trip-and-payment|fuel-config"}  (mở hướng dẫn từng bước CÓ SẴN — gọi tours.search để tìm tourId khi người dùng muốn hướng dẫn theo luồng công việc: tạo chuyến, chốt chuyến/thu tiền, định mức dầu)
- {"type":"directive","directive":{"kind":"navigate|focus|open|prefill|toast|scrollTo",...}}  (chỉ điều hướng)
widget có thể là: kpi_grid {items:[{label,value(number),format:"vnd|percent|number|days",delta?}]}, bar_chart {data:[{name,value}],format?}, line_chart {series:[{name,points:[{x,y}]}]}, table {columns,rows}, callout {variant:"info|warning|danger",text}, anomaly_list {items:[{label,detail,severity:"low|med|high"}]}.
LƯU Ý:(1) value LUÔN là số nguyên VND đầy đủ (VD 120000000, KHÔNG phải 120 hay "120 triệu"); (2) format CHỈ một trong vnd|percent|number|days — KHÔNG tự đặt đơn vị như vnd_million; (3) mỗi action PHẢI là {"label":...,"directive":{"kind":...}} — nếu không có directive hợp lệ thì bỏ hẳn actions; (4) khi câu trả lời text/tutorial/insight_card nhắc người dùng mở trang hoặc bấm nút tiếp theo, PHẢI thêm actions bằng directive thật, KHÔNG chỉ viết tên trang/path trong content; (5) nếu cần bảng, ưu tiên insight_card widget type="table"; nếu bắt buộc trả text thì dùng Markdown table chuẩn, có dòng trống trước bảng.`;

function buildSystemPrompt(ctx: AgentContext): string {
  return [
    'Bạn là trợ lý TingTing — nền tảng vận tải/logistics cho công ty xe tải Việt Nam.',
    `Bạn đang hỗ trợ người dùng vai trò "${ctx.role}". v1 CHỈ ĐỌC: không tạo/sửa/xóa dữ liệu (chỉ mở form điền sẵn — người dùng tự lưu).`,
    // Date awareness: without this the LLM invented "2025" for "tháng này" and
    // every report dutifully returned zeros for a non-existent period.
    `Hôm nay: ${todayIsoVn()} (YYYY-MM-DD). Khi người dùng nói "tháng này/quý này/nay", mặc định tháng/năm HIỆN TẠI — KHÔNG dùng năm khác.`,
    'Quy tắc:',
    '- LUÔN dùng công cụ để lấy số liệu; KHÔNG bịa số trong insight_card — chỉ dùng số công cụ trả về.',
    '- Với câu hỏi factual về dữ liệu trong hệ thống (VD số lốp, biển xe, khách, nhà cung cấp, mẫu giấy báo nợ, chi phí, ledger, audit): dùng data.search/data.list/data.detail/data.aggregate/data.timeline trước khi trả lời. ui.navigate chỉ mở trang cho người dùng, KHÔNG đọc dữ liệu trên trang.',
    '- Nếu người dùng đưa một định danh mơ hồ (VD "Số lốp 136.31", biển xe, mã chuyến), gọi data.search trước; nếu tìm thấy bản ghi phù hợp thì dùng data.detail khi cần field đầy đủ.',
    '- Với tổng tiền/báo cáo tài chính (doanh thu, lợi nhuận, công nợ, lương, dầu, aging): dùng report.run hoặc analyzer/report tool chuyên dụng. KHÔNG dùng data.aggregate để tự cộng các số tiền tài chính phức tạp.',
    '- Với câu hỏi phân tích (lợi nhuận/công nợ/chi phí/dầu): dùng analyzer/report tool rồi trả insight_card có widgets phù hợp + tóm tắt nguyên nhân. Khi nói "tháng này", bỏ qua month/year (server tự lấy tháng hiện tại).',
    '- Với yêu cầu "hướng dẫn/cách làm/tutorial/từng bước": trả type="tutorial" với 3-6 bước ngắn. Nếu biết đúng phần tử UI, gắn directive scrollTo/focus để người dùng bấm "Tô sáng".',
    '- Với yêu cầu hướng dẫn theo LUỒNG CÔNG VIỆC (tạo chuyến, chốt chuyến + thu tiền, định mức nhiên liệu): gọi tours.search để tìm tourId rồi trả {"type":"start_tour","tourId":"..."}. Các tour có sẵn: create-trip, lock-trip-and-payment, fuel-config. Với câu hỏi HẸP (VD "đơn giá dầu điền ở đâu") → vẫn trả type="tutorial" freeform ngắn.',
    '- Với trang Định mức nhiên liệu (/config/fuel), các targetId hợp lệ: fuel-loaded-norm-field, fuel-empty-norm-field, fuel-supplement-field, fuel-unit-price-field, fuel-warning-threshold-field, fuel-critical-threshold-field, fuel-save-config-button.',
    '- Với yêu cầu mở trang/tìm/xem: LUÔN gọi ui.navigate (hoặc trả {"type":"directive",...}). KHÔNG mô tả đường dẫn bằng text.',
    '- ĐẶC QUYỀN (tạo/sửa/xóa) mà bot KHÔNG được phép (v1 chỉ đọc): KHÔNG từ chối bằng text đường dẫn. LUÔN gọi ui.navigate để ĐƯA người dùng đến đúng trang + nút cần bấm — kèm highlight.targetId trỏ vào nút/phần tử đó (VD trên trang lốp dùng "ttp-add-trigger"). Người dùng tự lưu; bot chỉ dẫn chỗ.',
    '- ui.navigate nhận thêm highlight:{targetId,durationMs} để cuộn + tô sáng nút/phần tử cụ thể trên trang đích — dùng khi người dùng cần biết chính xác chỗ nào để bấm/nhập.',
    '- Nếu không cần điều hướng ngay nhưng câu trả lời có bước tiếp theo là mở trang/bấm nút, trả text/insight_card/tutorial kèm actions[{label,directive}] với routeKey/params thật. KHÔNG chỉ viết "vào trang Quản lý lốp" hoặc một đường dẫn trong content.',
    '- open/prefill: CHỈ dùng với componentId đã đăng ký. Hiện có "debt.record-payment" (trang công nợ /debt/:id — mở form ghi nhận thanh toán; có thể kèm prefill.amount = số VND nếu người dùng nêu số tiền). Các component khác CHƯA đăng ký → dùng navigate/focus để dẫn người dùng tới nút.',
    'VÍ DỤ — người dùng: "thêm lốp xe cho đầu kéo 1". Bot không được thêm (chỉ đọc) → gọi ui.navigate({routeKey:"fleetTires", params:{truckId:1}, highlight:{targetId:"ttp-add-trigger", durationMs:4000}}) rồi trả {"type":"directive","directive":{...}}. KHÔNG viết đường dẫn /fleet/1/tires trong text.',
    'VÍ DỤ — nếu trả lời factual "xe chưa có lốp, có thể thêm ở trang lốp" thì trả {"type":"text","content":"Xe hiện chưa có lốp nào được gắn.","actions":[{"label":"Mở trang lốp","directive":{"kind":"navigate","routeKey":"fleetTires","params":{"truckId":1},"highlight":{"targetId":"ttp-add-trigger","durationMs":4000}}}]}',
    'VÍ DỤ — người dùng: "mở trang tổng quan" → gọi ui.navigate({routeKey:"dashboard"}).',
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

/** Compose the terminal bubble for a navigate/focus directive from its ack. */
function directiveAckText(
  d: Extract<AgentDirective, { kind: 'navigate' | 'focus' }>,
  ack: AgentActionResult,
): AgentResponse {
  const where = d.kind === 'focus' ? `${d.routeKey} #${d.id}` : d.routeKey;
  if (ack.status === 'ok') {
    return { type: 'text', content: `Đã mở trang ${where} cho bạn.` };
  }
  return {
    type: 'text',
    content: `Không mở được trang ${where}${ack.reason ? ` (${ack.reason})` : ''}. Bạn có thể mở thủ công.`,
  };
}

function normalizeForIntent(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Tour net — deterministic safety net beneath the model's tour selection,
 *  mirroring synthesizeNavigateFromProse's role for navigation. Two jobs:
 *   (1) VALIDATE: an emitted {type:'start_tour'} whose tourId is unknown or not
 *       visible to the user's role → downgrade to an honest text line (also
 *       breaks a potential MiniMax retry loop on a bogus id).
 *   (2) CATCH: a freeform {type:'tutorial'} whose title STRONGLY matches a
 *       catalog tour the user can see → launch the curated tour instead (the
 *       model rebuilt a tour we already authored). Title-match is intentionally
 *       strict (≥6 chars, equality or containment) so a narrow how-to such as
 *       "đơn giá dầu ở đâu" stays a freeform answer and isn't hijacked into a
 *       6-step tour. Deterministic + unit-tested. */
export function synthesizeStartTourFromResponse(response: AgentResponse, role: Role): AgentResponse {
  if (response.type === 'start_tour') {
    const tour = getTour(response.tourId);
    const visible = tour ? toursForRole(role).some((t) => t.id === tour.id) : false;
    if (!tour || !visible) {
      return {
        type: 'text',
        content: `Hướng dẫn "${response.tourId}" không khả dụng cho vai trò của bạn.`,
      };
    }
    return response;
  }
  if (response.type === 'tutorial') {
    const normTitle = normalizeForIntent(response.title);
    const match = toursForRole(role).find((t) => {
      const tt = normalizeForIntent(t.title);
      return tt.length >= 6 && (normTitle === tt || normTitle.includes(tt));
    });
    if (match) return { type: 'start_tour', tourId: match.id };
  }
  return response;
}

/** A3 guardrail helper: scan a prose answer for a path-like token that resolves
 *  to an agent-navigable route DIFFERENT from the user's current page, and
 *  return a navigate directive for it (with the page's default highlight target
 *  when one is configured). Returns null when no usable path is found.
 *  Deterministic + unit-tested; Vietnamese title/alias matching is intentionally
 *  out of scope (match only on /path tokens for v1 determinism). */
export function synthesizeNavigateFromProse(
  text: string,
  currentRouteKey: string | undefined,
): Extract<AgentDirective, { kind: 'navigate' }> | null {
  // /segment[/segment]… tokens, at least one segment after the leading slash.
  const tokens = text.match(/\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9-]+)*/gi) ?? [];
  const current = currentRouteKey ? matchRoute(currentRouteKey) : null;
  for (const tok of tokens) {
    const m = matchRoute(tok);
    if (!m) continue;
    // Parametric routes need a numeric id; static routes (no params) pass.
    if (!hasOnlyNumericParams(m)) continue;
    // Skip a redundant navigate to the page the user is already on.
    if (sameRoute(m, current)) continue;
    const defaultTarget = NAV_HIGHLIGHT_DEFAULTS[m.routeKey];
    return {
      kind: 'navigate',
      routeKey: m.routeKey,
      params: m.params,
      ...(defaultTarget ? { highlight: { targetId: defaultTarget } } : {}),
    };
  }
  return null;
}

/** Build an optional action chip for prose answers that mention a valid app
 *  path but remain text (for example after a prior navigation already happened
 *  in the same turn). This avoids dumping bare `/fleet/1/tires` instructions
 *  without a clickable next step. */
export function synthesizeTextActionsFromProse(
  text: string,
  currentRouteKey: string | undefined,
): AgentActionChip[] {
  const directive = synthesizeNavigateFromProse(text, currentRouteKey);
  if (!directive) return [];
  const label = directive.routeKey === 'fleetTires' || directive.routeKey === 'fleetTrailerTires'
    ? 'Mở trang lốp'
    : 'Mở trang đề xuất';
  return [{ label, directive }];
}

export interface RunAgentResult {
  response: AgentResponse;
  conversationId: string | undefined;
  assistantMessageId: number | undefined;
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
  /** When provided, navigate/focus directives are emitted with `requiresAck`
   *  and this resolves once the frontend confirms execution (or times out).
   *  Lets the agent compose accurate "đã mở / không mở được" text. */
  awaitAck?: (actionId: string) => Promise<AgentActionResult>;
}): Promise<RunAgentResult> {
  const { ctx, emit, signal } = opts;
  const tools = getToolsForRole(ctx.role);
  const miniMaxTools = toolsToMiniMax(tools);
  const toolTrace: unknown[] = [];

  // ── Metrics accumulator ────────────────────────────────────────────────
  // Every persisted assistant turn writes exactly one metrics row. Latency
  // numbers come ONLY from performance.now() (via withSpan.durationMs or a
  // local timer) — NEVER the OTel span duration. See telemetry.ts LATENCY CONTRACT.
  const metrics: MetricsAccumulator = {
    latencyLlmMs: 0,
    latencyToolsMs: 0,
    latencyFinalMs: 0,
    latencyAckMs: 0,
    latencyPersistMs: 0,
    reactIterations: 0,
    toolCallCount: 0,
    fallbackUsed: false,
    aborted: false,
    errorKind: undefined,
    navigateDirectiveEmitted: false,
    guardrailFired: false,
  };

  // Hoisted out of the root-span body so the metrics row can be written AFTER
  // the span resolves: rootDurationMs + traceId come from withRootSpan's RETURN,
  // so referencing them inside the callback is a TDZ. Mutated inside the span.
  const totalUsage = { promptTokens: 0, completionTokens: 0 };
  let conversationId: string | undefined;
  let assistantMessageId: number | undefined;

  const rootAttrs: SpanAttrs = {
    conversation_id: opts.conversationId ?? 'new',
    role: ctx.role,
    model: MODEL_FAST,
    route_context: ctx.currentRouteKey ?? 'none',
    // NOTE: no user_id span attr (low-cardinality only) — userId goes in the
    // metrics DB row, not on the trace.
  };

  const { result: runResult, durationMs: rootDurationMs, traceId } = await withRootSpan(
    'agent.turn',
    rootAttrs,
    async () => {
      const messages: MiniMaxMessage[] = [
        { role: 'system', content: buildSystemPrompt(ctx) },
        ...(opts.priorMessages ?? []),
        { role: 'user', content: opts.message },
      ];

      // ── ReAct loop ──────────────────────────────────────────────────────
      // Accumulate tokens across every MiniMax call (each call is billed for
      // its full prompt context, so summing == actual consumption).
      // (totalUsage is declared in the outer scope — written to the metrics row
      // after the span resolves.)
      const addUsage = (u: { promptTokens: number; completionTokens: number }) => {
        totalUsage.promptTokens += u.promptTokens;
        totalUsage.completionTokens += u.completionTokens;
      };

      const persistResponse = async (response: AgentResponse) => {
        // ── Persist (resilient — never crash the chat over storage) ─────────
        // persistTurn is wrapped in its own span → latencyPersistMs. It returns
        // BOTH conversationId AND the new assistant messageId (so the metrics
        // row has its PK). On failure we still return conversationId=undef.
        try {
          const persistSpan = await withSpan('agent.db.persist_turn', undefined, async () =>
            persistTurn({
              ctx,
              userMessage: opts.message,
              response,
              toolTrace,
              conversationId: opts.conversationId,
              promptTokens: totalUsage.promptTokens,
              completionTokens: totalUsage.completionTokens,
            }),
          );
          metrics.latencyPersistMs += persistSpan.durationMs;
          conversationId = persistSpan.result.conversationId;
          assistantMessageId = persistSpan.result.messageId;
        } catch (e) {
          // Persist failure must NOT crash chat; no row to write (no messageId).
          console.error('[agent] persist failed (migration applied?)', e);
        }

        return { response, conversationId, toolTrace };
      };

      for (let i = 0; i < AGENT_MAX_ITERATIONS; i++) {
        metrics.reactIterations = i + 1;
        // Stop spending tokens the moment the client disconnects. PRE-PERSIST
        // abort → no row (1:1 invariant: no messageId exists).
        if (opts.signal?.aborted) {
          return { response: { type: 'text' as const, content: '' }, conversationId: undefined, toolTrace };
        }

        let result;
        // Local timer around the await because withSpan re-throws on failure
        // (so durationMs is unobtainable from its return on the error path).
        const llmStart = performance.now();
        try {
          const wrapped = await withSpan(
            'agent.llm.react_call',
            { 'gen_ai.request.model': MODEL_FAST },
            async () => callMiniMax({ messages: trimToolHistory(messages), tools: miniMaxTools, signal }),
          );
          metrics.latencyLlmMs += wrapped.durationMs;
          result = wrapped.result;
        } catch (e) {
          // Record llm latency on the throwing path via our own timer, then
          // re-throw to the caller (socket layer) — pre-persist, no row.
          metrics.latencyLlmMs += performance.now() - llmStart;
          if (e instanceof MiniMaxError) metrics.errorKind = e.code;
          throw e;
        }
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
        // PRE-PERSIST abort → no row.
        if (opts.signal?.aborted) {
          return { response: { type: 'text' as const, content: '' }, conversationId: undefined, toolTrace };
        }

        // ── Tool execution (P1.3: read-only tools run concurrently) ──────────
        // Partition into READ-ONLY tools (data.* queries, ui.search_pages — no
        // side effects, order-independent) and SIDE-EFFECTING tools (ui.navigate
        // /ui.focus — each awaits a UI ack, so they MUST fire serially in order).
        // Results are re-serialized below in ORIGINAL call order so the
        // assistant(tool_calls) keeps its replies in the order the model asked
        // (protocol-safe) and ack sequencing stays deterministic.
        type ToolPending = {
          call: MiniMaxFunctionCall;
          tool: AgentToolDef | undefined;
          parsedArgs: unknown;
          status: 'pending' | 'ok' | 'error' | 'missing';
          result?: ToolResult;
          errorMsg?: string;
          errorLabel?: string;
        };
        const pendings: ToolPending[] = result.toolCalls.map((call) => ({
          call,
          tool: findTool(call.name),
          parsedArgs: safeParseArgs(call.arguments),
          status: 'pending' as const,
        }));
        // tool_start events fire in original order (the UI shows them sequentially).
        for (const p of pendings) emit({ event: 'tool_start', toolName: p.call.name, args: p.parsedArgs });

        // Execute ONE tool (withSpan → latencyToolsMs; errorKind on failure). No
        // ack handling here — that is serial + ordered for side-effecting ui.*.
        // The local timer records latencyToolsMs even when withSpan rethrows
        // (its durationMs is unobtainable on the error path).
        const runExecute = async (p: ToolPending): Promise<void> => {
          const toolStart = performance.now();
          try {
            const toolSpan = await withSpan(
              'agent.tool.execute',
              { 'gen_ai.tool.name': p.call.name },
              async () => p.tool!.execute(p.parsedArgs, ctx),
            );
            metrics.latencyToolsMs += toolSpan.durationMs;
            p.result = toolSpan.result;
            p.status = 'ok';
          } catch (e) {
            metrics.latencyToolsMs += performance.now() - toolStart;
            metrics.errorKind = 'tool';
            p.errorMsg = formatToolError(e);
            p.errorLabel = formatToolErrorLabel(e, p.call.name);
            p.status = 'error';
          }
        };

        // 1) READ-ONLY tools → concurrent. JS is single-threaded, so the
        // latencyToolsMs/errorKind mutations inside runExecute never interleave.
        await Promise.all(
          pendings.filter((p) => p.tool?.readonly === true).map((p) => runExecute(p)),
        );

        // 2) Side-effecting tools (ui.* + un-flagged) → serial, in original
        // order, so each directive's ack settles before the next one fires.
        for (const p of pendings) {
          if (p.tool?.readonly === true) continue; // already ran concurrently
          if (!p.tool) { p.status = 'missing'; continue; }
          await runExecute(p);
          if (p.status !== 'ok' || !p.result) continue;
          // ui.* tools produce a directive — move the UI immediately. For
          // navigate/focus we request an ack so the LLM learns whether the page
          // actually opened before it composes its final answer. The ack wait is
          // its OWN span (kept OUT of latencyToolsMs).
          if (p.call.name.startsWith('ui.')) {
            const parsed = agentDirectiveSchema.safeParse(p.result.data);
            if (parsed.success) {
              const d = parsed.data as AgentDirective;
              if (
                (ACKED_DIRECTIVE_KINDS as readonly string[]).includes(d.kind) &&
                opts.awaitAck &&
                !opts.signal?.aborted
              ) {
                const actionId = randomUUID();
                metrics.navigateDirectiveEmitted = true;
                emit({ event: 'directive', directive: d, actionId, requiresAck: true });
                const ackSpan = await withSpan(
                  'agent.socket.ack_wait',
                  { directive_kind: d.kind },
                  async () => opts.awaitAck!(actionId),
                );
                metrics.latencyAckMs += ackSpan.durationMs;
                const ack = ackSpan.result;
                if (opts.signal?.aborted) {
                  // PRE-PERSIST abort → no row.
                  return { response: { type: 'text' as const, content: '' }, conversationId: undefined, toolTrace };
                }
                // Replace the tool result with the ack outcome so the model's
                // final answer reflects reality ("đã mở" only if ok).
                p.result = {
                  data: { directive: d, opened: ack.status === 'ok', ackStatus: ack.status, reason: ack.reason },
                  label: ack.status === 'ok' ? p.result.label : `${p.result.label} — ${ack.status}`,
                };
              } else {
                emit({ event: 'directive', directive: d });
              }
            }
          }
        }

        // 3) Re-serialize in ORIGINAL call order: tool_result events, the tool
        // messages fed back to the model, the trace, and toolCallCount. Replies
        // in the order the model requested keep the tool-calling protocol
        // well-formed; missing tools are not counted (they never reached execute).
        for (const p of pendings) {
          if (p.status === 'missing') {
            const msg = `Công cụ không tồn tại: ${p.call.name}`;
            emit({ event: 'tool_result', toolName: p.call.name, toolCallId: p.call.id, ok: false, label: msg });
            messages.push({ role: 'tool', tool_call_id: p.call.id, name: p.call.name, content: msg });
            toolTrace.push({ toolName: p.call.name, ok: false, error: msg });
            continue;
          }
          metrics.toolCallCount += 1;
          if (p.status === 'error') {
            emit({ event: 'tool_result', toolName: p.call.name, toolCallId: p.call.id, ok: false, label: p.errorLabel ?? 'Công cụ cần tham số khác' });
            messages.push({ role: 'tool', tool_call_id: p.call.id, name: p.call.name, content: `Lỗi: ${p.errorMsg}` });
            toolTrace.push({ toolName: p.call.name, ok: false, args: p.parsedArgs, error: p.errorMsg });
            continue;
          }
          emit({ event: 'tool_result', toolName: p.call.name, toolCallId: p.call.id, ok: true, label: p.result!.label });
          // Feed a size-capped JSON view back to the model.
          const view = truncateForModel(p.result!.data);
          messages.push({ role: 'tool', tool_call_id: p.call.id, name: p.call.name, content: view });
          toolTrace.push({ toolName: p.call.name, ok: true, args: p.parsedArgs, label: p.result!.label });
        }
      }

      // ── Final structured answer (JSON-mode) ───────────────────────────────
      if (opts.signal?.aborted) {
        return { response: { type: 'text' as const, content: '' }, conversationId: undefined, toolTrace };
      }
      // produceFinalAnswer now also reports fallbackUsed; wrap for latency.
      const finalSpan = await withSpan('agent.final_answer', undefined, async () =>
        produceFinalAnswer(trimToolHistory(messages), signal),
      );
      metrics.latencyFinalMs += finalSpan.durationMs;
      const { usage: finalUsage, fallbackUsed, fallbackReason } = finalSpan.result;
      let response = finalSpan.result.response;
      metrics.fallbackUsed = fallbackUsed;
      // P0b — record WHY the final answer fell back (prefixed final_*), so the
      // dashboard can split fallback cause from ReAct-loop errors. Guard on
      // `!metrics.errorKind`: a turn that had a mid-loop TOOL failure AND then
      // fell back keeps the 'tool' error (counted in errorRate — the actionable
      // signal). The fallback itself is still captured by fallbackUsed →
      // fallbackRate; we only stamp a final_ reason when there's no competing
      // mid-loop error, so errorRate never silently drops a real tool error.
      if (!metrics.errorKind && fallbackUsed && fallbackReason) metrics.errorKind = fallbackReason;
      addUsage(finalUsage);

      // A3 — prose-with-path guardrail. MiniMax-M3 sometimes ignores the
      // "call ui.navigate, don't write paths in text" rule and emits a plain
      // prose answer naming a destination (e.g. "...tại /fleet/1/tires"). When
      // that happens and no directive was emitted this turn, extract the path,
      // resolve it via PAGE_CATALOG, and convert the answer into a real
      // navigate directive. The terminal-ack block below then emits it, awaits
      // the ack, and rewrites the bubble via directiveAckText — so we NEVER
      // claim "đã mở" for a page the client never applied. Gated by a config
      // kill-switch; the current-route guard skips a redundant navigate to the
      // page the user is already on (routeKey AND params compared).
      if (
        config.agentNavigateGuardrail &&
        response.type === 'text' &&
        !metrics.navigateDirectiveEmitted &&
        !opts.signal?.aborted
      ) {
        const synthesized = synthesizeNavigateFromProse(response.content, ctx.currentRouteKey);
        if (synthesized) {
          metrics.guardrailFired = true;
          metrics.navigateDirectiveEmitted = true;
          response = { type: 'directive', directive: synthesized };
        }
      }

      if (response.type === 'text' && !opts.signal?.aborted) {
        const synthesizedActions = synthesizeTextActionsFromProse(response.content, ctx.currentRouteKey);
        if (synthesizedActions.length > 0) {
          response = {
            ...response,
            actions: [...(response.actions ?? []), ...synthesizedActions],
          };
        }
      }

      // Tour net: validate an emitted {type:'start_tour'} (role + existence) and
      // conservatively launch a curated tour when the model rambled a freeform
      // tutorial matching one. Mirrors the A3 navigate net; kill-switch gated.
      if (config.agentTourGuardrail && !opts.signal?.aborted) {
        response = synthesizeStartTourFromResponse(response, ctx.role);
      }

      // Telemetry: a navigate/focus directive in the terminal answer counts as
      // "navigate emitted" whether or not the ack path ran — the frontend still
      // applies the directive from the done event.
      if (
        response.type === 'directive' &&
        (ACKED_DIRECTIVE_KINDS as readonly string[]).includes(response.directive.kind)
      ) {
        metrics.navigateDirectiveEmitted = true;
      }

      // Terminal directive ack: if the model's FINAL answer is itself a
      // navigate/focus directive, confirm it actually landed before claiming
      // success — then rewrite the answer to an honest text line so we never
      // say "đã mở" for a page the client never applied.
      if (
        response.type === 'directive' &&
        (ACKED_DIRECTIVE_KINDS as readonly string[]).includes(response.directive.kind) &&
        opts.awaitAck &&
        !opts.signal?.aborted
      ) {
        const actionId = randomUUID();
        emit({ event: 'directive', directive: response.directive, actionId, requiresAck: true });
        // TERMINAL ACK WAIT — its own span, tracked in latencyAckMs.
        const ackSpan = await withSpan(
          'agent.socket.ack_wait',
          { directive_kind: response.directive.kind },
          async () => opts.awaitAck!(actionId),
        );
        metrics.latencyAckMs += ackSpan.durationMs;
        const ack = ackSpan.result;
        response = directiveAckText(
          response.directive as Extract<AgentDirective, { kind: 'navigate' | 'focus' }>,
          ack,
        );
      }

      return persistResponse(response);
    },
  );

  // ── Metrics row (100% write, sampler-independent) ──────────────────────
  // Written AFTER the root span resolves: rootDurationMs (total user-perceived
  // latency incl. ack + persist) and traceId come from withRootSpan's RETURN, so
  // referencing them inside the span body is a TDZ. Always write when we have a
  // messageId; turns that aborted BEFORE persistTurn have none → no row (1:1
  // invariant). The dashboard abort KPI is labelled "tỷ lệ huỷ khi lưu".
  if (assistantMessageId !== undefined) {
    const lat = computeLatencies(metrics, rootDurationMs);
    try {
      await db.insert(schema.agentTurnMetrics).values({
        messageId: assistantMessageId,
        traceId,
        userId: ctx.userId,
        role: ctx.role,
        conversationId: conversationId !== undefined ? Number(conversationId) : undefined,
        model: MODEL_FAST,
        latencyUserPerceivedMs: Math.round(lat.latencyUserPerceivedMs),
        latencyTotalMs: Math.round(lat.latencyTotalMs),
        latencyLlmMs: Math.round(metrics.latencyLlmMs),
        latencyToolsMs: Math.round(metrics.latencyToolsMs),
        latencyFinalMs: Math.round(metrics.latencyFinalMs),
        latencyAckMs: Math.round(metrics.latencyAckMs),
        latencyPersistMs: Math.round(metrics.latencyPersistMs),
        reactIterations: metrics.reactIterations,
        toolCallCount: metrics.toolCallCount,
        fallbackUsed: metrics.fallbackUsed,
        aborted: metrics.aborted,
        navigateDirectiveEmitted: metrics.navigateDirectiveEmitted,
        guardrailFired: metrics.guardrailFired,
        errorKind: metrics.errorKind,
        tokensIn: totalUsage.promptTokens,
        tokensOut: totalUsage.completionTokens,
      });
    } catch (err) {
      // Never crash the chat over telemetry. Log and move on.
      logger.warn(
        { traceId, messageId: assistantMessageId, err },
        'agent_turn_metrics insert failed',
      );
    }
  }

  return { ...runResult, assistantMessageId };
}

async function produceFinalAnswer(
  messages: MiniMaxMessage[],
  signal?: AbortSignal,
): Promise<{
  response: AgentResponse;
  usage: { promptTokens: number; completionTokens: number };
  /** true when the structured-card path failed and the prose path produced the
   *  answer (i.e. the model could not emit the strict insight_card schema). */
  fallbackUsed: boolean;
  /** P0b — WHY the final answer fell back. `final_*`-prefixed so the dashboard
   *  can bucket fallback cause (timeout/http/parse/schema/prose_failed) WITHOUT
   *  a migration, reusing the existing errorKind column. Undefined when the
   *  structured card validated (no fallback). */
  fallbackReason?: string;
}> {
  let fallbackReason: string | undefined;
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
      // Normalize the LLM's near-misses (invented format units, directive-less
      // action chips) before strict validation so a good card isn't rejected.
      const sanitized = sanitizeAgentJson(JSON.parse(jsonObj));
      const parsed = agentResponseSchema.safeParse(sanitized);
      if (!parsed.success) return null;
      // An empty text answer means the model gave up on the schema — treat it
      // as a failure so the retry / prose-fallback path supplies a real answer.
      if (parsed.data.type === 'text' && !parsed.data.content.trim()) return null;
      return parsed.data;
    } catch {
      return null;
    }
  };

  // The model does not reliably emit the strict insight_card schema, so try the
  // structured card ONCE; if it doesn't validate, ask for a plain prose answer
  // (no schema / json_object burden). Either way the user gets the model's real
  // analysis of the tool data the loop already gathered — never an empty "Xin
  // lỗi". A client disconnect (abort) must throw so runAgent skips persistTurn.
  const CARD_NUDGE =
    'Dựa trên dữ liệu công cụ đã có, trả lời cuối cùng theo ĐÚNG schema JSON (một trong 5 dạng), chỉ trả JSON, không kèm giải thích. Nếu có bước tiếp theo là mở trang/bấm nút, phải đặt trong actions[{label,directive}] với routeKey/params thật; không chỉ viết tên trang hoặc path trong content. Nếu cần bảng, ưu tiên insight_card widget type="table" hoặc Markdown table chuẩn trong text.';

  // 1) Best-effort structured insight_card (validated + sanitized).
  try {
    const card = await callMiniMax({
      messages: [...messages, { role: 'user', content: CARD_NUDGE }],
      responseFormat: { type: 'json_object' },
      // Headroom for a rich card + any <think>, so output isn't truncated.
      maxTokens: 16000,
      signal,
    });
    const parsed = tryParse(card.content);
    if (parsed) return { response: parsed, usage: card.usage, fallbackUsed: false };
    // Card came back but didn't validate (non-JSON or schema-invalid) → record
    // the schema failure as the fallback cause before degrading to prose.
    fallbackReason = 'final_schema';
  } catch (e) {
    if (signal?.aborted) throw e;
    fallbackReason = e instanceof MiniMaxError ? `final_${e.code}` : 'final_parse';
    console.error(`[agent] structured card failed (${fallbackReason}), falling back to prose`, e);
  }

  // 2) Reliable prose answer — concise Vietnamese analysis, no JSON constraint.
  try {
    const prose = await callMiniMax({
      messages: [
        ...messages,
        { role: 'user', content: 'Dựa trên dữ liệu trên, trả lời ngắn gọn, rõ ràng bằng tiếng Việt (2-4 câu). Không cần JSON.' },
      ],
      signal,
    });
    const text = (prose.content ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (text) return { response: { type: 'text', content: text }, usage: prose.usage, fallbackUsed: true, fallbackReason };
  } catch (e) {
    if (signal?.aborted) throw e;
    console.error('[agent] prose answer failed', e);
  }

  // Final-degradation apology — counts as a fallback (both real paths failed).
  return {
    response: { type: 'text', content: 'Xin lỗi, tôi không thể xử lý yêu cầu này lúc nào.' },
    usage: { promptTokens: 0, completionTokens: 0 },
    fallbackUsed: true,
    fallbackReason: fallbackReason ?? 'final_prose_failed',
  };
}

function safeParseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function formatToolError(e: unknown): string {
  if (e instanceof ToolError) return e.message;
  if (e instanceof ZodError) return `Tham số công cụ không hợp lệ: ${formatZodIssues(e)}`;
  return e instanceof Error ? e.message : 'Lỗi công cụ';
}

function formatToolErrorLabel(e: unknown, toolName: string): string {
  if (e instanceof ZodError) return `Đang điều chỉnh tham số cho ${toolName}`;
  if (e instanceof ToolError && e.code === 'invalid_args') return `Cần thêm tham số cho ${toolName}`;
  return formatToolError(e);
}

function formatZodIssues(error: ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })
    .join('; ');
}

const WIDGET_FORMATS = new Set(['vnd', 'percent', 'number', 'days']);

/**
 * Tolerate the LLM's realistic-but-non-conformant output before strict Zod
 * validation: coerce unknown numeric `format` values to a safe default and
 * drop action chips without a usable directive. Keeps a good insight_card
 * from degrading to the generic apology over a stray "vnd_million".
 */
function sanitizeAgentJson(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  // text, insight_card, and tutorial may carry top-level `actions`; normalize
  // action chips for all three. text/tutorial have no `widgets`, so the widget
  // block below is a no-op for them.
  if (obj.type === 'text' || obj.type === 'insight_card' || obj.type === 'tutorial') {
    if (Array.isArray(obj.widgets)) {
      obj.widgets = (obj.widgets as Record<string, unknown>[]).map((w) => {
        if (!w) return w;
        // The model often emits `kind` (the directive discriminator) for widgets;
        // the widget union discriminates on `type`. Normalize so the card parses.
        if (!w.type && typeof w.kind === 'string') {
          w.type = w.kind;
          delete w.kind;
        }
        if (typeof w.format === 'string' && !WIDGET_FORMATS.has(w.format)) w.format = 'number';
        if (Array.isArray(w.items)) {
          w.items = (w.items as Record<string, unknown>[]).map((it) => {
            if (it) {
              // format is required on kpi items — default missing/unknown to 'number'.
              if (it.format === undefined || (typeof it.format === 'string' && !WIDGET_FORMATS.has(it.format))) {
                it.format = 'number';
              }
            }
            return it;
          });
        }
        return w;
      });
    }
    if (Array.isArray(obj.actions)) {
      obj.actions = (obj.actions as Record<string, unknown>[]).filter(
        (a) => !!a && typeof a === 'object' && typeof (a as Record<string, unknown>).directive === 'object',
      );
    }
  }
  return obj;
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

// P1.1 — per-tool-result char cap. Was 12_000 (~3k tokens/result); halved to
// 6_000 so a tool-heavy turn doesn't re-bill multi-thousand-token raw-JSON dumps
// on every ReAct iteration. Counts/summaries come from aggregate tools; a list
// tool rarely needs more than the first ~6–12 rows verbatim for synthesis.
const TOOL_RESULT_MAX_CHARS = 6_000;
/** Cap the JSON view fed back to the model to bound token cost. */
function truncateForModel(data: unknown): string {
  const json = JSON.stringify(data);
  return json.length > TOOL_RESULT_MAX_CHARS ? `${json.slice(0, TOOL_RESULT_MAX_CHARS)}…(đã cắt)` : json;
}

/**
 * P1.1 — cap the accumulated within-turn tool-result history by CHAR BUDGET so
 * the ReAct loop stops re-billing every prior tool result on each callMiniMax
 * (the dominant 59k-tokens/turn driver — each call is billed for its full prompt
 * context, and `messages` only ever grows). PROTOCOL-SAFE: it drops only
 * COMPLETE units (one assistant(tool_calls) message + ALL its tool replies),
 * because a `tool_calls` turn with a missing `tool` reply is an OpenAI 400.
 * The seed (system + prior history + current user message) and the most recent
 * units are always kept, so normal 1–2-tool turns never lose synthesis data;
 * trimming only fires on genuinely long turns, and never below KEEP_RECENT.
 */
const TOOL_HISTORY_BUDGET_CHARS = 24_000; // ~6k tokens of tool history before trimming kicks in
const KEEP_RECENT_TOOL_UNITS = 2;
export function trimToolHistory(messages: MiniMaxMessage[]): MiniMaxMessage[] {
  // Everything before the first assistant(tool_calls) is the seed — always keep.
  const firstToolUnitIdx = messages.findIndex(
    (m) => m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0,
  );
  if (firstToolUnitIdx < 0) return messages; // no tool history accumulated yet
  const seed = messages.slice(0, firstToolUnitIdx);

  // Group the tail into units: each unit = [assistant(tool_calls), ...its tool replies].
  const units: MiniMaxMessage[][] = [];
  for (const m of messages.slice(firstToolUnitIdx)) {
    if (m.role === 'assistant') {
      units.push([m]);
    } else {
      const cur = units[units.length - 1];
      if (cur) cur.push(m);
      else units.push([m]); // defensive: tool reply with no preceding assistant
    }
  }

  // Drop oldest complete units until under budget, but never below KEEP_RECENT.
  while (units.length > KEEP_RECENT_TOOL_UNITS) {
    if (JSON.stringify(units.flat()).length <= TOOL_HISTORY_BUDGET_CHARS) break;
    units.shift();
  }
  return [...seed, ...units.flat()];
}

// ── Persistence ────────────────────────────────────────────────────────────
// Returns BOTH the conversationId AND the newly inserted assistant messageId.
// The messageId is the PK of the agent_turn_metrics row written by runAgent.
async function persistTurn(opts: {
  ctx: AgentContext;
  userMessage: string;
  response: AgentResponse;
  toolTrace: unknown[];
  conversationId?: string;
  promptTokens: number;
  completionTokens: number;
}): Promise<{ conversationId: string | undefined; messageId: number | undefined }> {
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
  // .returning on the ASSISTANT insert only — that's the row whose id is the
  // metrics PK. (The user-message insert above has no metrics row.)
  const [assistantRow] = await db
    .insert(schema.agentMessages)
    .values({
      conversationId: Number(conversationId),
      role: 'assistant',
      response: opts.response,
      toolTrace: opts.toolTrace,
      directives,
      tokensIn: opts.promptTokens,
      tokensOut: opts.completionTokens,
    })
    .returning({ id: schema.agentMessages.id });

  await db
    .update(schema.agentConversations)
    .set({ updatedAt: new Date() })
    .where(eq(schema.agentConversations.id, Number(conversationId)));

  return { conversationId, messageId: assistantRow?.id };
}
