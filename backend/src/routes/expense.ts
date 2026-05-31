import { Router } from 'express';
import type { Request, Response } from 'express';
import { expenseSchema } from '@nepocorp/shared';
import { db } from '../db';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getRenewalReminders,
} from '../services/expense.service';

registerAuditEvent('POST', '/api/expenses', AuditEvent.ENTITY_CREATED);
registerAuditEvent('PUT', '/api/expenses/', AuditEvent.ENTITY_UPDATED);
registerAuditEvent('DELETE', '/api/expenses/', AuditEvent.ENTITY_DELETED);

const router = Router();

router.get('/reports/renewals', async (_req: Request, res: Response) => {
  try {
    const reminders = await getRenewalReminders(db);
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = expenseSchema.parse(req.body);
    const userId = req.user?.userId;
    const result = await db.transaction(async (tx) => {
      return createExpense(tx, { ...validatedData, amount: String(validatedData.amount) }, userId);
    });
    res.status(201).json(result);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const validatedData = expenseSchema.partial().parse(req.body);
    const userId = req.user?.userId;
    const serviceData: Record<string, any> = { ...validatedData };
    if (validatedData.amount !== undefined) serviceData.amount = String(validatedData.amount);
    const result = await db.transaction(async (tx) => {
      return updateExpense(tx, Number(req.params.id), serviceData as any, userId);
    });
    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    await db.transaction(async (tx) => {
      await deleteExpense(tx, Number(req.params.id), userId);
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
