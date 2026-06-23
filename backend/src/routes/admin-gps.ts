/**
 * Admin GPS endpoints — seed + repair the real-route database.
 *
 * With Google Directions retired, a trip's map is blank until its real GPS trail
 * is captured. The completion hook captures new trips automatically; these
 * endpoints handle the backlog (backfill) and one-off repairs (recapture).
 * RBAC: gps-admin action (ADMIN + MANAGER only) — applied at mount time.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { and, inArray, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { asyncHandler } from '../middleware/asyncHandler';
import { captureTripGpsTrack, type CaptureResult } from '../services/gps/capture.service';

const router = Router();

/**
 * POST /api/admin/gps/backfill
 * Derive real GPS routes for historical COMPLETED/LOCKED trips. Iterates
 * SEQUENTIALLY (one provider window per trip — don't hammer Bách Khoa), each
 * trip isolated so one failure can't abort the run.
 *
 * Body: { dateFrom?, dateTo?, tripIds?: number[] }
 *   - tripIds given  → only those trips (any status except CANCELED is attempted)
 *   - else           → all COMPLETED/LOCKED trips with departureDate in [dateFrom, dateTo]
 */
router.post('/backfill', asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, tripIds } = (req.body ?? {}) as {
    dateFrom?: string;
    dateTo?: string;
    tripIds?: number[];
  };

  const conds = [inArray(schema.trips.status, ['COMPLETED', 'LOCKED'])];
  if (tripIds && tripIds.length) {
    conds.push(inArray(schema.trips.id, tripIds));
  } else if (dateFrom && dateTo) {
    // departureDate is a PgDateString (YYYY-MM-DD) — string compare is chronological for ISO dates.
    conds.push(gte(schema.trips.departureDate, dateFrom));
    conds.push(lte(schema.trips.departureDate, dateTo));
  }

  const trips = await db.select({ id: schema.trips.id })
    .from(schema.trips)
    .where(and(...conds))
    .orderBy(schema.trips.id);

  let ok = 0, partial = 0, failed = 0, empty = 0;
  const failures: Array<{ tripId: number; errorKind?: string }> = [];
  for (const t of trips) {
    const r: CaptureResult = await captureTripGpsTrack(t.id); // never throws
    if (r.status === 'ok') ok++;
    else if (r.status === 'partial') partial++;
    else if (r.status === 'empty') empty++;
    else { failed++; failures.push({ tripId: t.id, errorKind: r.errorKind }); }
  }

  res.json({
    total: trips.length,
    ok,
    partial,
    empty,
    failed,
    failures,
  });
}));

/**
 * POST /api/admin/gps/recapture/:tripId
 * Force re-capture + re-derive for one trip — overwrites its trip_gps_tracks row
 * and refreshes route_polylines for its pairs. Escape hatch for a trip whose
 * initial capture failed or whose displayed route looks wrong.
 */
router.post('/recapture/:tripId', asyncHandler(async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.tripId as string, 10);
  if (!Number.isFinite(tripId)) {
    res.status(400).json({ error: 'tripId không hợp lệ' });
    return;
  }
  const result = await captureTripGpsTrack(tripId);
  res.json(result);
}));

export default router;
