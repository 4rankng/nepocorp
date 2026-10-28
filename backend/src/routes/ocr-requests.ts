/**
 * Read the AI OCR request log (ticket NEPO-33, screen NEPO-34).
 *
 * RBAC: mounted with `requireRoles(Role.ADMIN)` in index.ts — NEPO-34 locks
 * the screen to ADMIN at three layers (route guard, nav, this API): the log
 * holds raw AI answers and the fleet's AI telemetry, and the owner ruled the
 * screen admin-only. This is a deliberate tightening over NEPO-33 AC-05
 * (ADMIN/MANAGER/ACCOUNTANT); everyone else gets 403.
 *
 * Read-only: the log is written by the OCR route itself and is never edited or
 * deleted through the API.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  ocrRequestListQuerySchema,
  type OcrRequestListResponse,
} from '@tingting/shared';
import { ApiError } from '../errors';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  countOcrRequests,
  countOcrRequestsByStatus,
  getOcrRequestStats,
  listOcrRequestModels,
  listOcrRequests,
} from '../services/ocr-requests.service';

const router = Router();

/** Page size bounds — a caller cannot pull the whole table by accident. */
const MAX_LIMIT = 200;

/** Parse a positive integer query param, falling back to `fallback`. */
function intParam(raw: unknown, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** A trimmed query string, or undefined when absent/blank. */
function strParam(raw: unknown): string | undefined {
  const v = typeof raw === 'string' ? raw.trim() : '';
  return v === '' ? undefined : v;
}

/**
 * GET /api/admin/ocr-requests — the logged OCR requests, newest first.
 *
 * Query: `limit` (1..200, default 50), `offset` (default 0), plus the NEPO-34
 * filters `status` ('completed'|'failed'), `model`, `dateFrom`/`dateTo`
 * (YYYY-MM-DD local calendar days, both inclusive; the `date_from`/`date_to`
 * spellings are accepted too). Invalid filter values answer 400 instead of
 * silently returning an unfiltered page — a typo'd filter must not look like
 * "no results".
 *
 * The response carries the rows plus the aggregates (stats over the last 30
 * days, per-status pill counts scoped by model+date, and the distinct model
 * options) so one call feeds the whole screen.
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const limit = intParam(req.query.limit, 50, 1, MAX_LIMIT);
  const offset = intParam(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  const parsed = ocrRequestListQuerySchema.safeParse({
    status: strParam(req.query.status),
    model: strParam(req.query.model),
    dateFrom: strParam(req.query.dateFrom ?? req.query.date_from),
    dateTo: strParam(req.query.dateTo ?? req.query.date_to),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, issue?.message ?? 'Tham số lọc không hợp lệ');
  }
  const filters = parsed.data;

  const [rows, stats, total, counts, models] = await Promise.all([
    listOcrRequests(limit, offset, filters),
    getOcrRequestStats(30),
    countOcrRequests(filters),
    countOcrRequestsByStatus(filters),
    listOcrRequestModels(),
  ]);

  const body: OcrRequestListResponse = { rows, total, limit, offset, stats, counts, models };
  res.json(body);
}));

export default router;
