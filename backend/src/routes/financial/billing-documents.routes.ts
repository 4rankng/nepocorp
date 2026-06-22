import { Router } from 'express';
import type { Request, Response } from 'express';
import { Role, generateBillingDocumentSchema, saveBillingDocumentSchema } from '@tingting/shared';
import { requireRoles } from '../../middleware/casbin';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as billingService from '../../services/billingDocument.service';
import { attachmentDisposition } from '../../services/statement.service';

// Debit-note (AR) + payment-statement (AP) builder routes.
// Mounted under the financial router → already gated by casbinAuthz('financial').
// requireRoles adds explicit ACCOUNTANT/MANAGER/ADMIN defense-in-depth on every op
// (DRIVER / FORWARDER never get financial write in policy.csv).
const router = Router();
const ROLES = [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT] as const;

// POST /api/finance/billing-documents/generate — preview draft lines (pre-save)
router.post('/finance/billing-documents/generate', requireRoles(...ROLES), asyncHandler(async (req: Request, res: Response) => {
  const data = generateBillingDocumentSchema.parse(req.body);
  res.json(await billingService.generateDraft(data));
}));

// POST /api/finance/billing-documents — save a snapshot document
router.post('/finance/billing-documents', requireRoles(...ROLES), asyncHandler(async (req: Request, res: Response) => {
  const data = saveBillingDocumentSchema.parse(req.body);
  const doc = await billingService.saveDocument(data, req.user?.userId ?? null);
  res.status(201).json(doc);
}));

// GET /api/finance/billing-documents?entityType&entityId&type — list saved documents
router.get('/finance/billing-documents', requireRoles(...ROLES), asyncHandler(async (req: Request, res: Response) => {
  const entityType = String(req.query.entityType ?? '');
  const entityId = Number(req.query.entityId);
  if ((entityType !== 'CUSTOMER' && entityType !== 'VENDOR') || !Number.isFinite(entityId) || entityId <= 0) {
    return res.status(400).json({ error: 'Thiếu hoặc sai entityType / entityId' });
  }
  const rawType = req.query.type;
  const type = rawType === 'DEBIT_NOTE' || rawType === 'PAYMENT_STATEMENT' ? rawType : undefined;
  res.json(await billingService.listDocuments(entityType, entityId, type));
}));

// GET /api/finance/billing-documents/:id — one document with lines
router.get('/finance/billing-documents/:id', requireRoles(...ROLES), asyncHandler(async (req: Request, res: Response) => {
  res.json(await billingService.getDocument(Number(req.params.id)));
}));

// PUT /api/finance/billing-documents/:id — edit in place (always-editable)
router.put('/finance/billing-documents/:id', requireRoles(...ROLES), asyncHandler(async (req: Request, res: Response) => {
  const data = saveBillingDocumentSchema.parse(req.body);
  res.json(await billingService.updateDocument(Number(req.params.id), data));
}));

// DELETE /api/finance/billing-documents/:id — soft delete
router.delete('/finance/billing-documents/:id', requireRoles(...ROLES), asyncHandler(async (req: Request, res: Response) => {
  await billingService.deleteDocument(Number(req.params.id));
  res.json({ ok: true });
}));

// GET /api/finance/billing-documents/:id/export — xlsx (route + container columns)
router.get('/finance/billing-documents/:id/export', requireRoles(...ROLES), asyncHandler(async (req: Request, res: Response) => {
  const doc = await billingService.getDocument(Number(req.params.id));
  const buffer = await billingService.buildBillingXlsx(doc);
  const kind = doc.type === 'DEBIT_NOTE' ? 'giay-bao-no' : 'bang-ke-thanh-toan';
  const name = doc.entityName ?? String(doc.entityId);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', attachmentDisposition(`${kind}-${name}.xlsx`));
  res.send(buffer);
}));

export default router;
