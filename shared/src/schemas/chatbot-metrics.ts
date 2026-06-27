/**
 * Chatbot (agent) performance monitoring — shared types for the ADMIN
 * aggregation API (backend/src/routes/admin-chatbot-metrics.ts) and the
 * frontend dashboard (Phase 5).
 *
 * These are plain TypeScript interfaces (not Zod schemas): the metrics API is
 * read-only and ADMIN-gated, so response validation is unnecessary. The shape
 * is the contract both ends compile against.
 *
 * Null-safety contract: percentile_cont / AVG over empty or all-null sets
 * return NULL — preserve it. The frontend renders '—' for nulls; never coerce
 * to 0 here (0 is a valid, meaningful value for latency/error rates).
 */

/** SLA bands for the user-perceived latency gauge. p95 <= green is healthy. */
export interface ChatbotSlaThresholds {
  p95GreenMs: number;
  p95AmberMs: number;
}

/** Top-level summary card for the dashboard header. */
export interface ChatbotMetricSummary {
  turns: number;
  activeUsers: number;
  userPerceived: {
    p50Ms: number | null;
    p95Ms: number | null;
    p99Ms: number | null;
  };
  modelPipeline: {
    p50Ms: number | null;
    p95Ms: number | null;
    p99Ms: number | null;
  };
  errorRate: number;
  timeoutRate: number;
  fallbackRate: number;
  abortRate: number;
  /** Fraction of turns that emitted a navigate/focus directive (model OR the
   *  A3 guardrail). High = the bot reliably takes users to the right page. */
  navigateRate: number;
  /** Fraction of turns where the A3 guardrail synthesized the navigate because
   *  the model wrote a destination path in prose instead of calling ui.navigate.
   *  Low = the model complies with the "don't write paths" rule on its own. */
  guardrailRate: number;
  avgIterations: number | null;
  avgToolCallsPerTurn: number | null;
  tokensIn: number;
  tokensOut: number;
  sla: ChatbotSlaThresholds;
}

/** Average of each pipeline stage latency (latency_*_ms columns). */
export interface ChatbotLatencyBreakdown {
  llmMs: number | null;
  toolsMs: number | null;
  finalMs: number | null;
  ackMs: number | null;
  persistMs: number | null;
}

/** One row in the timeseries chart (daily aggregation). */
export interface ChatbotMetricDay {
  date: string; // YYYY-MM-DD
  avgMs: number | null;
  p95Ms: number | null;
  turns: number;
}

/** Per-tool aggregate. p95Ms is null until per-call duration capture lands. */
export interface ChatbotToolStat {
  name: string;
  calls: number;
  p95Ms: number | null; // null until Phase-2 per-call instrumentation
  errorRate: number;
}

/** One row in the recent-turns table. */
export interface ChatbotRecentTurn {
  messageId: number;
  traceId: string | null;
  createdAt: string;
  role: string;
  latencyUserPerceivedMs: number | null;
  latencyTotalMs: number | null;
  errorKind: string | null;
  fallbackUsed: boolean;
  model: string;
  reactIterations: number | null;
  toolCallCount: number;
  userContent: string;
  assistantText: string | null;
}

/**
 * API path constants for the chatbot-metrics endpoints. Mounted under
 * `/api/admin/chatbot` in backend/src/index.ts. The leading `/metrics...`
 * paths are relative to that mount point.
 */
export const CHATBOT_METRICS_PATHS = {
  base: '/api/admin/chatbot',
  metrics: '/api/admin/chatbot/metrics',
  latency: '/api/admin/chatbot/metrics/latency',
  tools: '/api/admin/chatbot/metrics/tools',
  timeseries: '/api/admin/chatbot/metrics/timeseries',
  recent: '/api/admin/chatbot/metrics/recent',
} as const;
