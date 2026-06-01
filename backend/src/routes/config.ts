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
  salaryPeriodSchema, salaryPeriodDefaultSchema,
  supplierSchema, expenseCategorySchema,
} from '@nepocorp/shared';
import type { Request, Response } from 'express';
import { createCrudRouter } from './utils/crud-factory';
import { getBootstrapData, getPricing } from '../services/config.service';
import { cacheGet, cacheInvalidate, cacheInvalidatePattern } from '../lib/redis';
import {
  getSalaryPeriodDefault,
  updateSalaryPeriodDefault,
  getSalaryPeriodOverrides,
  upsertSalaryPeriodOverride,
  deleteSalaryPeriodOverride,
  resolveSalaryPeriodDateRange,
} from '../services/salary-period.service';

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
    const customerId = parseInt(req.query.customerId as string, 10);
    const routeId = parseInt(req.query.routeId as string, 10);
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
router.use('/trucks', createCrudRouter(s.trucks, truckSchema, {
  searchableField: 'licensePlate',
  beforeCreate: async (_id, data) => {
    if (data.currentTrailerId) {
      const [trailer] = await db.select().from(s.trailers)
        .where(eq(s.trailers.id, data.currentTrailerId)).limit(1);
      if (trailer) {
        data.trailerPlateNumber = trailer.licensePlate;
        data.trailerType = trailer.type;
      }
    }
    return data;
  },
  beforeUpdate: async (_id, data) => {
    if (data.currentTrailerId !== undefined) {
      if (data.currentTrailerId) {
        const [trailer] = await db.select().from(s.trailers)
          .where(eq(s.trailers.id, data.currentTrailerId)).limit(1);
        if (trailer) {
          data.trailerPlateNumber = trailer.licensePlate;
          data.trailerType = trailer.type;
        }
      } else {
        data.trailerPlateNumber = null;
        data.trailerType = null;
      }
    }
    return data;
  },
}));
router.use('/trailers', createCrudRouter(s.trailers, trailerSchema, { searchableField: 'licensePlate' }));
router.use('/routes', createCrudRouter(s.routes, routeSchema, { searchableField: 'name' }));
router.use('/cargo-types', createCrudRouter(s.cargoTypes, cargoTypeSchema));
router.use('/pricing-tables', createCrudRouter(s.pricingTables, pricingTableSchema));
router.use('/road-allowances', createCrudRouter(s.roadAllowances, roadAllowanceSchema));
router.use('/penalty-reasons', createCrudRouter(s.penaltyReasons, penaltyReasonSchema));
router.use('/management-fees', createCrudRouter(s.managementFees, managementFeeSchema, {
  afterCreate: async () => { cacheInvalidatePattern('reports:pnl:*'); },
  afterUpdate: async () => { cacheInvalidatePattern('reports:pnl:*'); },
  afterDelete: async () => { cacheInvalidatePattern('reports:pnl:*'); },
}));
// Cap-table is amount-based: percentages are derived as
// contribution_amount / sum(contribution_amount) per snapshot, so totals are
// always 100% by construction and there's no separate over-allocation check.
router.use('/cap-table', createCrudRouter(s.capTableHistory, capTableSchema));
router.use('/suppliers', createCrudRouter(s.suppliers, supplierSchema, { searchableField: 'name' }));
router.use('/expense-categories', createCrudRouter(s.expenseCategories, expenseCategorySchema, { searchableField: 'name' }));

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
    const [item] = await db.insert(s.drivers).values(data as any).returning();
    await cacheInvalidate('catalogs:bootstrap');
    res.status(201).json(item);
  });

  sub.get('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const [item] = await db.select().from(s.drivers).where(and(eq(s.drivers.id, id), isNull(s.drivers.deletedAt))).limit(1);
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json(item);
  });

  sub.put('/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const data = driverSchema.partial().parse(req.body);
    const [item] = await db.update(s.drivers).set({ ...(data as any), updatedAt: new Date() }).where(eq(s.drivers.id, id)).returning();
    if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
    await cacheInvalidate('catalogs:bootstrap');
    res.json(item);
  });

  return sub;
})());

// Fuel config — singleton GET/PUT
router.get('/fuel-config', async (_req: Request, res: Response) => {
  try {
    const row = await cacheGet('config:fuel', 300, async () => {
      const [r] = await db.select().from(s.fuelConfig).where(isNull(s.fuelConfig.deletedAt)).limit(1);
      return r || null;
    });
    if (!row) return res.json(null);
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/fuel-config', async (req: Request, res: Response) => {
  try {
    const data = fuelConfigSchema.parse(req.body);
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
      res.json(updated);
    } else {
      const [created] = await db.insert(s.fuelConfig).values(values).returning();
      await cacheInvalidate('config:fuel');
      res.status(201).json(created);
    }
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ─── Salary Period Config ──────────────────────────────────────────────────────

// Resolve a salary period for a given month/year (used by frontend hooks)
router.get('/salary-periods/resolve', async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Tháng và năm là bắt buộc (month 1-12, year >= 2000)' });
    }
    res.json(await resolveSalaryPeriodDateRange(month, year));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Global default — singleton GET/PUT (same pattern as fuel-config)
router.get('/salary-periods/default', async (_req: Request, res: Response) => {
  try {
    res.json(await getSalaryPeriodDefault());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/salary-periods/default', async (req: Request, res: Response) => {
  try {
    const data = salaryPeriodDefaultSchema.parse(req.body);
    res.json(await updateSalaryPeriodDefault(data.defaultStartDay, data.defaultEndDay));
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Per-month overrides — list, create, update, soft-delete
router.get('/salary-periods', async (_req: Request, res: Response) => {
  try {
    const items = await getSalaryPeriodOverrides();
    res.json({ items, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/salary-periods', async (req: Request, res: Response) => {
  try {
    const data = salaryPeriodSchema.parse(req.body);
    res.status(201).json(
      await upsertSalaryPeriodOverride(
        data.month, data.year, data.startDate, data.endDate, data.label,
      ),
    );
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.put('/salary-periods/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID không hợp lệ' });
    const data = salaryPeriodSchema.parse(req.body);
    // Update by id — fetch existing to validate, then upsert by month/year
    const result = await upsertSalaryPeriodOverride(
      data.month, data.year, data.startDate, data.endDate, data.label,
    );
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.delete('/salary-periods/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const deleted = await deleteSalaryPeriodOverride(id);
    if (!deleted) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Audit logs (mounted separately with ADMIN-only Casbin resource) ────────
export const auditLogRouter = Router();
auditLogRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(_req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(_req.query.limit as string, 10) || 50);
    const category = _req.query.category as string;
    const search = _req.query.search as string;

    const conditions = [
      sql`coalesce(${s.auditLogs.payload}->>'event', '') != 'ACCESS_DENIED'`
    ];

    if (category) {
      if (category === 'trip') {
        conditions.push(sql`(${s.auditLogs.payload}->>'event' LIKE 'TRIP_%' OR ${s.auditLogs.payload}->>'event' = 'STATUS_CHANGED')`);
      } else if (category === 'finance') {
        conditions.push(sql`${s.auditLogs.payload}->>'event' IN ('PAYMENT_RECEIVED', 'ADJUSTMENT_CREATED', 'PROFIT_DISTRIBUTED')`);
      } else if (category === 'penalty') {
        conditions.push(sql`${s.auditLogs.payload}->>'event' = 'PENALTY_CREATED'`);
      } else if (category === 'auth') {
        conditions.push(sql`${s.auditLogs.payload}->>'event' IN ('USER_LOGIN', 'USER_LOGOUT')`);
      } else if (category === 'config') {
        conditions.push(sql`${s.auditLogs.payload}->>'event' IN ('ENTITY_CREATED', 'ENTITY_UPDATED', 'ENTITY_DELETED')`);
      }
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(sql`(${s.users.fullName} ILIKE ${searchPattern} OR ${s.users.username} ILIKE ${searchPattern} OR ${s.auditLogs.message} ILIKE ${searchPattern} OR ${s.auditLogs.payload}->>'event' ILIKE ${searchPattern})`);
    }

    const items = await db.select({
      id: s.auditLogs.id,
      timestamp: s.auditLogs.timestamp,
      userId: s.auditLogs.userId,
      userName: sql`COALESCE(${s.auditLogs.actorName}, ${s.users.fullName}, ${s.users.username})`,
      username: s.users.username,
      userDeletedAt: s.users.deletedAt,
      userIdExists: s.users.id,
      message: s.auditLogs.message,
      payload: s.auditLogs.payload,
      ipAddress: s.auditLogs.ipAddress,
    }).from(s.auditLogs)
      .leftJoin(s.users, eq(s.auditLogs.userId, s.users.id))
      .where(and(...conditions))
      .orderBy(desc(s.auditLogs.id))
      .limit(limit).offset((page - 1) * limit);

    const [countRow] = await db.select({ count: sql<number>`count(*)` })
      .from(s.auditLogs)
      .leftJoin(s.users, eq(s.auditLogs.userId, s.users.id))
      .where(and(...conditions));

    res.json({
      items: items.map(i => {
        let displayName = i.userName || i.username || 'Người dùng';
        const isDeleted = i.userDeletedAt !== null || (i.userId !== null && i.userIdExists === null);
        if (isDeleted) {
          displayName = `${displayName} (Đã xóa)`;
        }
        return {
          id: i.id,
          userId: i.userId,
          userName: displayName,
          action: (i.payload as any)?.event || '',
          method: (i.payload as any)?.method || '',
          path: (i.payload as any)?.path || '',
          message: i.message,
          timestamp: i.timestamp,
          payload: i.payload,
          ipAddress: i.ipAddress,
        };
      }),
      total: Number(countRow?.count ?? 0),
      page,
      pageSize: limit,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
