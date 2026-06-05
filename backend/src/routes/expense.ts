import { Router } from 'express';
import type { Request, Response } from 'express';
import { expenseSchema } from '@tingting/shared';
import { db } from '../db';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getRenewalReminders,
  getExpense,
} from '../services/expense.service';
import { asyncHandler } from '../middleware/asyncHandler';

registerAuditEvent('POST', '/api/expenses', AuditEvent.ENTITY_CREATED);
registerAuditEvent('PUT', '/api/expenses/', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('DELETE', '/api/expenses/', AuditEvent.ENTITY_DELETED);

const router = Router();

router.get('/reports/renewals', asyncHandler(async (_req: Request, res: Response) => {
  const reminders = await getRenewalReminders(db);
  res.json(reminders);
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    truckId: req.query.truckId ? Number(req.query.truckId) : undefined,
    supplierId: req.query.supplierId ? Number(req.query.supplierId) : undefined,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  };
  res.json(await listExpenses(db, filters));
}));

// GET /api/expenses/:id — fetch one expense for the edit page.
// The frontend `ExpenseEntryPage` queries this when isEdit=true; without it
// the form rendered empty for every "sửa phiếu".
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'ID không hợp lệ' });
  }
  const expense = await getExpense(db, id);
  if (!expense) return res.status(404).json({ error: 'Không tìm thấy khoản chi phí' });
  res.json(expense);
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = expenseSchema.parse(req.body);
  const userId = req.user?.userId;
  const result = await db.transaction(async (tx) => {
    return createExpense(tx, { ...validatedData, amount: String(validatedData.amount) }, userId);
  });
  res.status(201).json(result);
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = expenseSchema.partial().parse(req.body);
  const userId = req.user?.userId;
  const serviceData: Record<string, any> = { ...validatedData };
  if (validatedData.amount !== undefined) serviceData.amount = String(validatedData.amount);
  const result = await db.transaction(async (tx) => {
    return updateExpense(tx, Number(req.params.id), serviceData as any, userId);
  });
  res.json(result);
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  await db.transaction(async (tx) => {
    await deleteExpense(tx, Number(req.params.id), userId);
  });
  res.json({ ok: true });
}));

export default router;
