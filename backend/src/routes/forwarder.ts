import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import {
  getForwarderByUserId,
  getForwarderTrips,
  getForwarderTripCounts,
  getForwarderTripDetail,
  createTripContainer,
  createTripExpense,
  deleteTripExpense,
  listUnlinkedTripExpenses,
  addExpensePhoto,
  getExpensePhotos,
  deleteExpensePhoto,
  listActiveSuppliersForForwarder,
} from '../services/forwarder.service';
import { exportSettlementXlsx, exportSettlementHtml } from '../services/settlement-export.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { db } from '../db';
import * as s from '../db/schema';
import { eq } from 'drizzle-orm';
import { tripContainerSchema, tripExpenseSchema } from '@tingting/shared';
import { createAdvanceRequest, listAdvanceRequests, getAdvanceRequestCounts, createAdvanceSettlement, listAdvanceSettlements, getAdvanceSettlement } from '../services/advance.service';
import { createAdvanceRequestSchema, createAdvanceSettlementSchema } from '@tingting/shared';
import { storageService } from '../services/storage.service';
import sharp from 'sharp';

const expensePhotoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const MAX_IMAGE_DIMENSION = 1600;

function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  return null;
}

const router = Router();

router.get('/trips', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const status = req.query.status as string | undefined;
  const [items, counts] = await Promise.all([
    getForwarderTrips(status),
    getForwarderTripCounts(),
  ]);
  res.json({ items, counts });
}));

router.get('/trips/:id', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const trip = await getForwarderTripDetail(parseInt(req.params.id as string, 10), forwarder.id);
  if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });
  res.json(trip);
}));

router.post('/trips/:tripId/containers', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const tripId = parseInt(req.params.tripId as string, 10);
  const parsed = tripContainerSchema.safeParse({ ...req.body, tripId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const container = await createTripContainer({
    ...parsed.data,
    containerTypeId: parsed.data.containerTypeId ?? null,
    sealNumber: parsed.data.sealNumber ?? null,
    notes: parsed.data.notes ?? null,
    createdBy: forwarder.id,
  });
  res.status(201).json(container);
}));

router.get('/suppliers', asyncHandler(async (_req: Request, res: Response) => {
  const items = await listActiveSuppliersForForwarder();
  res.json({ items });
}));

router.post('/expenses', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const parsed = tripExpenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const expense = await createTripExpense(db, {
    tripId: parsed.data.tripId,
    forwarderId: forwarder.id,  // forwarder-created → PENDING
    expenseType: parsed.data.expenseType,
    buyAmount: String(parsed.data.buyAmount),
    sellAmount: String(parsed.data.sellAmount ?? 0),
    settlementMethod: parsed.data.settlementMethod,
    supplierId: parsed.data.supplierId ?? null,
    invoiceNumber: parsed.data.invoiceNumber ?? null,
    invoiceDate: parsed.data.invoiceDate ?? null,
    declarationNumber: parsed.data.declarationNumber ?? null,
    containerNumber: parsed.data.containerNumber ?? null,
    note: parsed.data.note ?? null,
  });
  res.status(201).json(expense);
}));

router.delete('/expenses/:id', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const expenseId = parseInt(req.params.id as string, 10);

  // Fetch expense info for audit log before delete
  const [expense] = await db.select({
    buyAmount: s.tripExpenses.buyAmount,
    typeName: s.forwarderExpenseTypes.name,
    tripCode: s.trips.tripCode,
    supplierName: s.suppliers.name,
  }).from(s.tripExpenses)
    .leftJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
    .leftJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
    .leftJoin(s.suppliers, eq(s.tripExpenses.supplierId, s.suppliers.id))
    .where(eq(s.tripExpenses.id, expenseId))
    .limit(1);

  const result = await deleteTripExpense(expenseId, forwarder.id);
  if (result === null) return res.status(404).json({ error: 'Không tìm thấy chi phí' });
  if (result === 'FORBIDDEN') return res.status(403).json({ error: 'Không có quyền xóa chi phí này' });

  if (expense) {
    const buyAmt = Number(expense.buyAmount).toLocaleString('vi-VN') + ' ₫';
    const tripPart = expense.tripCode ? ` cho chuyến ${expense.tripCode}` : '';
    const supplierPart = expense.supplierName ? ` (Nhà cung cấp: ${expense.supplierName})` : '';
    res.locals.auditEntityKey = `phí ${expense.typeName || 'hộ'} với số tiền chi ${buyAmt}${tripPart}${supplierPart}`;
  }

  res.json({ success: true });
}));

// ── Unlinked Trip Expenses (for settlement form) ──

router.get('/unlinked-expenses', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const items = await listUnlinkedTripExpenses(forwarder.id);
  res.json({ items });
}));

// ── Advance Requests ──

router.get('/advance-requests', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const status = req.query.status as string | undefined;
  const [items, counts] = await Promise.all([
    listAdvanceRequests({ requesterId: forwarder.id, status }),
    getAdvanceRequestCounts(forwarder.id),
  ]);
  res.json({ items, counts });
}));

router.post('/advance-requests', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const parsed = createAdvanceRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const result = await createAdvanceRequest(forwarder.id, parsed.data);
  res.status(201).json(result);
}));

// ── Advance Settlements ──

router.get('/advance-settlements', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const items = await listAdvanceSettlements({ forwarderId: forwarder.id });
  res.json({ items });
}));

router.get('/advance-settlements/:id', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const settlement = await getAdvanceSettlement(Number(req.params.id));
  if (!settlement) return res.status(404).json({ error: 'Không tìm thấy phiếu thanh toán' });
  if (settlement.forwarderId !== forwarder.id) return res.status(403).json({ error: 'Không có quyền truy cập' });
  res.json(settlement);
}));

router.get('/advance-settlements/:id/export', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const id = Number(req.params.id);
  const settlement = await getAdvanceSettlement(id);
  if (!settlement) return res.status(404).json({ error: 'Không tìm thấy phiếu thanh toán' });
  if (settlement.forwarderId !== forwarder.id) return res.status(403).json({ error: 'Không có quyền truy cập' });

  const format = (req.query.format as string) || 'xlsx';
  if (format === 'pdf' || format === 'html') {
    const html = await exportSettlementHtml(id);
    if (!html) return res.status(404).json({ error: 'Không tìm thấy phiếu thanh toán' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return;
  }

  const dateStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=phieu-thanh-toan-${id}-${dateStr}.xlsx`);
  await exportSettlementXlsx(id, res);
}));

router.post('/advance-settlements', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const parsed = createAdvanceSettlementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
    const { note, ...rest } = parsed.data;
    const result = await createAdvanceSettlement(forwarder.id, { ...rest, note: note ?? undefined });
  res.status(201).json(result);
}));

// ── Expense Photos ──

router.get('/expenses/:id/photos', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const expenseId = parseInt(req.params.id as string, 10);
  const photos = await getExpensePhotos(expenseId);
  res.json({ items: photos });
}));

router.post('/expenses/:id/photos', expensePhotoUpload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Không có file tải lên' });

  const expenseId = parseInt(req.params.id as string, 10);

  // Validate image type
  const mime = sniffImageType(file.buffer);
  if (!mime) return res.status(400).json({ error: 'Định dạng file không được hỗ trợ' });

  // Process: strip EXIF, downscale
  let processedBuffer: Buffer;
  let ext: string;
  if (mime === 'image/png') {
    processedBuffer = await sharp(file.buffer).rotate().resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    ext = '.png';
  } else {
    processedBuffer = await sharp(file.buffer).rotate().resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    ext = '.jpg';
  }

  const storageKey = `expense-photos/${expenseId}/${Date.now()}${ext}`;
  await storageService.upload(processedBuffer, storageKey);
  const photo = await addExpensePhoto(expenseId, storageKey, forwarder.id);
  res.status(201).json(photo);
}));

router.delete('/expense-photos/:id', asyncHandler(async (req: Request, res: Response) => {
  const forwarder = await getForwarderByUserId(req.user!.userId);
  const photoId = parseInt(req.params.id as string, 10);
  const result = await deleteExpensePhoto(photoId, forwarder.id);
  if (result === null) return res.status(404).json({ error: 'Không tìm thấy ảnh' });
  if (result === 'FORBIDDEN') return res.status(403).json({ error: 'Không có quyền xóa ảnh này' });
  // Try to remove from storage (best-effort)
  try { await storageService.delete(result.storageKey); } catch {}
  res.json({ success: true });
}));

// ── Expense type labels (for forwarder catalog) ──

router.get('/expense-types', asyncHandler(async (_req: Request, res: Response) => {
  const rows = await db.select({
    code: s.forwarderExpenseTypes.code,
    name: s.forwarderExpenseTypes.name,
  }).from(s.forwarderExpenseTypes)
    .orderBy(s.forwarderExpenseTypes.name);
  res.json(rows);
}));

export default router;
