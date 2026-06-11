/**
 * Profit Distribution Service
 *
 * Quarterly profit distribution to cap-table partners, distribution preview,
 * cap-table history, and distribution records.
 */

import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql, gte } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { ApiError } from '../errors';
import { localDateStr, quarterDateRange, resolveCapTableSnapshot } from './reporting-shared';

/**
 * Distribute net profit for a quarter to cap-table partners.
 */
export async function distributeProfit(quarter: number, year: number) {
  // Idempotency guard: prevent duplicate distributions for the same quarter/year.
  const existing = await db.select({ id: s.distributions.id })
    .from(s.distributions)
    .where(and(eq(s.distributions.quarter, quarter), eq(s.distributions.year, year)))
    .limit(1);
  if (existing.length > 0) {
    throw new ApiError(409, `Phân chia lợi nhuận Q${quarter}/${year} đã tồn tại`);
  }

  const plan = await computeDistribution(quarter, year);

  if (plan.distributions.length > 0) {
    await db.insert(s.distributions).values(plan.distributions.map(d => ({
      quarter: d.quarter,
      year: d.year,
      partnerName: d.partnerName,
      amount: d.amount,
    })));
  }

  return { quarter, year, netProfit: plan.netProfit, distributions: plan.distributions };
}

/**
 * Preview profit distribution without persisting.
 * Same logic as distributeProfit but returns the calculation without inserting.
 */
export async function previewDistribution(quarter: number, year: number) {
  const plan = await computeDistribution(quarter, year);
  return { quarter, year, netProfit: plan.netProfit, tripCount: plan.tripCount, distributions: plan.distributions };
}

/**
 * Fetch historical distribution records, grouped by quarter/year.
 */
export async function getDistributionHistory() {
  const rows = await db.select().from(s.distributions)
    .orderBy(desc(s.distributions.year), desc(s.distributions.quarter), desc(s.distributions.id));
  return rows;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Compute a profit distribution plan for a quarter.
 * Shared by both distributeProfit (persists) and previewDistribution (returns only).
 */
async function computeDistribution(quarter: number, year: number) {
  const capEntries = await db.select().from(s.capTableHistory)
    .orderBy(desc(s.capTableHistory.effectiveDate));

  const { start: qStart, end: qEnd } = await quarterDateRange(quarter, year);

  const trips = await db.select().from(s.trips).where(
    and(eq(s.trips.status, TripStatus.LOCKED), isNull(s.trips.deletedAt), gte(s.trips.departureDate, qStart), sql`${s.trips.departureDate} < ${qEnd}`)
  );

  const netProfit = trips.reduce((sum, t) => sum + parseFloat(t.grossProfit || '0'), 0);

  const today = localDateStr();
  const cutoff = qEnd > today ? today : qEnd;
  const activePartners = resolveCapTableSnapshot(capEntries, cutoff);

  if (activePartners.length === 0) {
    throw new ApiError(400, 'Chưa có dữ liệu cổ đông. Vui lòng vào "Cấu hình → Cổ phần" và thêm vốn góp trước khi phân chia lợi nhuận.');
  }

  // Compute per-partner share using floor, then assign remainder to the last
  // partner. This guarantees sum(distributions) == netProfit exactly, avoiding
  // the rounding over-allocation bug (e.g. two 50% partners × 7₫ = 4+4=8₫).
  let allocated = 0;
  const distributions = activePartners.map((entry, i) => {
    const isLast = i === activePartners.length - 1;
    const raw = netProfit * entry.percentage / 100;
    const amount = isLast ? Math.round(netProfit - allocated) : Math.floor(raw);
    allocated += amount;
    return {
      quarter,
      year,
      partnerName: entry.partnerName,
      percentage: String(entry.percentage),
      amount: String(amount),
    };
  });

  return { netProfit, tripCount: trips.length, distributions };
}
