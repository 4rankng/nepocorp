/**
 * One-time bulk recalculation of trip figures to fix VAT handling.
 *
 * Safe approach: does NOT recalculate fuel/road/salary (those are already
 * correct). Only fixes the three bugs:
 *   1. Revenue not stripped of VAT when computing grossProfit
 *   2. EXTERNAL trips using fuel/road/salary instead of externalFreightCost
 *   3. Service margin from ancillary fees was always 0
 *
 * For OWN trips:  grossProfit = freightExVat - totalCost + serviceMargin
 * For EXTERNAL:   totalCost = externalFreightCost
 *                 grossProfit = freightExVat - externalFreightExVat + serviceMargin
 *
 * Usage:
 *   cd backend && npx tsx src/scripts/recalc-trip-figures.ts [--dry-run]
 */

import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, ne, inArray } from 'drizzle-orm';

const DRY_RUN = process.argv.includes('--dry-run');

function stripVat(amount: number, vatRate: number): number {
  return vatRate > 0 ? Math.round(amount / (1 + vatRate)) : amount;
}

async function main() {
  console.log(`\n=== Trip Figures Recalculation (VAT fix) ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}\n`);

  const trips = await db.select().from(s.trips).where(
    and(isNull(s.trips.deletedAt), ne(s.trips.status, 'CANCELED'))
  );

  console.log(`Found ${trips.length} active trips\n`);

  if (trips.length === 0) {
    console.log('Nothing to recalculate.');
    return;
  }

  const tripIds = trips.map(t => t.id);

  // Batch fetch ancillary fees (non-rejected)
  const feesMap = new Map<number, Array<{ buyAmount: number; sellAmount: number; vatRate: number }>>();
  const BATCH = 100;
  for (let i = 0; i < tripIds.length; i += BATCH) {
    const batch = tripIds.slice(i, i + BATCH);
    const fees = await db.select({
      tripId: s.tripExpenses.tripId,
      buyAmount: s.tripExpenses.buyAmount,
      sellAmount: s.tripExpenses.sellAmount,
      vatRate: s.forwarderExpenseTypes.vatRate,
    }).from(s.tripExpenses)
      .innerJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
      .where(
        and(
          inArray(s.tripExpenses.tripId, batch),
          ne(s.tripExpenses.approvalStatus, 'REJECTED'),
        )
      );
    for (const fee of fees) {
      if (!feesMap.has(fee.tripId)) feesMap.set(fee.tripId, []);
      feesMap.get(fee.tripId)!.push({
        buyAmount: Number(fee.buyAmount || 0),
        sellAmount: Number(fee.sellAmount || 0),
        vatRate: Number(fee.vatRate || 0.080),
      });
    }
  }

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const trip of trips) {
    try {
      const vatRate = Number(trip.vatRate || 0);
      const carrierType = trip.carrierType ?? 'OWN';
      const revenue = Number(trip.revenue || 0);
      const fees = feesMap.get(trip.id) ?? [];

      const freightExVat = stripVat(revenue, vatRate);

      // Service margin: sum of (sellExVat - buyExVat) across ancillary fees
      const serviceMargin = fees.reduce((sum, f) => {
        const sellEx = stripVat(f.sellAmount, f.vatRate);
        const buyEx = stripVat(f.buyAmount, f.vatRate);
        return sum + (sellEx - buyEx);
      }, 0);

      let newTotalCost: number;
      let newGrossProfit: number;

      if (carrierType === 'EXTERNAL') {
        const extCost = Number(trip.externalFreightCost || 0);
        const extCostExVat = stripVat(extCost, vatRate);
        newTotalCost = extCost;
        newGrossProfit = (freightExVat - extCostExVat) + serviceMargin;
      } else {
        // OWN trip: keep stored totalCost (fuel/road/salary already correct)
        newTotalCost = Number(trip.totalCost || 0);
        newGrossProfit = freightExVat - newTotalCost + serviceMargin;
      }

      const oldGrossProfit = Number(trip.grossProfit || 0);
      const oldTotalCost = Number(trip.totalCost || 0);

      const changed = (
        oldGrossProfit !== newGrossProfit ||
        oldTotalCost !== newTotalCost
      );

      if (!changed) {
        unchanged++;
        continue;
      }

      const gpDelta = newGrossProfit - oldGrossProfit;
      const parts: string[] = [`grossProfit ${oldGrossProfit.toLocaleString()} → ${newGrossProfit.toLocaleString()} (Δ ${gpDelta >= 0 ? '+' : ''}${gpDelta.toLocaleString()})`];
      if (oldTotalCost !== newTotalCost) {
        parts.push(`cost ${oldTotalCost.toLocaleString()} → ${newTotalCost.toLocaleString()}`);
      }
      parts.push(`vat=${vatRate} carrier=${carrierType} fees=${fees.length}`);

      console.log(`Trip ${trip.tripCode || trip.id}: ${parts.join(' | ')}`);

      if (!DRY_RUN) {
        await db.update(s.trips)
          .set({
            totalCost: String(newTotalCost),
            grossProfit: String(newGrossProfit),
            updatedAt: new Date(),
          })
          .where(eq(s.trips.id, trip.id));
      }

      updated++;
    } catch (err) {
      errors++;
      console.error(`ERROR on trip ${trip.tripCode || trip.id}:`, err);
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Updated:   ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Errors:    ${errors}`);
  console.log(`Total:     ${trips.length}`);
  if (DRY_RUN) {
    console.log(`\nThis was a DRY RUN. No changes were written to the database.`);
    console.log(`Run without --dry-run to apply changes.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
