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
  containerTypeSchema, portSchema,
  forwarderExpenseTypeSchema,
} from '@nepocorp/shared';
import type { Request, Response } from 'express';
import { createCrudRouter } from './utils/crud-factory';
import { getBootstrapData, getPricing, getFuelConfig, upsertFuelConfig, getFuelPriceHistory, getEffectiveFuelPrice } from '../services/config.service';
import { cacheInvalidatePattern } from '../lib/redis';
import {
  getSalaryPeriodDefault,
  updateSalaryPeriodDefault,
  getSalaryPeriodOverrides,
  upsertSalaryPeriodOverride,
  deleteSalaryPeriodOverride,
  resolveSalaryPeriodDateRange,
} from '../services/salary-period.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { queryAuditLogs } from '../services/audit-query.service';

async function syncTrailerFields(data: Record<string, any>) {
  if (data.currentTrailerId != null && data.currentTrailerId !== '') {
    const [trailer] = await db.select().from(s.trailers)
      .where(and(eq(s.trailers.id, data.currentTrailerId), isNull(s.trailers.deletedAt)))
      .limit(1);
    if (trailer) {
      data.trailerPlateNumber = trailer.licensePlate;
      data.trailerType = trailer.type;
    }
  } else if (data.currentTrailerId === null || data.currentTrailerId === '') {
    data.trailerPlateNumber = null;
    data.trailerType = null;
  }
  return data;
}

const router = Router();

// ─── Bootstrap ────────────────────────────────────────────────────────────────

router.get('/catalogs/bootstrap', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getBootstrapData());
}));

// ─── Pricing lookup ──────────────────────────────────────────────────────────

router.get('/pricing', asyncHandler(async (req: Request, res: Response) => {
  const customerId = parseInt(req.query.customerId as string, 10);
  const routeId = parseInt(req.query.routeId as string, 10);
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  if (isNaN(customerId) || isNaN(routeId)) {
    return res.status(400).json({ error: 'customerId và routeId là bắt buộc' });
  }

  res.json(await getPricing(customerId, routeId, date));
}));

// ─── CRUD routes ─────────────────────────────────────────────────────────────

router.use('/customers', createCrudRouter(s.customers, customerSchema, { searchableField: 'name' }));
router.use('/trucks', createCrudRouter(s.trucks, truckSchema, {
  searchableField: 'licensePlate',
  beforeCreate: async (data, _req) => {
    return syncTrailerFields(data);
  },
  beforeUpdate: async (_id, data, _req) => {
    if (data.currentTrailerId !== undefined) {
      return syncTrailerFields(data);
    }
    return data;
  },
}));
router.use('/trailers', createCrudRouter(s.trailers, trailerSchema, { searchableField: 'licensePlate' }));
router.use('/routes', createCrudRouter(s.routes, routeSchema, { searchableField: 'name' }));
router.use('/cargo-types', createCrudRouter(s.cargoTypes, cargoTypeSchema));
router.use('/container-types', createCrudRouter(s.containerTypes, containerTypeSchema, { searchableField: 'name' }));
router.use('/ports', createCrudRouter(s.ports, portSchema, { searchableField: 'name' }));
router.use('/forwarder-expense-types', createCrudRouter(s.forwarderExpenseTypes, forwarderExpenseTypeSchema, { searchableField: 'name' }));
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
router.use('/drivers', createCrudRouter(s.drivers, driverSchema, {
  searchableField: 'name',
}));

// Road config — singleton GET/PUT
router.get('/road-config', asyncHandler(async (_req: Request, res: Response) => {
  const [row] = await db.select().from(s.roadConfig).limit(1);
  if (!row) return res.json(null);
  res.json(row);
}));

router.put('/road-config', asyncHandler(async (req: Request, res: Response) => {
  const { tollPerStation, returnCargoBonus, defaultDriverSalary, twoPointDeliveryBonus, vehicleShiftDefault } = req.body as {
    tollPerStation: string; returnCargoBonus: string;
    defaultDriverSalary?: string; twoPointDeliveryBonus?: string; vehicleShiftDefault?: string;
  };
  const [existing] = await db.select().from(s.roadConfig).limit(1);
  if (existing) {
    const [updated] = await db.update(s.roadConfig)
      .set({ tollPerStation, returnCargoBonus, defaultDriverSalary, twoPointDeliveryBonus, vehicleShiftDefault, updatedAt: new Date() })
      .where(eq(s.roadConfig.id, existing.id))
      .returning();
    return res.json(updated);
  }
  const [created] = await db.insert(s.roadConfig).values({ tollPerStation, returnCargoBonus, defaultDriverSalary, twoPointDeliveryBonus, vehicleShiftDefault }).returning();
  res.status(201).json(created);
}));

// Fuel config — singleton GET/PUT
router.get('/fuel-config', asyncHandler(async (_req: Request, res: Response) => {
  const row = await getFuelConfig();
  if (!row) return res.json(null);
  res.json(row);
}));

router.put('/fuel-config', asyncHandler(async (req: Request, res: Response) => {
  const data = fuelConfigSchema.parse(req.body);
  const { result, status } = await upsertFuelConfig(data, req.user!.userId);
  res.status(status).json(result);
}));

// Fuel price history
router.get('/fuel-price-history', asyncHandler(async (_req: Request, res: Response) => {
  const history = await getFuelPriceHistory();
  res.json(history);
}));

router.get('/fuel-price-history/effective', asyncHandler(async (req: Request, res: Response) => {
  const dateStr = req.query.date as string;
  if (!dateStr) return res.status(400).json({ error: 'Tham số date là bắt buộc (YYYY-MM-DD)' });
  const price = await getEffectiveFuelPrice(new Date(dateStr));
  res.json({ price });
}));

// ─── Salary Period Config ──────────────────────────────────────────────────────

// Resolve a salary period for a given month/year (used by frontend hooks)
router.get('/salary-periods/resolve', asyncHandler(async (req: Request, res: Response) => {
  const month = parseInt(req.query.month as string, 10);
  const year = parseInt(req.query.year as string, 10);
  if (!month || !year || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Tháng và năm là bắt buộc (month 1-12, year >= 2000)' });
  }
  res.json(await resolveSalaryPeriodDateRange(month, year));
}));

// Global default — singleton GET/PUT (same pattern as fuel-config)
router.get('/salary-periods/default', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getSalaryPeriodDefault());
}));

router.put('/salary-periods/default', asyncHandler(async (req: Request, res: Response) => {
  const data = salaryPeriodDefaultSchema.parse(req.body);
  res.json(await updateSalaryPeriodDefault(data.defaultStartDay, data.defaultEndDay));
}));

// Per-month overrides — list, create, update, soft-delete
router.get('/salary-periods', asyncHandler(async (_req: Request, res: Response) => {
  const items = await getSalaryPeriodOverrides();
  res.json({ items, total: items.length });
}));

router.post('/salary-periods', asyncHandler(async (req: Request, res: Response) => {
  const data = salaryPeriodSchema.parse(req.body);
  res.status(201).json(
    await upsertSalaryPeriodOverride(
      data.month, data.year, data.startDate, data.endDate, data.label,
    ),
  );
}));

router.put('/salary-periods/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (!id || id < 1) return res.status(400).json({ error: 'ID không hợp lệ' });
  const data = salaryPeriodSchema.parse(req.body);
  // Update by id — fetch existing to validate, then upsert by month/year
  const result = await upsertSalaryPeriodOverride(
    data.month, data.year, data.startDate, data.endDate, data.label,
  );
  res.json(result);
}));

router.delete('/salary-periods/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const deleted = await deleteSalaryPeriodOverride(id);
  if (!deleted) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json({ ok: true });
}));

// ─── Audit logs (mounted separately with ADMIN-only Casbin resource) ────────
export const auditLogRouter = Router();
auditLogRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
  res.json(await queryAuditLogs({
    page,
    limit,
    category: req.query.category as string,
    search: req.query.search as string,
  }));
}));

export default router;
