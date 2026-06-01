/**
 * Config service — bootstrap data and pricing lookup.
 * CRUD factory moved to routes/utils/crud-factory.ts.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { eq, isNull, desc, and, lte } from 'drizzle-orm';
import { cacheGet, cacheInvalidate } from '../lib/redis';

// ─── Bootstrap ──────────────────────────────────────────────────────────────────

/**
 * Fetch active catalogs for the frontend bootstrap (dropdowns, selectors).
 * Only returns ACTIVE-status entities where applicable.
 */
export async function getBootstrapData() {
  return cacheGet('catalogs:bootstrap', 60, async () => {
    const [customersList, trucksList, driversList, routesList, cargoTypesList, expenseCategoriesList, suppliersList, trailersList] = await Promise.all([
      db.select().from(s.customers).where(isNull(s.customers.deletedAt)),
      db.select().from(s.trucks).where(isNull(s.trucks.deletedAt)),
      db.select().from(s.drivers).where(isNull(s.drivers.deletedAt)),
      db.select().from(s.routes).where(isNull(s.routes.deletedAt)),
      db.select().from(s.cargoTypes).where(isNull(s.cargoTypes.deletedAt)),
      db.select().from(s.expenseCategories).where(isNull(s.expenseCategories.deletedAt)),
      db.select().from(s.suppliers).where(isNull(s.suppliers.deletedAt)),
      db.select().from(s.trailers).where(isNull(s.trailers.deletedAt)),
    ]);

    return {
      customers: customersList.filter(c => c.status === 'ACTIVE'),
      trucks: trucksList.filter(t => t.status === 'ACTIVE'),
      drivers: driversList.filter(d => d.status === 'ACTIVE'),
      routes: routesList,
      cargoTypes: cargoTypesList,
      expenseCategories: expenseCategoriesList.filter(c => c.status === 'ACTIVE'),
      suppliers: suppliersList.filter(s => s.status === 'ACTIVE'),
      trailers: trailersList.filter(t => t.status === 'ACTIVE'),
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

export async function getFuelConfig(): Promise<any> {
  const row = await cacheGet('config:fuel', 300, async () => {
    const [r] = await db.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
    return r || null;
  });
  return row;
}

export async function upsertFuelConfig(data: {
  loadedNorm: number;
  emptyNorm: number;
  supplement?: number;
  unitPrice: number;
  warningThreshold: number;
  criticalThreshold: number;
}): Promise<any> {
  const values = {
    loadedNorm: String(data.loadedNorm),
    emptyNorm: String(data.emptyNorm),
    supplement: String(data.supplement ?? 0),
    unitPrice: String(data.unitPrice),
    warningThreshold: String(data.warningThreshold),
    criticalThreshold: String(data.criticalThreshold),
    updatedAt: new Date(),
  };
  const [existing] = await db.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
  if (existing) {
    const [updated] = await db.update(s.fuelConfig).set(values).where(eq(s.fuelConfig.id, existing.id)).returning();
    await cacheInvalidate('config:fuel');
    return { result: updated, status: 200 };
  } else {
    const [created] = await db.insert(s.fuelConfig).values(values).returning();
    await cacheInvalidate('config:fuel');
    return { result: created, status: 201 };
  }
}
