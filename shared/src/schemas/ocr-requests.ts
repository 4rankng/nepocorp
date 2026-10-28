/**
 * API shapes for the AI OCR request log (ticket NEPO-33).
 *
 * The log answers "what did the AI answer, with which model, how long did it
 * take" — the three questions the daily usage counter cannot answer.
 */

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

/** GET /api/admin/ocr-requests — a page of logged requests + the aggregates. */
export interface OcrRequestListResponse {
  rows: OcrRequestRow[];
  /** Total number of logged requests — the pagination denominator. */
  total: number;
  limit: number;
  offset: number;
  stats: OcrRequestStats;
}
