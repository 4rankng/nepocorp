/**
 * Read the AI OCR request log (ticket NEPO-33).
 *
 * RBAC: mounted with `requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT)`
 * in index.ts — the same roles that see the OCR usage tile on the dashboard.
 * The log holds the OCR answers and their timings, which is the financial
 * picture of the AI spend, not a driver-portal concern. DRIVER is excluded:
 * a driver sees their own trips, not the fleet's AI telemetry.
 *
 * Read-only: the log is written by the OCR route itself and is never edited or
 * deleted through the API.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { OcrRequestListResponse } from '@tingting/shared';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  countOcrRequests,
  getOcrRequestStats,
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

/**
 * GET /api/admin/ocr-requests — the logged OCR requests, newest first.
 *
 * Query: `limit` (1..200, default 50) and `offset` (default 0). The response
 * carries the rows plus the aggregate timings (count, failures, average and
 * p95 duration over the last 30 days) so one call answers both "show me the
 * requests" and "is OCR slow".
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const limit = intParam(req.query.limit, 50, 1, MAX_LIMIT);
  const offset = intParam(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  const [rows, stats, total] = await Promise.all([
    listOcrRequests(limit, offset),
    getOcrRequestStats(30),
    countOcrRequests(),
  ]);

  const body: OcrRequestListResponse = { rows, total, limit, offset, stats };
  res.json(body);
}));

export default router;
