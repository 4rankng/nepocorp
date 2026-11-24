/**
 * Lô hàng (Shipment) routes — NEPO-61.
 *
 * Mounted at /api/shipments with authMiddleware + casbinAuthz('shipments') in
 * index.ts (MUST be before the catch-all /api mounts). Reads are open to every
 * role with a `shipments:read` policy row (MANAGER / ACCOUNTANT / FORWARDER;
 * ADMIN via the wildcard); all mutations additionally require
 * SHIPMENT_WRITE_ROLES (ADMIN / MANAGER / FORWARDER = Ops biển) in-handler.
 * There is deliberately NO DELETE /:id — a lô is never deleted; it is edited
 * or its trips re-linked. Documents/costs CAN be removed (wrong-upload fix).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { Role, SHIPMENT_WRITE_ROLES } from '@tingting/shared';
import {
  createShipmentSchema,
  updateShipmentSchema,
  shipmentCostSchema,
  updateShipmentCostSchema,
  registerShipmentDocumentSchema,
} from '@tingting/shared';
import { requireRoles } from '../middleware/casbin';
import { asyncHandler } from '../middleware/asyncHandler';
import { getUser } from '../middleware/auth';
import { ApiError } from '../errors';
import { storageService } from '../services/storage.service';
import { registerAuditEvent } from '../services/audit-registry';
import { AuditEvent } from '../services/audit-types';
import * as shipmentService from '../services/shipment.service';

// Audit registrations (middleware resolves entityType from the path → 'shipments')
registerAuditEvent('POST', '/api/shipments', AuditEvent.SHIPMENT_CREATED);
registerAuditEvent('PUT', '/api/shipments/', AuditEvent.SHIPMENT_UPDATED);
registerAuditEvent('POST', '/api/shipments/', '/documents', AuditEvent.SHIPMENT_DOCUMENT_UPLOADED);
registerAuditEvent('DELETE', '/api/shipments/', '/documents/', AuditEvent.SHIPMENT_DOCUMENT_DELETED);
registerAuditEvent('POST', '/api/shipments/', '/costs', AuditEvent.SHIPMENT_COST_CREATED);
registerAuditEvent('PUT', '/api/shipments/', '/costs/', AuditEvent.SHIPMENT_COST_UPDATED);
registerAuditEvent('DELETE', '/api/shipments/', '/costs/', AuditEvent.SHIPMENT_COST_DELETED);

const router = Router();
const WRITE = [...SHIPMENT_WRITE_ROLES] as [Role, ...Role[]];

// Chứng từ uploads accept PDFs + images (B/L, C/O scans are usually PDFs).
// No sharp pipeline here — unlike trip photos these documents are stored as
// uploaded, never re-encoded.
const ALLOWED_DOC_EXTENSIONS: Record<string, true> = {
  pdf: true, jpg: true, jpeg: true, png: true, webp: true,
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB, mirrors /api/upload
});

function fileExtension(fileName: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName.trim());
  return match ? match[1].toLowerCase() : '';
}

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const result = await shipmentService.listShipments({
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
  });
  res.json(result);
}));

router.post('/', requireRoles(...WRITE), asyncHandler(async (req: Request, res: Response) => {
  const data = createShipmentSchema.parse(req.body);
  const shipment = await shipmentService.createShipment(data, getUser(req).userId);
  res.locals.auditEntityId = shipment.id;
  res.locals.auditEntityKey = shipment.shipmentCode;
  res.status(201).json(shipment);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  // NEPO-63 (QA 3b) — the viewer's role decides whether the payload carries
  // the per-lô Báo nợ: the service strips it for Giao nhận et al.
  res.json(await shipmentService.getShipmentDetail(Number(req.params.id), getUser(req).role));
}));

router.put('/:id', requireRoles(...WRITE), asyncHandler(async (req: Request, res: Response) => {
  const data = updateShipmentSchema.parse(req.body);
  const shipment = await shipmentService.updateShipment(Number(req.params.id), data);
  res.locals.auditEntityId = shipment.id;
  res.locals.auditEntityKey = shipment.shipmentCode;
  res.json(shipment);
}));

router.post('/:id/documents', requireRoles(...WRITE), upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, 'Thiếu file chứng từ');
  const data = registerShipmentDocumentSchema.parse(req.body);
  const ext = fileExtension(req.file.originalname);
  if (!ALLOWED_DOC_EXTENSIONS[ext]) {
    throw new ApiError(400, 'Chỉ chấp nhận file PDF, JPG, JPEG, PNG hoặc WEBP');
  }
  const shipmentId = Number(req.params.id);
  const storageKey = `shipments/${shipmentId}/${data.docType.toLowerCase()}-${randomUUID()}.${ext}`;
  await storageService.upload(req.file.buffer, storageKey);
  const row = await shipmentService.registerShipmentDocument(
    shipmentId, data,
    { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size },
    storageKey,
    getUser(req).userId,
  );
  res.locals.auditEntityId = shipmentId;
  res.status(201).json(row);
}));

router.delete('/:id/documents/:docId', requireRoles(...WRITE), asyncHandler(async (req: Request, res: Response) => {
  await shipmentService.deleteShipmentDocument(Number(req.params.id), Number(req.params.docId));
  res.json({ ok: true });
}));

router.get('/:id/documents/:docId/file', asyncHandler(async (req: Request, res: Response) => {
  const { document, buffer } = await shipmentService.readShipmentDocumentFile(
    Number(req.params.id), Number(req.params.docId),
  );
  res.setHeader('Content-Type', document.mimeType ?? 'application/octet-stream');
  const fileName = encodeURIComponent(document.fileName);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);
  res.send(buffer);
}));

router.post('/:id/costs', requireRoles(...WRITE), asyncHandler(async (req: Request, res: Response) => {
  const data = shipmentCostSchema.parse(req.body);
  const cost = await shipmentService.addShipmentCost(Number(req.params.id), data, getUser(req).userId);
  res.status(201).json(cost);
}));

router.put('/:id/costs/:costId', requireRoles(...WRITE), asyncHandler(async (req: Request, res: Response) => {
  const data = updateShipmentCostSchema.parse(req.body);
  res.json(await shipmentService.updateShipmentCost(Number(req.params.id), Number(req.params.costId), data));
}));

router.delete('/:id/costs/:costId', requireRoles(...WRITE), asyncHandler(async (req: Request, res: Response) => {
  const deleted = await shipmentService.deleteShipmentCost(Number(req.params.id), Number(req.params.costId));
  res.locals.auditEntityKey = deleted.description;
  res.json({ ok: true });
}));

// NEPO-62 — Bảng chi phí theo lô: fee rows grouped by FeeGroup in the debit
// note order (XUAT/NHAP) + derived truck-transfer section from linked trips.
router.get('/:id/costs/register', asyncHandler(async (req: Request, res: Response) => {
  // NEPO-63 r4 — role drives the per-row billing-status strip (Giao nhận null).
  res.json(await shipmentService.getLotCostRegister(Number(req.params.id), getUser(req).role));
}));

export default router;
