/**
 * Config service — CRUD factory, bootstrap data, pricing lookup.
 * Extracted from routes/config.ts to create a seam for business-logic hooks.
 */
import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, isNull, sql, like, and, desc, lte } from 'drizzle-orm';
import type { Request, Response } from 'express';

// ─── CRUD factory ───────────────────────────────────────────────────────────────

/**
 * Create a Router with standard CRUD endpoints for a Drizzle table.
 *
 * Endpoints: GET / (list), POST / (create), GET /:id, PUT /:id, DELETE /:id.
 * Supports soft-delete (checks for `deletedAt` column) and optional search.
 */
export function createCrudRouter(
  table: any,
  createSchema: any,
  { searchableField }: { searchableField?: string } = {}
) {
  const sub = Router();
  const hasSoftDelete = 'deletedAt' in table;

  sub.get('/', async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const search = req.query.search as string;

    const conditions = [];
    if (hasSoftDelete) conditions.push(isNull(table.deletedAt));
    if (search && searchableField) {
      conditions.push(like(table[searchableField], `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.select().from(table)
      .where(where)
      .limit(limit).offset((page - 1) * limit);

    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(table)
      .where(where);

    res.json({ items, total: Number(countRow?.count ?? 0), page, pageSize: limit });
  });

  sub.post('/', async (req: Request, res: Response) => {
    const data = createSchema.parse(req.body);
    const [item] = await db.insert(table).values(data).returning();
    res.status(201).json(item);
  });

  sub.get('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const conditions = [eq(table.id, id)];
    if (hasSoftDelete) conditions.push(isNull(table.deletedAt));
    const [item] = await db.select().from(table).where(and(...conditions)).limit(1);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(item);
  });

  sub.put('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const data = createSchema.partial().parse(req.body);
    const [item] = await db.update(table).set({ ...data, updatedAt: new Date() }).where(eq(table.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(item);
  });

  sub.delete('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!hasSoftDelete) return res.status(405).json({ error: 'Không hỗ trợ xóa' });
    const [item] = await db.update(table).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(table.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json({ ok: true });
  });

  return sub;
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────────

/**
 * Fetch active catalogs for the frontend bootstrap (dropdowns, selectors).
 * Only returns ACTIVE-status entities where applicable.
 */
export async function getBootstrapData() {
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
