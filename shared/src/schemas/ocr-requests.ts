/**
 * API shapes for the AI OCR request log (ticket NEPO-33, screen NEPO-34).
 *
 * The log answers "what did the AI answer, with which model, how long did it
 * take" — the three questions the daily usage counter cannot answer.
 */
import { z } from 'zod';

/** Outcome of one logged OCR request. */
export type OcrRequestStatus = 'completed' | 'failed';

/** One logged OCR request. */
export interface OcrRequestRow {
  id: number;
  /** Request time — ISO 8601. */
  created_at: string;
  /** Response time — ISO 8601. */
  updated_at: string;
  /** Wall-clock duration of the request, in milliseconds. */
  duration_ms: number;
  /** The model that answered, or null when none did. */
  model: string | null;
  status: OcrRequestStatus;
  /** The OCR answer as JSON text, or null when the request never got that far. */
  response: string | null;
  /** Why the request failed, or null on success. */
  error_msg: string | null;
  /** The caller, or null when the account was deleted. */
  user_id: number | null;
  /** Caller display name (full name → username → email), or null when the account is gone. */
  user_name: string | null;
}

/** Aggregate timings over the log. */
export interface OcrRequestStats {
  count: number;
  failed: number;
  /** Average duration, or null when nothing was logged. */
  avgDurationMs: number | null;
  /** 95th-percentile duration, or null when nothing was logged. */
  p95DurationMs: number | null;
}

/** Row counts per status — the filter pills' denominators. */
export interface OcrRequestCounts {
  all: number;
  completed: number;
  failed: number;
}

/**
 * List query filters (NEPO-34). Dates are local calendar days ('YYYY-MM-DD'):
 * `dateFrom` is inclusive, `dateTo` is inclusive of that whole day.
 */
export const ocrRequestListQuerySchema = z.object({
  status: z.enum(['completed', 'failed']).optional(),
  model: z.string().trim().min(1).max(200).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có dạng YYYY-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có dạng YYYY-MM-DD')
    .optional(),
});

export type OcrRequestFilters = z.infer<typeof ocrRequestListQuerySchema>;

/** GET /api/admin/ocr-requests — a page of logged requests + the aggregates. */
export interface OcrRequestListResponse {
  rows: OcrRequestRow[];
  /** Total number of logged requests matching the filters — the pagination denominator. */
  total: number;
  limit: number;
  offset: number;
  stats: OcrRequestStats;
  /** Counts per status (scoped by model + date filters, not by status) — the filter pills. */
  counts: OcrRequestCounts;
  /** Distinct model slugs in the log — the model filter's options. */
  models: string[];
}
