// Per-request log of the AI OCR pipeline (ticket NEPO-33, screen NEPO-34).
//
// The daily counter in `ocr-usage.service.ts` answers "how many requests";
// this log answers "what did the AI answer, with which model, and how long did
// it take" — the three questions the counter cannot answer.
//
// One row per OCR request, written ONCE when the response is ready. The row is
// INSERTed with an explicit `created_at` (the request start) and `updated_at`
// (the response time), so the gap between them is the user-perceived latency
// and the two timestamps answer "when was it asked" / "when did it answer"
// without any extra column.
//
// Nothing here may break an OCR: a driver is standing in front of the phone.
// Every write is wrapped so a logging failure only logs.
import { db } from '../db';
import * as s from '../db/schema';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  OcrRequestCounts,
  OcrRequestFilters,
  OcrRequestRow,
  OcrRequestStatus,
} from '@tingting/shared';

/** Outcome of one OCR request. */
export type { OcrRequestStatus };

/** Everything one OCR request contributes to its log row. */
export interface OcrRequestLogInput {
  /** Request start — written as `created_at`. */
  createdAt: Date;
  /** Response time — written as `updated_at`. */
  updatedAt: Date;
  /** Wall-clock duration of the request, in milliseconds. */
  durationMs: number;
  /** The model that answered. Null when no provider did. */
  model: string | null;
  /** Whether the recognition succeeded. */
  status: OcrRequestStatus;
  /** The OCR answer as JSON text. Null when the request never got that far. */
  response: string | null;
  /** Why the request failed. Null on success. */
  errorMsg: string | null;
  /** The caller. */
  userId: number | null;
}

/**
 * Write one OCR request log row.
 *
 * Never throws: a counter hiccup must not fail an OCR the driver is standing
 * in front of. The failure is logged and swallowed.
 */
export async function recordOcrRequestLog(input: OcrRequestLogInput): Promise<void> {
  try {
    await db.insert(s.ocrRequests).values({
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      durationMs: input.durationMs,
      model: input.model,
      status: input.status,
      response: input.response,
      errorMsg: input.errorMsg,
      userId: input.userId,
    });
  } catch (error) {
    console.error('[ocr-requests] failed to write the request log:', error);
  }
}

/** One logged OCR request, as the list endpoint returns it. */
export type OcrRequestListItem = OcrRequestRow;

/**
 * WHERE conditions for the NEPO-34 filters. Dates are local calendar days:
 * `dateFrom` is inclusive, `dateTo` covers that whole day (same idiom as
 * `advance.service.ts`). `withStatus` is false for the filter-pill counts,
 * which must show what each status option would return.
 */
function buildConditions(filters: OcrRequestFilters | undefined, withStatus: boolean): SQL[] {
  const conditions: SQL[] = [];
  if (withStatus && filters?.status) conditions.push(eq(s.ocrRequests.status, filters.status));
  if (filters?.model) conditions.push(eq(s.ocrRequests.model, filters.model));
  if (filters?.dateFrom) conditions.push(sql`${s.ocrRequests.createdAt} >= ${filters.dateFrom}::date`);
  if (filters?.dateTo) {
    conditions.push(sql`${s.ocrRequests.createdAt} < (${filters.dateTo}::date + interval '1 day')`);
  }
  return conditions;
}

/**
 * The logged OCR requests, newest first.
 *
 * `limit` is clamped to 1..200 so a caller cannot ask for the whole table by
 * accident; `offset` pages through it. The query is ordered by id DESC (not
 * created_at) because id is the insert order — two requests that started in the
 * same millisecond still get a stable, monotonic order.
 */
export async function listOcrRequests(
  limit: number,
  offset: number,
  filters?: OcrRequestFilters,
): Promise<OcrRequestListItem[]> {
  const conditions = buildConditions(filters, true);
  const rows = await db
    .select({
      id: s.ocrRequests.id,
      created_at: s.ocrRequests.createdAt,
      updated_at: s.ocrRequests.updatedAt,
      duration_ms: s.ocrRequests.durationMs,
      model: s.ocrRequests.model,
      status: s.ocrRequests.status,
      response: s.ocrRequests.response,
      error_msg: s.ocrRequests.errorMsg,
      user_id: s.ocrRequests.userId,
      // The screen shows people, not ids (design-guidelines § No Raw IDs):
      // full name → username → email, null when the account is gone.
      user_name: sql<string | null>`COALESCE(${s.users.fullName}, ${s.users.username}, ${s.users.email})`,
    })
    .from(s.ocrRequests)
    .leftJoin(s.users, eq(s.ocrRequests.userId, s.users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(s.ocrRequests.id))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    ...row,
    // The column is a varchar with a CHECK that allows only these two values,
    // so the cast is safe — Drizzle cannot know that from the column type.
    status: row.status as OcrRequestStatus,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }));
}

/** How many logged requests match the filters — the pagination denominator. */
export async function countOcrRequests(filters?: OcrRequestFilters): Promise<number> {
  const conditions = buildConditions(filters, true);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(s.ocrRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  return row?.count ?? 0;
}

/**
 * Counts per status for the filter pills. Scoped by model + date like the
 * listing, but NOT by status — each pill shows what selecting it would return.
 */
export async function countOcrRequestsByStatus(
  filters?: OcrRequestFilters,
): Promise<OcrRequestCounts> {
  const conditions = buildConditions(filters, false);
  const rows = await db
    .select({ status: s.ocrRequests.status, count: sql<number>`count(*)::int` })
    .from(s.ocrRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(s.ocrRequests.status);

  const counts: OcrRequestCounts = { all: 0, completed: 0, failed: 0 };
  for (const row of rows) {
    if (row.status === 'completed' || row.status === 'failed') counts[row.status] = row.count;
    counts.all += row.count;
  }
  return counts;
}

/**
 * Distinct model slugs seen in the log — the model filter's options.
 * Ordered so the dropdown is stable between renders.
 */
export async function listOcrRequestModels(): Promise<string[]> {
  const rows = await db
    .select({ model: s.ocrRequests.model })
    .from(s.ocrRequests)
    .where(sql`${s.ocrRequests.model} is not null`)
    .groupBy(s.ocrRequests.model)
    .orderBy(s.ocrRequests.model);
  return rows.map((r) => r.model).filter((m): m is string => m !== null);
}

/**
 * The average and the p95 duration of the logged requests, plus how many
 * failed — the three numbers that answer "is OCR slow / is it broken".
 *
 * `percentile_cont` is the interpolated percentile, so p95 of 10 samples is
 * not simply the 10th slowest one. The window is the last `sinceDays` days.
 */
export async function getOcrRequestStats(sinceDays = 30): Promise<{
  count: number;
  failed: number;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
}> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      failed: sql<number>`count(*) filter (where ${s.ocrRequests.status} = 'failed')::int`,
      avgDurationMs: sql<number | null>`avg(${s.ocrRequests.durationMs})`,
      p95DurationMs: sql<number | null>`percentile_cont(0.95) within group (order by ${s.ocrRequests.durationMs})`,
    })
    .from(s.ocrRequests)
    .where(sql`${s.ocrRequests.createdAt} >= now() - (${sinceDays} * interval '1 day')`);

  return {
    count: row?.count ?? 0,
    failed: row?.failed ?? 0,
    avgDurationMs: row?.avgDurationMs == null ? null : Math.round(row.avgDurationMs),
    p95DurationMs: row?.p95DurationMs == null ? null : Math.round(row.p95DurationMs),
  };
}
