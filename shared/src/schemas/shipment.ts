/**
 * Lô hàng (Shipment) input schemas — NEPO-61.
 *
 * The shipment is the sea-freight parent object: sea booking fields, customs
 * declaration, uploaded documents (B/L, C/O, kiểm dịch, hun trùng), manual
 * costs and the link target for truck trips. Trip running costs are NOT
 * entered here — they flow from the linked trips into the lô profit.
 */
import { z } from 'zod';
import { partialUpdateSchema } from './partial-update';
import { FeeGroup, ShipmentDocType } from '../constants';

const shipmentDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có dạng YYYY-MM-DD');

const optionalShortText = (max: number) => z.string().trim().max(max).optional().nullable();

export const createShipmentSchema = z.object({
  customerId: z.coerce.number().int().positive({ message: 'Khách hàng là bắt buộc' }),
  // NEPO-62 — Hàng Xuất / Hàng Nhập decides the debit-note fee order.
  flowType: z.enum(['XUAT', 'NHAP']).nullable().optional(),
  shippingLine: optionalShortText(120),
  bookingNo: optionalShortText(100),
  blNo: optionalShortText(100),
  vesselVoyage: optionalShortText(120),
  pol: optionalShortText(100),
  pod: optionalShortText(100),
  etd: shipmentDate.nullable().optional(),
  eta: shipmentDate.nullable().optional(),
  cutoffDate: shipmentDate.nullable().optional(),
  containerSeals: z.string().max(2000).optional().nullable(),
  customsDeclarationNo: optionalShortText(100),
  customsDeclarationDate: shipmentDate.nullable().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateShipmentSchema = partialUpdateSchema(createShipmentSchema);

// NEPO-62 — per-row economics of a lot cost line. direction = Thu khách vs
// Trả NCC; serviceMode = Dịch vụ vs Nộp hộ. USD rows carry fxAmount +
// exchangeRate and the server derives the VND integer; VND rows must not
// carry fx fields. awaitingInvoice = "Chờ hóa đơn": printed on the debit note
// with a blank amount and never added to the total.
export const shipmentCostSchema = z.object({
  costType: z.nativeEnum(FeeGroup),
  direction: z.enum(['CUSTOMER', 'SUPPLIER']),
  serviceMode: z.enum(['SERVICE', 'ADVANCE']).default('SERVICE'),
  description: z.string().trim().min(1, 'Diễn giải là bắt buộc').max(500),
  currency: z.enum(['VND', 'USD']).default('VND'),
  // Plain numbers, not coerce — coerce(undefined) becomes NaN and the VND rows
  // legitimately omit the fx pair. Refinement below enforces per-currency shape.
  fxAmount: z.number().positive('Số tiền gốc phải dương').nullable().optional(),
  exchangeRate: z.number().positive('Tỷ giá phải dương').nullable().optional(),
  // USD rows derive the VND integer server-side — amount is omitted there.
  amount: z.number().min(0, 'Phải là số không âm').optional(),
  vatRate: z.coerce.number().min(0).max(0.5).default(0.08),
  awaitingInvoice: z.coerce.boolean().default(false),
  incurredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phát sinh phải có dạng YYYY-MM-DD'),
  note: z.string().trim().max(500).optional().nullable(),
  // Phải trả attribution — NCC mà dòng Trả NCC này đang nợ (đối soát, NEPO-68).
  supplierId: z.coerce.number().int().positive().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.currency === 'USD') {
    if (data.fxAmount == null || data.exchangeRate == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['fxAmount'],
        message: 'Dòng USD cần số tiền gốc và tỷ giá quy đổi',
      });
    }
  } else {
    if (data.fxAmount != null || data.exchangeRate != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['fxAmount'],
        message: 'Chỉ dòng USD mới có số tiền gốc và tỷ giá',
      });
    }
    if (data.amount == null || data.amount <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Dòng VND cần số tiền không âm',
      });
    }
  }
});

export const updateShipmentCostSchema = partialUpdateSchema(shipmentCostSchema);

/** Register one uploaded document against a shipment (file already stored via /upload). */
export const registerShipmentDocumentSchema = z.object({
  docType: z.nativeEnum(ShipmentDocType),
  note: z.string().max(500).optional().nullable(),
});

/** Attach/detach a truck trip to a shipment (PATCH /trips/:id/shipment). */
export const linkTripShipmentSchema = z.object({
  shipmentId: z.coerce.number().int().positive().nullable(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export type ShipmentCostInput = z.infer<typeof shipmentCostSchema>;
export type ShipmentCostUpdateInput = z.infer<typeof updateShipmentCostSchema>;
export type RegisterShipmentDocumentInput = z.infer<typeof registerShipmentDocumentSchema>;
export type LinkTripShipmentInput = z.infer<typeof linkTripShipmentSchema>;
