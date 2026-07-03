/**
 * A8 / GAP 8b — P&L invariant regression (feedback202606).
 *
 * Integration test against the dev DB. Exercises the REAL `getPnlReport`
 * (cache bypassed so assertions hit fresh values, not a stale cache) and
 * pins three load-bearing financial invariants on the returned structure:
 *
 *   (a) Σ own-truck profit == adjustedGrossProfit.
 *       Scoped to OWN trucks only (`truck.id !== 0`). The "Xe ngoài" external
 *       bucket folds external carrier margin INTO its `profit` while
 *       adjustedGrossProfit counts OWN trips only
 *       (pnl.service.ts:36) — so the literal "Σ all trucks" form is FALSE when
 *       external trips exist. This is the own/external asymmetry flagged by the
 *       Critic; scoping to own trucks makes the invariant true and meaningful.
 *
 *   (b) Penalty income enters the books exactly once — in `otherIncome`, which
 *       flows into `netProfit` via the single documented formula
 *       `netProfit = adjustedGrossProfit − managementFee − companyExpenses + otherIncome`
 *       (pnl.service.ts:178). Penalties must never also be folded into a truck's
 *       `profit` (they would then double-count). Invariant (a) guarantees the
 *       truck-profit side excludes them; the algebraic netProfit check below
 *       guarantees the single-entry side.
 *
 *   (c) Ancillary service/ocean-fee margin is intentionally excluded from
 *       transport P&L. Those amounts feed debit notes and customer AR only.
 *
 * Tolerance: VND is integer (numeric scale 0). Revenue is rounded per-trip for
 * VAT stripping (pnl.service.ts:64), so Σ per-trip-rounded grossProfit can drift
 * from round(aggregate) by up to ~1 per VAT-rated trip. Tolerance scales with
 * trip count; a real bug (double-count, sign flip, dropped maintenance) is off
 * by thousands+ and still trips the assertion.
 *
 * Plan ref: feedback202606 finalization plan §2 (A8).
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { db, client } from '../db';
import * as s from '../db/schema';
import { and, isNull, ne, sql } from 'drizzle-orm';
import { TripStatus } from '@tingting/shared';
import { getPnlReport } from '../services/pnl.service';
import { cacheInvalidate, disconnectRedis } from '../lib/redis';

interface PnlReport {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number; // == adjustedGrossProfit
  managementFee: number;
  otherIncome: number;
  companyExpenses: number;
  netProfit: number;
  serviceMarginTotal: number;
  trucks: Array<{
    id: number;
    plate: string;
    revenue: number;
    costs: number;
    profit: number;
    trips: number;
    serviceMargin?: number;
    externalMargin?: number;
    maintenanceExpenses: number;
  }>;
}

let period: { month: number; year: number } | null = null;
let report: PnlReport | null = null;
let ownTripCount = 0;

before(async () => {
  // Discover the most recent month that has revenue-bearing OWN trips, so the
  // test is meaningful regardless of which period holds data.
  const yr = sql<number>`extract(year from ${s.trips.departureDate})::int`;
  const mo = sql<number>`extract(month from ${s.trips.departureDate})::int`;
  const [row] = await db.select({ year: yr, month: mo, n: sql<number>`count(*)::int` })
    .from(s.trips)
    .where(and(
      isNull(s.trips.deletedAt),
      ne(s.trips.status, TripStatus.CANCELED),
      sql`coalesce(${s.trips.carrierType}, 'OWN') = 'OWN'`,
      sql`${s.trips.truckId} IS NOT NULL`,
      sql`coalesce(${s.trips.revenue}, '0')::numeric > 0`,
    ))
    .groupBy(yr, mo)
    .orderBy(sql`max(${s.trips.departureDate}) DESC`)
    .limit(1);

  if (!row) return; // no data — tests below skip gracefully
  period = { month: Number(row.month), year: Number(row.year) };

  // Bypass the cache so we assert fresh values, not a stale cached report.
  await cacheInvalidate(`reports:pnl:${period.month}:${period.year}`);
  const r = await getPnlReport(period.month, period.year) as PnlReport;
  report = r;
  ownTripCount = r.trucks.filter(t => t.id !== 0).reduce((a, t) => a + t.trips, 0);

});

after(async () => {
  await disconnectRedis();
  await client.end();
});

// Tolerance scales with trip count (per-trip VAT-stripping rounding); floor 50.
const tolerance = () => Math.max(50, ownTripCount * 2);

describe('A8 — P&L invariants (integration, dev DB)', () => {
  test('fixture: a data-rich period was found', () => {
    if (!period || !report) {
      console.log('   [skip] no revenue-bearing OWN trips in DB — nothing to assert');
      assert.ok(true, 'no data; invariants vacuously hold');
      return;
    }
    assert.ok(period.month >= 1 && period.month <= 12);
    assert.ok(report.trucks.length >= 0);
  });

  test('(a) Σ OWN-truck costs == report.totalCosts (maintenance counted exactly once)', () => {
    if (!report || ownTripCount === 0) { assert.ok(true, 'no own trucks'); return; }
    // Real "no double-count" guard. Both sides read the STORED trips.totalCost
    // (not a stale derived value), so this reconciles where profit cannot (see
    // a.div). Own-truck `costs` = Σ trip.totalCost + maintenanceExpenses
    // (pnl.service.ts:152,:170); report.totalCosts = adjustedTotalCosts =
    // Σ trip.totalCost + totalMaintenance (pnl.service.ts:177). Maintenance must
    // appear exactly once — never zero, never twice.
    const ownTrucks = report.trucks.filter(t => t.id !== 0);
    const sumOwnCosts = ownTrucks.reduce((a, t) => a + t.costs, 0);
    const diff = Math.abs(sumOwnCosts - report.totalCosts);
    assert.ok(
      diff <= tolerance(),
      `Σ own-truck costs (${sumOwnCosts}) must equal report.totalCosts (${report.totalCosts}); diff=${diff} (maintenance double/under-counted?)`,
    );
  });

  test('(a.div) Σ OWN-truck profit == adjustedGrossProfit (fresh recompute, no stale grossProfit)', () => {
    if (!report || ownTripCount === 0) { assert.ok(true, 'no own trucks'); return; }
    // Per-truck profit must be recomputed from current revenue/cost/service
    // fee inputs, not the denormalized trips.grossProfit column. This catches
    // revenue edits that would otherwise leave the truck breakdown stale.
    // Remediation path: backend/scripts/recost-gross-profit.ts (dry-run recost
    // analyzer; sign-off-gated --apply).
    const ownTrucks = report.trucks.filter(t => t.id !== 0);
    const sumOwnProfit = ownTrucks.reduce((a, t) => a + t.profit, 0);
    const diff = Math.abs(report.grossProfit - sumOwnProfit);
    assert.ok(
      diff <= tolerance(),
      `adjustedGrossProfit (${report.grossProfit}) must equal Σ own-truck profit (${sumOwnProfit}); diff=${diff}`,
    );
  });

  test('(b) penalty/otherIncome enters netProfit exactly once (no truck double-count)', () => {
    if (!report) { assert.ok(true, 'no report'); return; }
    // netProfit = adjustedGrossProfit − managementFee − companyExpenses + otherIncome (pnl.service.ts:178).
    // Solving for otherIncome isolates the single penalty contribution.
    const derivedOtherIncome =
      report.netProfit - (report.grossProfit - report.managementFee - report.companyExpenses);
    const diff = Math.abs(derivedOtherIncome - report.otherIncome);
    assert.ok(
      diff <= tolerance(),
      `otherIncome (penalties) must enter netProfit exactly once: derived=${derivedOtherIncome}, reported=${report.otherIncome}, diff=${diff}`,
    );
  });

  test('(c) service/ocean-fee margin stays out of transport P&L', () => {
    if (!report) { assert.ok(true, 'no report'); return; }
    assert.equal(report.serviceMarginTotal, 0, 'serviceMarginTotal is compatibility-only and stays zero');
    for (const truck of report.trucks) {
      assert.equal(truck.serviceMargin ?? 0, 0, `truck ${truck.plate || truck.id} serviceMargin stays zero`);
    }
    const netProfitFormula =
      report.grossProfit - report.managementFee - report.companyExpenses + report.otherIncome;
    const diff = Math.abs(report.netProfit - netProfitFormula);
    assert.ok(
      diff <= tolerance(),
      `netProfit (${report.netProfit}) must equal transport-only formula (${netProfitFormula}); diff=${diff}.`,
    );
  });

  test('(c.2) external "Xe ngoài" bucket profit equals external carrier margin only', () => {
    if (!report) { assert.ok(true, 'no report'); return; }
    const ext = report.trucks.find(t => t.id === 0);
    if (!ext) { assert.ok(true, 'no external trips this period'); return; }
    const extProfitReconstructed = ext.externalMargin ?? 0;
    assert.ok(
      Math.abs(ext.profit - extProfitReconstructed) <= tolerance(),
      `external "Xe ngoài" profit (${ext.profit}) must equal externalMargin (${extProfitReconstructed})`,
    );
  });
});
