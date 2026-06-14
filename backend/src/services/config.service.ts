/**
 * Config service — bootstrap data and pricing lookup.
 * CRUD factory moved to routes/utils/crud-factory.ts.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { eq, isNull, desc, and, lte, ne } from 'drizzle-orm';
import { cacheGet, cacheInvalidate } from '../lib/redis';

// ─── Bootstrap ──────────────────────────────────────────────────────────────────

/**
 * Fetch active catalogs for the frontend bootstrap (dropdowns, selectors).
 * Only returns ACTIVE-status entities where applicable.
 */
export async function getBootstrapData() {
  return cacheGet('catalogs:bootstrap', 60, async () => {
    const [customersList, trucksList, driversList, routesList, cargoTypesList, expenseCategoriesList, suppliersList, trailersList, containerTypesList, portsList, forwarderExpenseTypesList] = await Promise.all([
      db.select().from(s.customers).where(isNull(s.customers.deletedAt)),
      db.select().from(s.trucks).where(isNull(s.trucks.deletedAt)),
      db.select().from(s.drivers).where(isNull(s.drivers.deletedAt)),
      db.select().from(s.routes).where(isNull(s.routes.deletedAt)),
      db.select().from(s.cargoTypes).where(isNull(s.cargoTypes.deletedAt)),
      db.select().from(s.expenseCategories).where(isNull(s.expenseCategories.deletedAt)),
      db.select().from(s.suppliers).where(isNull(s.suppliers.deletedAt)),
      db.select().from(s.trailers).where(isNull(s.trailers.deletedAt)),
      db.select().from(s.containerTypes).where(isNull(s.containerTypes.deletedAt)),
      db.select().from(s.ports).where(isNull(s.ports.deletedAt)),
      db.select().from(s.forwarderExpenseTypes).where(isNull(s.forwarderExpenseTypes.deletedAt)),
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
      containerTypes: containerTypesList,
      ports: portsList,
      forwarderExpenseTypes: forwarderExpenseTypesList.filter(t => t.status === 'ACTIVE'),
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

export async function getFuelConfig(): Promise<typeof s.fuelConfig.$inferSelect | null> {
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
}, userId?: number): Promise<{ result: typeof s.fuelConfig.$inferSelect; status: number }> {
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
  let result;
  let status: number;
  if (existing) {
    const [updated] = await db.update(s.fuelConfig).set(values).where(eq(s.fuelConfig.id, existing.id)).returning();
    result = updated;
    status = 200;
    if (String(data.unitPrice) !== String(existing.unitPrice)) {
      await db.insert(s.fuelPriceHistory).values({
        unitPrice: String(data.unitPrice),
        effectiveDate: new Date(),
        changedBy: userId ?? null,
        note: null,
      });
    }
  } else {
    const [created] = await db.insert(s.fuelConfig).values(values).returning();
    result = created;
    status = 201;
    await db.insert(s.fuelPriceHistory).values({
      unitPrice: String(data.unitPrice),
      effectiveDate: new Date(),
      changedBy: userId ?? null,
      note: 'Cấu hình ban đầu',
    });
  }
  await cacheInvalidate('config:fuel');
  await cacheInvalidate('config:fuel-price-history');
  return { result, status };
}

export async function getFuelPriceHistory(): Promise<typeof s.fuelPriceHistory.$inferSelect[]> {
  return cacheGet('config:fuel-price-history', 300, async () => {
    return db.select().from(s.fuelPriceHistory).orderBy(desc(s.fuelPriceHistory.effectiveDate));
  });
}

export async function getEffectiveFuelPrice(date: Date): Promise<number | null> {
  const [row] = await db.select().from(s.fuelPriceHistory)
    .where(lte(s.fuelPriceHistory.effectiveDate, date))
    .orderBy(desc(s.fuelPriceHistory.effectiveDate))
    .limit(1);
  return row ? Number(row.unitPrice) : null;
}

// ─── Customer ↔ Supplier link mirroring ────────────────────────────────────

/** Mirror customer.linkedSupplierId ↔ supplier.linkedCustomerId after create/update. */
export async function mirrorCustomerLink(
  customer: { id: number },
  data: { linkedSupplierId?: number | null },
) {
  if (customer == null || customer.id == null) return;
  if (data == null || !('linkedSupplierId' in data)) return; // not in this patch
  const customerId = customer.id;
  const newSupplierId = data.linkedSupplierId;

  // Clear any other supplier still pointing back at this customer
  const staleCond = newSupplierId == null
    ? eq(s.suppliers.linkedCustomerId, customerId)
    : and(eq(s.suppliers.linkedCustomerId, customerId), ne(s.suppliers.id, newSupplierId));
  await db.update(s.suppliers)
    .set({ linkedCustomerId: null, updatedAt: new Date() })
    .where(staleCond);

  if (newSupplierId != null) {
    await db.update(s.suppliers)
      .set({ linkedCustomerId: customerId, updatedAt: new Date() })
      .where(eq(s.suppliers.id, newSupplierId));
  }
}

/** Mirror supplier.linkedCustomerId ↔ customer.linkedSupplierId after create/update. */
export async function mirrorSupplierLink(
  supplier: { id: number },
  data: { linkedCustomerId?: number | null },
) {
  if (supplier == null || supplier.id == null) return;
  if (data == null || !('linkedCustomerId' in data)) return;
  const supplierId = supplier.id;
  const newCustomerId = data.linkedCustomerId;

  const staleCond = newCustomerId == null
    ? eq(s.customers.linkedSupplierId, supplierId)
    : and(eq(s.customers.linkedSupplierId, supplierId), ne(s.customers.id, newCustomerId));
  await db.update(s.customers)
    .set({ linkedSupplierId: null, updatedAt: new Date() })
    .where(staleCond);

  if (newCustomerId != null) {
    await db.update(s.customers)
      .set({ linkedSupplierId: supplierId, updatedAt: new Date() })
      .where(eq(s.customers.id, newCustomerId));
  }
}

/** Sync trailer-related fields (plate number, type) from the trailers table. */
export async function syncTrailerFields(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const trailerId = data.currentTrailerId;
  if (trailerId != null && trailerId !== '') {
    const [trailer] = await db.select().from(s.trailers)
      .where(and(eq(s.trailers.id, Number(trailerId)), isNull(s.trailers.deletedAt)))
      .limit(1);
    if (trailer) {
      return { ...data, trailerPlateNumber: trailer.licensePlate, trailerType: trailer.type };
    }
  } else if (trailerId === null || trailerId === '') {
    return { ...data, trailerPlateNumber: null, trailerType: null };
  }
  return data;
}
