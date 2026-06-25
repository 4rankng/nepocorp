import { z } from 'zod';

/**
 * Agent (command-and-insight assistant) wire contract.
 *
 * This is the single source of truth for what travels between the backend
 * orchestrator (MiniMax) and the frontend drawer. Three layers:
 *
 *   1. Directive      — how the agent drives the UI (navigate/focus/open/prefill)
 *   2. Widget         — a typed, natively-rendered card building block
 *   3. AgentResponse  — the assistant's final answer: text | insight_card | directive
 *
 * Kept in `shared` (not the flat `schemas/index.ts`, which is already 800+
 * lines of entity CRUD) because this is a self-contained, cross-boundary
 * contract consumed by both `@tingting/backend` and `@tingting/frontend`.
 *
 * Design rules:
 *   - Every multi-variant type is a `discriminatedUnion` so the renderer /
 *     consumer switches exhaustively on one field.
 *   - `format` on numeric widgets drives RENDERING (vnd / percent / number /
 *     days) — the value itself is always a plain number. The LLM must never
 *     embed pre-formatted strings (it would defeat locale + consistency); the
 *     backend Zod-validates and the system prompt enforces "numbers only".
 */

// ─── Route keys the agent may navigate to ──────────────────────────────────
// This is the CLOSED set the LLM chooses from + the backend validates against
// role (R9). It is the *agent's* view of navigable office-staff destinations;
// the frontend directive bridge resolves each key to an actual `routes.ts`
// path. Keep this in sync when adding a new office page the agent should reach.
export const AGENT_ROUTE_KEYS = [
  // Top-level
  'dashboard',
  'dispatch',
  'fleet',
  'trips',
  'tripNew',
  'tripDetail',
  'tripEdit',
  // Finance
  'finance',
  'profit',
  'debt',
  'debtDetail',
  'payables',
  'payableDetail',
  'penalties',
  'advances',
  'adminAdvanceSettlements',
  'salary',
  'expenses',
  'expenseNew',
  'expenseEdit',
  // Catalogs
  'customers',
  'suppliers',
  'config',
  'configCustomers',
  'configRoutes',
  'configTrucks',
  'configTrailers',
  'configFuel',
  'configSalaryPeriods',
  // Admin
  'users',
  'auditLogs',
] as const;

export type AgentRouteKey = (typeof AGENT_ROUTE_KEYS)[number];

export const agentRouteKeySchema = z.enum(AGENT_ROUTE_KEYS);

// ─── Directive (UI driver) ─────────────────────────────────────────────────
// Discriminator is `kind` so the frontend switch is exhaustive. `navigate`/
// `focus` target a registered page; `open`/`prefill` target a per-page
// component (modal/drawer/form) registered via `useAgentOpenable`.
const directiveParamsSchema = z
  .record(z.string(), z.union([z.string(), z.number()]))
  .optional();

export const agentDirectiveSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('navigate'),
    routeKey: agentRouteKeySchema,
    params: directiveParamsSchema,
  }),
  z.object({
    kind: z.literal('focus'),
    /** Navigate then scroll-to + highlight a row (reuses the `?focus=` pattern). */
    routeKey: agentRouteKeySchema,
    id: z.union([z.string(), z.number()]),
    prefix: z.string().optional(),
  }),
  z.object({
    kind: z.literal('open'),
    /** componentId matches a handler registered in the target page's useAgentOpenable. */
    componentId: z.string().min(1),
    prefill: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    kind: z.literal('prefill'),
    componentId: z.string().min(1),
    values: z.record(z.string(), z.unknown()),
  }),
]);

export type AgentDirective = z.infer<typeof agentDirectiveSchema>;

// ─── Widgets ───────────────────────────────────────────────────────────────
export const widgetFormatSchema = z.enum(['vnd', 'percent', 'number', 'days']);
export type WidgetFormat = z.infer<typeof widgetFormatSchema>;

export const agentWidgetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('kpi_grid'),
    items: z
      .array(
        z.object({
          label: z.string(),
          /** Always a raw number; `format` decides how it is rendered. */
          value: z.number(),
          format: widgetFormatSchema,
          /** Optional prior/compare value, same format — rendered as a delta. */
          delta: z.number().optional(),
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal('bar_chart'),
    title: z.string().optional(),
    data: z.array(z.object({ name: z.string(), value: z.number() })),
    format: widgetFormatSchema.optional(),
  }),
  z.object({
    type: z.literal('line_chart'),
    title: z.string().optional(),
    series: z.array(
      z.object({
        name: z.string(),
        points: z.array(z.object({ x: z.union([z.string(), z.number()]), y: z.number() })),
      }),
    ),
  }),
  z.object({
    type: z.literal('table'),
    title: z.string().optional(),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.union([z.string(), z.number()]))),
  }),
  z.object({
    type: z.literal('callout'),
    variant: z.enum(['info', 'warning', 'danger']),
    text: z.string(),
  }),
  z.object({
    type: z.literal('anomaly_list'),
    items: z.array(
      z.object({
        label: z.string(),
        detail: z.string(),
        severity: z.enum(['low', 'med', 'high']),
      }),
    ),
  }),
]);

export type AgentWidget = z.infer<typeof agentWidgetSchema>;

// ─── Action chips (card-level shortcuts that fire a directive) ─────────────
export const agentActionChipSchema = z.object({
  label: z.string(),
  directive: agentDirectiveSchema,
});
export type AgentActionChip = z.infer<typeof agentActionChipSchema>;

// ─── Final response ────────────────────────────────────────────────────────
export const agentResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({
    type: z.literal('insight_card'),
    title: z.string(),
    /** One- or two-sentence cause/answer the LLM composes from tool numbers. */
    summary: z.string(),
    widgets: z.array(agentWidgetSchema).min(1),
    actions: z.array(agentActionChipSchema).optional(),
  }),
  z.object({ type: z.literal('directive'), directive: agentDirectiveSchema }),
]);

export type AgentResponse = z.infer<typeof agentResponseSchema>;

// ─── Conversation persistence (GET /conversations[/:id]) ───────────────────
export const agentMessageRoleSchema = z.enum(['user', 'assistant']);

export const agentMessageSchema = z.object({
  id: z.string(),
  role: agentMessageRoleSchema,
  /** Present for user turns and for assistant `text` responses. */
  content: z.string().optional(),
  /** Present for assistant turns whose answer was a card or directive. */
  response: agentResponseSchema.optional(),
  createdAt: z.string(),
});
export type AgentMessage = z.infer<typeof agentMessageSchema>;

export const agentConversationSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  messages: z.array(agentMessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AgentConversation = z.infer<typeof agentConversationSchema>;

// ─── SSE event stream ──────────────────────────────────────────────────────
// POST /api/agent/chat streams `text/event-stream` whose `data:` payloads are
// one of these. The frontend parses with `agentEventSchema` for type safety.
export const agentEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('tool_start'),
    toolName: z.string(),
    /** Echo of the args the LLM chose (truncated/summarised for display). */
    args: z.unknown().optional(),
  }),
  z.object({
    event: z.literal('tool_result'),
    toolName: z.string(),
    toolCallId: z.string().optional(),
    ok: z.boolean(),
    /** Short human label of what was returned, for the "thinking" indicator. */
    label: z.string().optional(),
  }),
  z.object({
    event: z.literal('directive'),
    directive: agentDirectiveSchema,
  }),
  z.object({
    event: z.literal('done'),
    response: agentResponseSchema,
    /** Set on the first turn — the id of the conversation that was created/used. */
    conversationId: z.string().optional(),
  }),
  z.object({
    event: z.literal('error'),
    message: z.string(),
  }),
]);

export type AgentEvent = z.infer<typeof agentEventSchema>;
