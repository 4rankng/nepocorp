import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, gte, lte, isNull, inArray, desc, type SQL } from 'drizzle-orm';
import { ApiError } from '../errors';
import { getSupplierStatement } from './statement.service';
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
    eq(s.trips.status, 'LOCKED'),
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
      eq(s.trips.status, 'LOCKED'),
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

export async function buildBillingXlsx(doc: BillingDocument): Promise<Buffer> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(doc.type === 'DEBIT_NOTE' ? 'Giấy báo nợ' : 'Bảng kê thanh toán');

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = doc.type === 'DEBIT_NOTE' ? 'GIẤY BÁO NỢ' : 'BẢNG KÊ THANH TOÁN';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  ws.getCell('A2').value = `${doc.type === 'DEBIT_NOTE' ? 'Khách hàng' : 'Đối tác'}: ${doc.entityName ?? ''}`;
  ws.getCell('A3').value = `Kỳ: ${doc.rangeFrom} → ${doc.rangeTo}`;
  if (doc.note) ws.getCell('A4').value = doc.note;

  const headerRow = ws.getRow(6);
  headerRow.values = ['Diễn giải', 'Tuyến', 'Số Cont', 'ĐVT', 'Số tiền (VNĐ)', ''];
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.border = { bottom: { style: 'thin' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  let rowIdx = 7;
  for (const line of doc.lines) {
    if (line.excluded) continue;
    const amt = effectiveAmount(line);
    const row = ws.getRow(rowIdx++);
    row.values = [
      line.description,
      line.routeName ?? '',
      (line.containerNumbers ?? []).join(', '),
      'lần',
      amt,
      '',
    ];
    if (line.lineType !== 'FREIGHT') {
      row.getCell(1).font = { italic: true, color: { argb: 'FF555555' } };
    }
    if (line.amountOverride != null && line.amountOverride !== line.baseAmount) {
      row.getCell(5).font = { bold: true };
    }
  }

  const totalRow = ws.getRow(rowIdx + 1);
  totalRow.values = ['', '', '', 'TỔNG CỘNG', doc.totalInclVat, ''];
  totalRow.font = { bold: true };
  totalRow.getCell(5).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

  ws.columns = [
    { width: 44 }, { width: 22 }, { width: 22 }, { width: 8 }, { width: 16 }, { width: 2 },
  ];
  ws.getColumn(5).numFmt = '#,##0';

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}
