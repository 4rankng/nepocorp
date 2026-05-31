/**
 * Config service — bootstrap data and pricing lookup.
 * CRUD factory moved to routes/utils/crud-factory.ts.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { eq, isNull, desc, and, lte } from 'drizzle-orm';
import { cacheGet } from '../lib/redis';

// ─── Bootstrap ──────────────────────────────────────────────────────────────────

/**
 * Fetch active catalogs for the frontend bootstrap (dropdowns, selectors).
 * Only returns ACTIVE-status entities where applicable.
 */
export async function getBootstrapData() {
  return cacheGet('catalogs:bootstrap', 60, async () => {
    const [customersList, trucksList, driversList, trailersList, routesList, cargoTypesList] = await Promise.all([
      db.select().from(s.customers).where(isNull(s.customers.deletedAt)),
      db.select().from(s.trucks).where(isNull(s.trucks.deletedAt)),
      db.select().from(s.drivers).where(isNull(s.drivers.deletedAt)),
      db.select().from(s.trailers).where(isNull(s.trailers.deletedAt)),
      db.select().from(s.routes).where(isNull(s.routes.deletedAt)),
      db.select().from(s.cargoTypes).where(isNull(s.cargoTypes.deletedAt)),
    ]);

    return {
      customers: customersList.filter(c => c.status === 'ACTIVE'),
      trucks: trucksList.filter(t => t.status === 'ACTIVE'),
      drivers: driversList.filter(d => d.status === 'ACTIVE'),
      trailers: trailersList.filter(t => t.status === 'ACTIVE'),
      routes: routesList,
      cargoTypes: cargoTypesList,
    };
  });
}

// ─── Pricing lookup ─────────────────────────────────────────────────────────────

/**
 * Look up the effective price for a customer + route combo as of a given date.
 * Picks the most recent pricing table entry on or before the date.
 */
export async function getPricing(customerId: number, routeId: number, date: string) {
  const [pricing] = await db.select()
    .from(s.pricingTables)
    .where(and(
      eq(s.pricingTables.customerId, customerId),
      eq(s.pricingTables.routeId, routeId),
      lte(s.pricingTables.effectiveDate, date),
      isNull(s.pricingTables.deletedAt)
    ))
    .orderBy(desc(s.pricingTables.effectiveDate))
    .limit(1);

  return { price: pricing ? Number(pricing.price) : 0 };
}
