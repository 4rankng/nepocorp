import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, isNull, sql, and, desc } from 'drizzle-orm';
// auth + Casbin applied at mount point in index.ts
import {
  customerSchema, truckSchema, trailerSchema, routeSchema,
  cargoTypeSchema, pricingTableSchema, roadAllowanceSchema,
  fuelConfigSchema, penaltyReasonSchema, driverSchema,
  managementFeeSchema, capTableSchema,
} from '@nepocorp/shared';
import type { Request, Response } from 'express';
import { createCrudRouter, getBootstrapData, getPricing } from '../services/config.service';

const router = Router();

// ─── Bootstrap ────────────────────────────────────────────────────────────────

router.get('/catalogs/bootstrap', async (_req: Request, res: Response) => {
  try {
    res.json(await getBootstrapData());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Pricing lookup ──────────────────────────────────────────────────────────

router.get('/pricing', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.query.customerId as string);
    const routeId = parseInt(req.query.routeId as string);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    if (isNaN(customerId) || isNaN(routeId)) {
      return res.status(400).json({ error: 'customerId và routeId là bắt buộc' });
    }

    res.json(await getPricing(customerId, routeId, date));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CRUD routes ─────────────────────────────────────────────────────────────

router.use('/customers', createCrudRouter(s.customers, customerSchema, { searchableField: 'name' }));
router.use('/trucks', createCrudRouter(s.trucks, truckSchema, { searchableField: 'licensePlate' }));
router.use('/trailers', createCrudRouter(s.trailers, trailerSchema, { searchableField: 'licensePlate' }));
router.use('/routes', createCrudRouter(s.routes, routeSchema, { searchableField: 'name' }));
router.use('/cargo-types', createCrudRouter(s.cargoTypes, cargoTypeSchema));
router.use('/pricing-tables', createCrudRouter(s.pricingTables, pricingTableSchema));
router.use('/road-allowances', createCrudRouter(s.roadAllowances, roadAllowanceSchema));
router.use('/penalty-reasons', createCrudRouter(s.penaltyReasons, penaltyReasonSchema));
router.use('/management-fees', createCrudRouter(s.managementFees, managementFeeSchema));
router.use('/cap-table', createCrudRouter(s.capTableHistory, capTableSchema));

// Drivers — special handling (includes user_id)
router.use('/drivers', (() => {
  const sub = Router();

  sub.get('/', async (_req: Request, res: Response) => {
    const items = await db.select({
      id: s.drivers.id, userId: s.drivers.userId, name: s.drivers.name,
      phone: s.drivers.phone, assignedTruckId: s.drivers.assignedTruckId,
      baseSalary: s.drivers.baseSalary, status: s.drivers.status,
      createdAt: s.drivers.createdAt,
    }).from(s.drivers).where(isNull(s.drivers.deletedAt));
    res.json({ items, total: items.length });
  });

  sub.post('/', async (req: Request, res: Response) => {
    const data = driverSchema.parse(req.body);
    const [item] = await db.insert(s.drivers).values(data).returning();
    res.status(201).json(item);
  });

  sub.get('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const [item] = await db.select().from(s.drivers).where(and(eq(s.drivers.id, id), isNull(s.drivers.deletedAt))).limit(1);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(item);
  });

  sub.put('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const data = driverSchema.partial().parse(req.body);
    const [item] = await db.update(s.drivers).set({ ...data, updatedAt: new Date() }).where(eq(s.drivers.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(item);
  });

  return sub;
})());

// Fuel config — singleton GET/PUT
router.get('/fuel-config', async (_req: Request, res: Response) => {
  const [row] = await db.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
  if (!row) return res.json(null);
  res.json(row);
});

router.put('/fuel-config', async (req: Request, res: Response) => {
  const data = fuelConfigSchema.parse(req.body);
  const values = {
    loadedNorm: String(data.loaded_norm),
    emptyNorm: String(data.empty_norm),
    supplement: String(data.supplement ?? 0),
    unitPrice: String(data.unit_price),
    warningThreshold: String(data.warning_threshold),
    criticalThreshold: String(data.critical_threshold),
    updatedAt: new Date(),
  };
  const [existing] = await db.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
  if (existing) {
    const [updated] = await db.update(s.fuelConfig).set(values).where(eq(s.fuelConfig.id, existing.id)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(s.fuelConfig).values(values).returning();
    res.status(201).json(created);
  }
});

// ─── Audit logs (mounted separately with ADMIN-only Casbin resource) ────────
export const auditLogRouter = Router();
auditLogRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(_req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(_req.query.limit as string) || 50);

    const items = await db.select({
      id: s.auditLogs.id,
      timestamp: s.auditLogs.timestamp,
      userId: s.auditLogs.userId,
      userEmail: s.users.email,
      message: s.auditLogs.message,
      payload: s.auditLogs.payload,
      ipAddress: s.auditLogs.ipAddress,
    }).from(s.auditLogs)
      .leftJoin(s.users, eq(s.auditLogs.userId, s.users.id))
      .orderBy(desc(s.auditLogs.id))
      .limit(limit).offset((page - 1) * limit);

    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(s.auditLogs);

    res.json({
      items: items.map(i => ({
        id: i.id,
        userId: i.userId,
        userEmail: i.userEmail || '',
        action: (i.payload as any)?.event || '',
        method: (i.payload as any)?.method || '',
        path: (i.payload as any)?.path || '',
        message: i.message,
        timestamp: i.timestamp,
      })),
      total: Number(countRow?.count ?? 0),
      page,
      pageSize: limit,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
