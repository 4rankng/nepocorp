import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, isNull, sql, like, and, desc } from 'drizzle-orm';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@nepocorp/shared';
import {
  customerSchema, truckSchema, trailerSchema, routeSchema,
  cargoTypeSchema, pricingTableSchema, roadAllowanceSchema,
  fuelConfigSchema, penaltyReasonSchema, driverSchema,
  managementFeeSchema, capTableSchema,
} from '@nepocorp/shared';
import type { Request, Response } from 'express';

const router = Router();
router.use(authMiddleware);

function crud<T extends { id: unknown }>(
  table: any,
  createSchema: any,
  { requireAdmin = false, searchableField }: { requireAdmin?: boolean; searchableField?: string } = {}
) {
  const sub = Router();

  const canWrite = requireAdmin
    ? requireRoles(Role.ADMIN)
    : requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT);

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

  sub.post('/', canWrite, async (req: Request, res: Response) => {
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

  sub.put('/:id', canWrite, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const data = createSchema.partial().parse(req.body);
    const [item] = await db.update(table).set({ ...data, updatedAt: new Date() }).where(eq(table.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(item);
  });

  sub.delete('/:id', requireRoles(Role.ADMIN), async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!hasSoftDelete) return res.status(405).json({ error: 'Không hỗ trợ xóa' });
    const [item] = await db.update(table).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(table.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json({ ok: true });
  });

  return sub;
}

// Mount CRUD routes
router.use('/customers', crud(s.customers, customerSchema, { searchableField: 'name' }));
router.use('/trucks', crud(s.trucks, truckSchema, { searchableField: 'licensePlate' }));
router.use('/trailers', crud(s.trailers, trailerSchema, { searchableField: 'licensePlate' }));
router.use('/routes', crud(s.routes, routeSchema, { searchableField: 'name' }));
router.use('/cargo-types', crud(s.cargoTypes, cargoTypeSchema));
router.use('/pricing-tables', crud(s.pricingTables, pricingTableSchema));
router.use('/road-allowances', crud(s.roadAllowances, roadAllowanceSchema));
router.use('/penalty-reasons', crud(s.penaltyReasons, penaltyReasonSchema));
router.use('/management-fees', crud(s.managementFees, managementFeeSchema));
router.use('/cap-table', crud(s.capTableHistory, capTableSchema));

// Drivers - special handling (includes user_id)
router.use('/drivers', (() => {
  const sub = Router();
  const canWrite = requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT);

  sub.get('/', async (req: Request, res: Response) => {
    const items = await db.select({
      id: s.drivers.id, userId: s.drivers.userId, name: s.drivers.name,
      phone: s.drivers.phone, assignedTruckId: s.drivers.assignedTruckId,
      baseSalary: s.drivers.baseSalary, status: s.drivers.status,
      createdAt: s.drivers.createdAt,
    }).from(s.drivers).where(isNull(s.drivers.deletedAt));
    res.json({ items, total: items.length });
  });

  sub.post('/', canWrite, async (req: Request, res: Response) => {
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

  sub.put('/:id', canWrite, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const data = driverSchema.partial().parse(req.body);
    const [item] = await db.update(s.drivers).set({ ...data, updatedAt: new Date() }).where(eq(s.drivers.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(item);
  });

  return sub;
})());

// Fuel config - singleton GET/PUT
router.get('/fuel-config', async (_req: Request, res: Response) => {
  const [row] = await db.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
  if (!row) return res.json(null);
  res.json(row);
});

router.put('/fuel-config', requireRoles(Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT), async (req: Request, res: Response) => {
  const data = fuelConfigSchema.parse(req.body);
  const values = {
    loadedNorm: String(data.loaded_norm),
    emptyNorm: String(data.empty_norm),
    supplement: String(data.supplement ?? 0),
    unitPrice: String(data.unit_price),
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

// ─── Audit logs ──────────────────────────────────────────────────────────────
router.get('/audit-logs', requireRoles(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

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
