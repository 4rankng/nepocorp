import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, gte, lte, isNull, inArray, desc, type SQL } from 'drizzle-orm';
import { ApiError } from '../errors';
import { getSupplierStatement } from './statement.service';
import { BILLABLE_TRIP_STATUSES } from '@tingting/shared';
import type { Tx } from './trip-shared';
import type {
  BillingDocument,
  BillingDocumentDraft,
  BillingDocumentLine,
  BillingDraftLine,
  BillingDocumentType,
  BillingDocumentEntityType,
  SaveBillingDocumentInput,
  GenerateBillingDocumentInput,
} from '@tingting/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** DB stores containers as comma-joined text (this schema avoids PG arrays). */
export function splitContainers(raw: string | null): string[] | null {
  if (!raw) return null;
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : null;
}
export function joinContainers(list: string[] | null | undefined): string | null {
  if (!list || list.length === 0) return null;
  return list.filter(Boolean).join(', ');
}

/** Effective incl-VAT amount for a line: excluded → 0, else override ?? base. */
export function effectiveAmount(line: { excluded?: boolean | null; baseAmount: number; amountOverride?: number | null }): number {
  if (line.excluded) return 0;
  const override = line.amountOverride;
  return override != null ? Number(override) : Number(line.baseAmount);
}

export function docTotal(lines: BillingDocumentLine[]): number {
  return lines.reduce((sum, l) => sum + effectiveAmount(l), 0);
}

// ─── Generate (preview draft, pre-save) ───────────────────────────────────────

/**
 * Build AR debit-note lines for a customer + departure-date range.
 * Each LOCKED trip → a FREIGHT line (route + container separate) + its approved
 * ancillary sell fees (phí nộp hộ) → SERVICE_FEE lines.
 */
async function buildCustomerDebitLines(customerId: number, from: string, to: string): Promise<{ lines: BillingDraftLine[]; entityName: string }> {
  const [customer] = await db.select({ id: s.customers.id, name: s.customers.name })
    .from(s.customers).where(and(eq(s.customers.id, customerId), isNull(s.customers.deletedAt)));
  if (!customer) throw new ApiError(404, 'Không tìm thấy khách hàng');
  const entityName = customer.name;

  const conditions: SQL<unknown>[] = [
    eq(s.trips.customerId, customerId),
    inArray(s.trips.status, [...BILLABLE_TRIP_STATUSES]),
    isNull(s.trips.deletedAt),
    gte(s.trips.departureDate, from),
    lte(s.trips.departureDate, to),
  ];

  const trips = await db.select({
    id: s.trips.id, tripCode: s.trips.tripCode, departureDate: s.trips.departureDate,
    revenue: s.trips.revenue, routeName: s.routes.name,
  }).from(s.trips).leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .where(and(...conditions)).orderBy(s.trips.departureDate);

  const tripIds = trips.map((t) => t.id);
  const containersByTrip = await loadContainersByTrip(tripIds);
  const feesByTrip = await loadApprovedFeesByTrip(tripIds);

  const lines: BillingDraftLine[] = [];
  let sortOrder = 0;
  for (const trip of trips) {
    const containers = containersByTrip.get(trip.id) ?? null;
    lines.push({
      sourceType: 'TRIP', sourceId: trip.id, lineType: 'FREIGHT',
      description: `Cước vận chuyển${trip.routeName ? ` — ${trip.routeName}` : ''}${trip.tripCode ? ` (${trip.tripCode})` : ''}`,
      routeName: trip.routeName ?? null,
      containerNumbers: containers,
      baseAmount: Number(trip.revenue ?? 0),
      amountOverride: null, excluded: false, sortOrder: sortOrder++,
    });

    // Approved ancillary fees charged to customer (sell side) → phí nộp hộ
    const fees = feesByTrip.get(trip.id) ?? [];
    for (const fee of fees) {
      const amt = Number(fee.sellAmount ?? 0);
      if (amt <= 0) continue;
      lines.push({
        sourceType: 'EXPENSE', sourceId: fee.id, lineType: 'SERVICE_FEE',
        description: fee.billingLabel ?? fee.name ?? fee.expenseType,
        routeName: trip.routeName ?? null, containerNumbers: containers,
        baseAmount: amt, amountOverride: null, excluded: false, sortOrder: sortOrder++,
      });
    }
  }

  return { lines, entityName };
}

/** Build AP carrier lines: trips we outsourced to this carrier (externalCarrierId). */
async function buildCarrierPaymentLines(carrierId: number, from: string, to: string): Promise<{ lines: BillingDraftLine[]; entityName: string }> {
  const [carrier] = await db.select({ id: s.customers.id, name: s.customers.name })
    .from(s.customers).where(and(eq(s.customers.id, carrierId), isNull(s.customers.deletedAt)));
  if (!carrier) throw new ApiError(404, 'Không tìm thấy đối tác vận chuyển');
  const entityName = carrier.name;

  const trips = await db.select({
    id: s.trips.id, tripCode: s.trips.tripCode, departureDate: s.trips.departureDate,
    externalFreightCost: s.trips.externalFreightCost, routeName: s.routes.name,
  }).from(s.trips).leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .where(and(
      eq(s.trips.externalCarrierId, carrierId),
      inArray(s.trips.status, [...BILLABLE_TRIP_STATUSES]),
      isNull(s.trips.deletedAt),
      gte(s.trips.departureDate, from),
      lte(s.trips.departureDate, to),
    )).orderBy(s.trips.departureDate);

  const containersByTrip = await loadContainersByTrip(trips.map((t) => t.id));

  const lines: BillingDraftLine[] = [];
  let sortOrder = 0;
  for (const trip of trips) {
    const amt = Number(trip.externalFreightCost ?? 0);
    if (amt <= 0) continue;
    lines.push({
      sourceType: 'TRIP', sourceId: trip.id, lineType: 'FREIGHT',
      description: `Cước thuê ngoài${trip.routeName ? ` — ${trip.routeName}` : ''}${trip.tripCode ? ` (${trip.tripCode})` : ''}`,
      routeName: trip.routeName ?? null,
      containerNumbers: containersByTrip.get(trip.id) ?? null,
      baseAmount: amt, amountOverride: null, excluded: false, sortOrder: sortOrder++,
    });
  }
  return { lines, entityName };
}

/** Build AP supplier lines from the existing supplier statement (payable accruals). */
async function buildSupplierPaymentLines(supplierId: number, from: string, to: string): Promise<{ lines: BillingDraftLine[]; entityName: string }> {
  const statement = await getSupplierStatement(supplierId, from, to);
  if (!statement) throw new ApiError(404, 'Không tìm thấy nhà cung cấp');
  const entityName = statement.supplier.name;

  // Only payable accruals (credit > 0); exclude settlement payments.
  const lines: BillingDraftLine[] = [];
  let sortOrder = 0;
  for (const row of statement.ledgerRows) {
    const credit = Number(row.credit ?? 0);
    if (credit <= 0) continue;
    lines.push({
      sourceType: 'EXPENSE', sourceId: row.txnId ?? null, lineType: 'SERVICE_FEE',
      description: row.note || 'Chi phí nhà cung cấp',
      routeName: null, containerNumbers: null,
      baseAmount: credit, amountOverride: null, excluded: false, sortOrder: sortOrder++,
    });
  }
  return { lines, entityName };
}

async function loadContainersByTrip(tripIds: number[]): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (tripIds.length === 0) return map;
  const rows = await db.select({ tripId: s.tripContainers.tripId, containerNumber: s.tripContainers.containerNumber })
    .from(s.tripContainers).where(inArray(s.tripContainers.tripId, tripIds));
  for (const r of rows) {
    if (!map.has(r.tripId)) map.set(r.tripId, []);
    map.get(r.tripId)!.push(r.containerNumber);
  }
  return map;
}

/** Bulk-load approved ancillary fees (sell side) grouped by trip — avoids N+1 per trip. */
async function loadApprovedFeesByTrip(tripIds: number[]): Promise<Map<number, Array<{ id: number; sellAmount: string | null; expenseType: string; billingLabel: string | null; name: string | null }>>> {
  const map = new Map<number, Array<{ id: number; sellAmount: string | null; expenseType: string; billingLabel: string | null; name: string | null }>>();
  if (tripIds.length === 0) return map;
  const rows = await db.select({
    tripId: s.tripExpenses.tripId, id: s.tripExpenses.id,
    sellAmount: s.tripExpenses.sellAmount, expenseType: s.tripExpenses.expenseType,
    billingLabel: s.forwarderExpenseTypes.billingLabel, name: s.forwarderExpenseTypes.name,
  }).from(s.tripExpenses)
    .leftJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
    .where(and(inArray(s.tripExpenses.tripId, tripIds), eq(s.tripExpenses.approvalStatus, 'APPROVED')));
  for (const f of rows) {
    if (!map.has(f.tripId)) map.set(f.tripId, []);
    map.get(f.tripId)!.push(f);
  }
  return map;
}

export async function generateDraft(input: GenerateBillingDocumentInput): Promise<BillingDocumentDraft> {
  const { type, entityType, entityId, rangeFrom: from, rangeTo: to } = input;

  let result: { lines: BillingDraftLine[]; entityName: string };

  if (type === 'DEBIT_NOTE' && entityType === 'CUSTOMER') {
    result = await buildCustomerDebitLines(entityId, from, to);
  } else if (type === 'PAYMENT_STATEMENT' && entityType === 'CUSTOMER') {
    result = await buildCarrierPaymentLines(entityId, from, to);
  } else if (type === 'PAYMENT_STATEMENT' && entityType === 'VENDOR') {
    result = await buildSupplierPaymentLines(entityId, from, to);
  } else {
    // DEBIT_NOTE + VENDOR is not meaningful (debit notes are customer-facing AR only).
    throw new ApiError(400, 'Loại tài liệu không hợp lệ cho đối tượng này');
  }

  const total = result.lines.reduce((sum, l) => sum + effectiveAmount(l), 0);
  return { type, entityType, entityId, entityName: result.entityName, rangeFrom: from, rangeTo: to, lines: result.lines, totalInclVat: total };
}

// ─── Persistence (snapshot — never mutates ledger) ────────────────────────────

export async function saveDocument(input: SaveBillingDocumentInput, userId: number | null): Promise<BillingDocument> {
  const total = docTotal(input.lines as BillingDocumentLine[]);
  // Insert doc + lines atomically — a failure between them must not leave an
  // orphan document (or its lines half-written).
  const docId = await db.transaction(async (tx) => {
    const [doc] = await tx.insert(s.billingDocuments).values({
      type: input.type, entityType: input.entityType, entityId: input.entityId,
      entityName: input.entityName ?? null, rangeFrom: input.rangeFrom, rangeTo: input.rangeTo,
      note: input.note ?? null, totalInclVat: String(total), createdBy: userId,
    }).returning();
    if (!doc) throw new ApiError(500, 'Không lưu được tài liệu');
    await persistLines(tx, doc.id, input.lines);
    return doc.id;
  });
  return getDocument(docId);
}

export async function updateDocument(id: number, input: SaveBillingDocumentInput): Promise<BillingDocument> {
  const total = docTotal(input.lines as BillingDocumentLine[]);
  // Always-editable: replace lines on edit — delete + re-insert inside one
  // transaction so a mid-way failure cannot wipe the document's lines.
  await db.transaction(async (tx) => {
    await tx.update(s.billingDocuments).set({
      entityName: input.entityName ?? null, rangeFrom: input.rangeFrom, rangeTo: input.rangeTo,
      note: input.note ?? null, totalInclVat: String(total), updatedAt: new Date(),
    }).where(eq(s.billingDocuments.id, id));
    await tx.delete(s.billingDocumentLines).where(eq(s.billingDocumentLines.documentId, id));
    await persistLines(tx, id, input.lines);
  });
  return getDocument(id);
}

async function persistLines(tx: Tx, documentId: number, lines: BillingDocumentLine[]): Promise<void> {
  if (lines.length === 0) return;
  await tx.insert(s.billingDocumentLines).values(
    lines.map((l) => ({
      documentId,
      sourceType: l.sourceType, sourceId: l.sourceId ?? null, lineType: l.lineType,
      description: l.description, routeName: l.routeName ?? null,
      containerNumbers: joinContainers(l.containerNumbers),
      baseAmount: String(Number(l.baseAmount)),
      amountOverride: l.amountOverride != null ? String(Number(l.amountOverride)) : null,
      excluded: l.excluded ?? false, sortOrder: l.sortOrder ?? 0,
    })),
  );
}

export async function listDocuments(entityType: BillingDocumentEntityType, entityId: number, type?: BillingDocumentType): Promise<BillingDocument[]> {
  // Filter by `type` when provided so a customer who is also an external
  // carrier doesn't see their payment-statements mixed into the debit-note
  // list (both share entityType=CUSTOMER).
  const conds: SQL<unknown>[] = [
    eq(s.billingDocuments.entityType, entityType),
    eq(s.billingDocuments.entityId, entityId),
    isNull(s.billingDocuments.deletedAt),
  ];
  if (type) conds.push(eq(s.billingDocuments.type, type));
  const docs = await db.select().from(s.billingDocuments)
    .where(and(...conds))
    .orderBy(desc(s.billingDocuments.createdAt));
  return Promise.all(docs.map((d) => hydrateDocument(d)));
}

export async function getDocument(id: number): Promise<BillingDocument> {
  const [doc] = await db.select().from(s.billingDocuments)
    .where(and(eq(s.billingDocuments.id, id), isNull(s.billingDocuments.deletedAt))).limit(1);
  if (!doc) throw new ApiError(404, 'Không tìm thấy tài liệu');
  return hydrateDocument(doc);
}

async function hydrateDocument(doc: typeof s.billingDocuments.$inferSelect): Promise<BillingDocument> {
  const lines = await db.select().from(s.billingDocumentLines)
    .where(eq(s.billingDocumentLines.documentId, doc.id))
    .orderBy(s.billingDocumentLines.sortOrder);
  return {
    id: doc.id, type: doc.type as BillingDocumentType, entityType: doc.entityType as BillingDocumentEntityType,
    entityId: doc.entityId, entityName: doc.entityName ?? undefined,
    rangeFrom: doc.rangeFrom, rangeTo: doc.rangeTo, note: doc.note,
    totalInclVat: Number(doc.totalInclVat), createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString(),
    lines: lines.map((l) => ({
      id: l.id, documentId: l.documentId, sourceType: l.sourceType as BillingDocumentLine['sourceType'],
      sourceId: l.sourceId ?? null, lineType: l.lineType as BillingDocumentLine['lineType'],
      description: l.description, routeName: l.routeName,
      containerNumbers: splitContainers(l.containerNumbers),
      baseAmount: Number(l.baseAmount), amountOverride: l.amountOverride != null ? Number(l.amountOverride) : null,
      excluded: l.excluded, sortOrder: l.sortOrder,
    })),
  };
}

export async function deleteDocument(id: number): Promise<void> {
  await db.update(s.billingDocuments).set({ deletedAt: new Date() })
    .where(eq(s.billingDocuments.id, id));
}

// ─── Excel export ─────────────────────────────────────────────────────────────

const SERVICE_FEE_EXPORT_LABELS: Record<string, string> = {
  LIFTING: 'Phí nâng container',
  LOWERING: 'Phí hạ container',
  CUSTOMS: 'Phí hải quan',
  INFRASTRUCTURE: 'Phí hạ tầng',
  WEIGHING: 'Phí cân hàng',
  INSPECTION: 'Phí kiểm hóa',
  INSPECTION_SVC: 'Phí dịch vụ kiểm hóa',
  OTHER: 'Phí chi hộ khác',
};

function exportDescription(line: BillingDocumentLine): string {
  const raw = line.description?.trim() ?? '';
  if (line.lineType !== 'SERVICE_FEE') return raw;
  return SERVICE_FEE_EXPORT_LABELS[raw.toUpperCase()] ?? raw;
}

function formatVietnameseDate(raw: string): string {
  const [year, month, day] = raw.split('-');
  if (!year || !month || !day) return raw;
  return `${day}/${month}/${year}`;
}

export async function buildBillingXlsx(doc: BillingDocument): Promise<Buffer> {
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = (ExcelJSMod as Record<string, unknown>).default
    ? ((ExcelJSMod as Record<string, unknown>).default as typeof ExcelJSMod)
    : ExcelJSMod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NEPO Logistics';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet(doc.type === 'DEBIT_NOTE' ? 'Giấy báo nợ' : 'Bảng kê thanh toán');
  const isDebitNote = doc.type === 'DEBIT_NOTE';
  const title = isDebitNote ? 'GIẤY BÁO NỢ' : 'BẢNG KÊ THANH TOÁN';
  const entityLabel = isDebitNote ? 'Khách hàng' : 'Đối tác';
  const tableStart = doc.note ? 6 : 5;
  const dataStart = tableStart + 1;

  ws.properties.defaultRowHeight = 22;
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.35, right: 0.35, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2,
    },
  };
  ws.views = [{ state: 'frozen', ySplit: tableStart }];

  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = title;
  ws.getCell('A1').font = { name: 'Arial', bold: true, size: 18, color: { argb: 'FF111827' } };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:D2');
  ws.getCell('A2').value = `${entityLabel}: ${doc.entityName ?? ''}`;
  ws.getCell('A2').font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A3:D3');
  ws.getCell('A3').value = `Kỳ: ${formatVietnameseDate(doc.rangeFrom)} - ${formatVietnameseDate(doc.rangeTo)}`;
  ws.getCell('A3').font = { name: 'Arial', size: 11, color: { argb: 'FF374151' } };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  if (doc.note) {
    ws.mergeCells('A4:D4');
    ws.getCell('A4').value = `Ghi chú: ${doc.note}`;
    ws.getCell('A4').font = { name: 'Arial', italic: true, size: 10, color: { argb: 'FF4B5563' } };
    ws.getCell('A4').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    ws.getRow(4).height = 30;
  }

  for (let r = 1; r <= 5; r++) {
    ws.getRow(r).eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    });
  }

  const headerRow = ws.getRow(tableStart);
  headerRow.values = ['Diễn giải', 'Số cont', 'ĐVT', 'Số tiền (VNĐ)'];
  headerRow.height = 26;
  headerRow.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1F2937' } },
      left: { style: 'thin', color: { argb: 'FF1F2937' } },
      bottom: { style: 'thin', color: { argb: 'FF1F2937' } },
      right: { style: 'thin', color: { argb: 'FF1F2937' } },
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  });

  let rowIdx = dataStart;
  const amountRows: number[] = [];
  let lineIdx = 0;
  while (lineIdx < doc.lines.length) {
    const routeName = doc.lines[lineIdx]?.routeName ?? '';
    let groupEnd = lineIdx + 1;
    while (groupEnd < doc.lines.length && (doc.lines[groupEnd]?.routeName ?? '') === routeName) groupEnd += 1;
    const groupLines = doc.lines.slice(lineIdx, groupEnd).filter((line) => !line.excluded);
    lineIdx = groupEnd;
    if (groupLines.length === 0) continue;

    const subtotal = groupLines.reduce((sum, line) => sum + effectiveAmount(line), 0);
    const routeRow = ws.getRow(rowIdx++);
    routeRow.values = [
      `Tuyến: ${routeName || 'Chưa có tuyến'} (${groupLines.length} dòng)`,
      '',
      '',
      subtotal,
    ];
    ws.mergeCells(routeRow.number, 1, routeRow.number, 3);
    routeRow.height = 28;
    routeRow.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF123B2A' } };
    routeRow.alignment = { vertical: 'middle', wrapText: false };
    routeRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF5EF' } };
      if (colNumber === 4) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    for (const line of groupLines) {
      const amt = effectiveAmount(line);
      const row = ws.getRow(rowIdx++);
      amountRows.push(row.number);
      row.values = [
        exportDescription(line),
        (line.containerNumbers ?? []).join(', '),
        'lần',
        amt || 0,
      ];
      row.height = 24;
      row.font = { name: 'Arial', size: 10, color: { argb: 'FF111827' } };
      row.alignment = { vertical: 'middle', wrapText: false };
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = {
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
        if (colNumber === 4) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
      if (line.lineType !== 'FREIGHT') {
        row.getCell(1).font = { name: 'Arial', italic: true, color: { argb: 'FF4B5563' } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
      }
      if (line.amountOverride != null && line.amountOverride !== line.baseAmount) {
        row.getCell(4).font = { name: 'Arial', bold: true, color: { argb: 'FF111827' } };
      }
    }
  }

  const formula = amountRows.length > 0 ? `SUM(${amountRows.map((row) => `D${row}`).join(',')})` : '0';
  const totalRow = ws.getRow(rowIdx + 1);
  totalRow.values = ['TỔNG CỘNG', '', '', {
    formula,
    result: doc.totalInclVat,
  }];
  ws.mergeCells(totalRow.number, 1, totalRow.number, 3);
  totalRow.height = 28;
  totalRow.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF111827' } };
  totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(4).numFmt = '#,##0';
  totalRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF111827' } },
      bottom: { style: 'double', color: { argb: 'FF111827' } },
    };
  });

  ws.columns = [
    { width: 72 }, { width: 28 }, { width: 10 }, { width: 18 },
  ];
  ws.getColumn(1).alignment = { wrapText: false, vertical: 'middle' };
  ws.getColumn(2).alignment = { wrapText: false, vertical: 'middle' };
  ws.getColumn(3).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getColumn(4).numFmt = '#,##0';

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}
