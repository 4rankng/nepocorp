import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, gte, lte, isNull, inArray, desc, type SQL } from 'drizzle-orm';
import { ApiError } from '../errors';
import { getSupplierStatement } from './statement.service';
import { BILLABLE_TRIP_STATUSES, LoadingType } from '@tingting/shared';
import type { Tx } from './trip-shared';
import { storageService } from './storage.service';
import type {
  BillingDocument,
  BillingDocumentDraft,
  BillingDocumentLine,
  BillingLineRenderData,
  BillingDraftLine,
  BillingDocumentType,
  BillingDocumentEntityType,
  SaveBillingDocumentInput,
  GenerateBillingDocumentInput,
  DebitNoteTemplate,
  DebitNoteTemplateColumn,
  DebitNoteTemplateSnapshot,
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

// ─── Debit-note templates ─────────────────────────────────────────────────────

const DEFAULT_DEBIT_NOTE_COLUMNS: DebitNoteTemplateColumn[] = [
  { id: 'stt', label: 'Stt', variable: 'rowIndex', width: 6, align: 'center', format: 'number', total: false },
  { id: 'ngay', label: 'Ngày\nthực hiện', variable: 'departureDate', width: 12, align: 'center', format: 'date', total: false },
  { id: 'bien_so', label: 'Biển số xe', variable: 'truckPlate', width: 12, align: 'center', format: 'text', total: false },
  { id: 'dong_tra', label: 'Đóng/ Trả', variable: 'actionType', width: 10, align: 'center', format: 'text', total: false },
  { id: 'diem_di', label: 'Điểm đi/ về', variable: 'origin', width: 24, align: 'left', format: 'text', total: false },
  { id: 'diem_hang', label: 'Điểm đóng/ trả hàng', variable: 'destination', width: 32, align: 'left', format: 'text', total: false },
  { id: 'dia_chi_hang', label: 'Điểm đóng/ trả hàng', variable: 'deliveryAddress', width: 40, align: 'left', format: 'text', total: false },
  { id: 'sl20', label: "20'", variable: 'container20Count', width: 8, align: 'center', format: 'number', total: true },
  { id: 'sl40', label: "40'", variable: 'container40Count', width: 8, align: 'center', format: 'number', total: true },
  { id: 'so_cont', label: 'Số hiệu cont', variable: 'containerNumbers', width: 18, align: 'left', format: 'text', total: false },
  { id: 'gia_vc', label: 'Giá VC\n(Chưa VAT)', variable: 'amount', width: 16, align: 'right', format: 'currency', total: true },
  { id: 'ghi_chu', label: 'Ghi chú', variable: 'note', width: 14, align: 'left', format: 'text', total: false },
];

function normalizeTemplateColumns(cols: unknown): DebitNoteTemplateColumn[] {
  return Array.isArray(cols) && cols.length > 0
    ? cols as DebitNoteTemplateColumn[]
    : DEFAULT_DEBIT_NOTE_COLUMNS;
}

function rowToTemplate(row: typeof s.debitNoteTemplates.$inferSelect): DebitNoteTemplate {
  return {
    id: row.id, name: row.name, isDefault: row.isDefault,
    documentType: row.documentType as DebitNoteTemplate['documentType'],
    logoStorageKey: row.logoStorageKey, titleText: row.titleText,
    issuerName: row.issuerName, issuerAddress: row.issuerAddress, issuerTaxCode: row.issuerTaxCode,
    accentColor: row.accentColor,
    showContainerColumn: row.showContainerColumn, showUnitColumn: row.showUnitColumn,
    groupingMode: row.groupingMode as DebitNoteTemplate['groupingMode'],
    columns: normalizeTemplateColumns(row.columns),
    amountInWords: row.amountInWords, orientation: row.orientation as DebitNoteTemplate['orientation'],
    termsText: row.termsText, signatureLeftLabel: row.signatureLeftLabel, signatureRightLabel: row.signatureRightLabel,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

export async function getDebitNoteTemplate(id: number): Promise<DebitNoteTemplate | null> {
  const [row] = await db.select().from(s.debitNoteTemplates)
    .where(and(eq(s.debitNoteTemplates.id, id), isNull(s.debitNoteTemplates.deletedAt))).limit(1);
  return row ? rowToTemplate(row) : null;
}

export async function getDefaultDebitNoteTemplate(): Promise<DebitNoteTemplate | null> {
  const [row] = await db.select().from(s.debitNoteTemplates)
    .where(and(eq(s.debitNoteTemplates.isDefault, true), isNull(s.debitNoteTemplates.deletedAt))).limit(1);
  return row ? rowToTemplate(row) : null;
}

/**
 * Resolve the template for a debit-note export. Non-DEBIT_NOTE docs always
 * return null (prevents vendor PAYMENT_STATEMENT exports from inheriting AR
 * styling). Order: explicit override → customer override → global default.
 * Soft-deleted templates are skipped (fall through to the next source).
 */
export async function resolveDebitNoteTemplate(opts: {
  templateIdOverride?: number | null;
  customerTemplateId?: number | null;
  docType?: string;
}): Promise<DebitNoteTemplate | null> {
  if (opts.docType && opts.docType !== 'DEBIT_NOTE') return null;
  if (opts.templateIdOverride) {
    const t = await getDebitNoteTemplate(opts.templateIdOverride);
    if (t) return t;
  }
  if (opts.customerTemplateId) {
    const t = await getDebitNoteTemplate(opts.customerTemplateId);
    if (t) return t;
  }
  return getDefaultDebitNoteTemplate();
}

/** Frozen render-only copy written onto each saved billing document. */
export function templateToSnapshot(t: DebitNoteTemplate): DebitNoteTemplateSnapshot {
  return {
    id: t.id, name: t.name, titleText: t.titleText,
    issuerName: t.issuerName, issuerAddress: t.issuerAddress, issuerTaxCode: t.issuerTaxCode,
    accentColor: t.accentColor,
    showContainerColumn: t.showContainerColumn, showUnitColumn: t.showUnitColumn,
    groupingMode: t.groupingMode, columns: normalizeTemplateColumns(t.columns), orientation: t.orientation,
    termsText: t.termsText, signatureLeftLabel: t.signatureLeftLabel, signatureRightLabel: t.signatureRightLabel,
    logoStorageKey: t.logoStorageKey,
  };
}

/**
 * Resolve the snapshot to render a doc with, applying the export precedence:
 * explicit `?templateId=` override → the doc's frozen snapshot (history
 * stability) → customer's assigned template → global default. Non-DEBIT_NOTE
 * docs return null (caller falls back to the legacy renderer).
 */
export async function resolveDebitNoteTemplateForDoc(
  doc: { type: string; entityType: string; entityId: number; debitNoteTemplateSnapshot?: DebitNoteTemplateSnapshot | null },
  opts: { templateIdOverride?: number | null } = {},
): Promise<DebitNoteTemplateSnapshot | null> {
  if (doc.type !== 'DEBIT_NOTE') return null;
  if (opts.templateIdOverride && opts.templateIdOverride > 0) {
    const t = await getDebitNoteTemplate(opts.templateIdOverride);
    if (t) return templateToSnapshot(t);
  }
  if (doc.debitNoteTemplateSnapshot) return doc.debitNoteTemplateSnapshot;
  let customerTemplateId: number | null = null;
  if (doc.entityType === 'CUSTOMER') {
    const [cust] = await db.select({ tplId: s.customers.debitNoteTemplateId })
      .from(s.customers).where(eq(s.customers.id, doc.entityId)).limit(1);
    customerTemplateId = cust?.tplId ?? null;
  }
  const t = await resolveDebitNoteTemplate({ customerTemplateId, docType: doc.type });
  return t ? templateToSnapshot(t) : null;
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
    revenue: s.trips.revenue, routeName: s.routes.name, notes: s.trips.notes,
    truckPlate: s.trucks.licensePlate, externalPlateNumber: s.trips.externalPlateNumber,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .where(and(...conditions)).orderBy(s.trips.departureDate);

  const tripIds = trips.map((t) => t.id);
  const containersByTrip = await loadContainersByTrip(tripIds);
  const legsByTrip = await loadLegRenderDataByTrip(tripIds);
  const feesByTrip = await loadApprovedFeesByTrip(tripIds);

  const lines: BillingDraftLine[] = [];
  let sortOrder = 0;
  for (const trip of trips) {
    const containerInfo = containersByTrip.get(trip.id) ?? [];
    const containers = containerNumbers(containerInfo);
    const renderData = buildTripRenderData({
      trip,
      containers: containerInfo,
      legs: legsByTrip.get(trip.id),
      note: trip.notes ?? null,
    });
    lines.push({
      sourceType: 'TRIP', sourceId: trip.id, lineType: 'FREIGHT',
      description: `Cước vận chuyển${trip.routeName ? ` — ${trip.routeName}` : ''}${trip.tripCode ? ` (${trip.tripCode})` : ''}`,
      typeLabel: 'Doanh thu',
      unit: 'lần',
      routeName: trip.routeName ?? null,
      containerNumbers: containers,
      renderData,
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
        typeLabel: 'Phí chi hộ',
        unit: 'lần',
        routeName: trip.routeName ?? null, containerNumbers: containers,
        renderData: { ...renderData, note: fee.billingLabel ?? fee.name ?? fee.expenseType },
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
      typeLabel: 'Doanh thu',
      unit: 'lần',
      routeName: trip.routeName ?? null,
      containerNumbers: containerNumbers(containersByTrip.get(trip.id) ?? []),
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
      typeLabel: 'Phí chi hộ',
      unit: 'lần',
      routeName: null, containerNumbers: null,
      baseAmount: credit, amountOverride: null, excluded: false, sortOrder: sortOrder++,
    });
  }
  return { lines, entityName };
}

type ContainerRenderInfo = { containerNumber: string; containerTypeCode: string | null; containerTypeName: string | null };
type LegRenderInfo = { origin: string | null; destination: string | null; loadingType: LoadingType | null };

function containerNumbers(containers: ContainerRenderInfo[]): string[] | null {
  const list = containers.map((c) => c.containerNumber).filter(Boolean);
  return list.length > 0 ? list : null;
}

function countContainers(containers: ContainerRenderInfo[], size: '20' | '40'): number {
  return containers.filter((c) => {
    const label = `${c.containerTypeCode ?? ''} ${c.containerTypeName ?? ''}`.toUpperCase();
    return label.startsWith(size) || label.includes(`${size}'`) || label.includes(`${size}FT`);
  }).length;
}

function buildTripRenderData(input: {
  trip: {
    tripCode: string | null;
    departureDate: string;
    routeName: string | null;
    notes: string | null;
    truckPlate: string | null;
    externalPlateNumber: string | null;
  };
  containers: ContainerRenderInfo[];
  legs?: LegRenderInfo;
  note?: string | null;
}): BillingLineRenderData {
  const containerCount = input.containers.length;
  return {
    tripCode: input.trip.tripCode ?? null,
    departureDate: input.trip.departureDate,
    truckPlate: input.trip.truckPlate ?? input.trip.externalPlateNumber ?? null,
    // BK VIETSUN-style "Đóng / Trả" mapping. HANG = loaded leg (ĐÓNG) = "delivering",
    // VO = empty return leg (TRẢ) = "returning without cargo". Null if the source
    // billing line has no legs (e.g. ADHOC service fees) — users hide the column
    // for those templates.
    actionType: input.legs?.loadingType === 'HANG' ? 'ĐÓNG'
              : input.legs?.loadingType === 'VO'   ? 'TRẢ'
              : null,
    origin: input.legs?.origin ?? null,
    destination: input.trip.routeName ?? input.legs?.destination ?? null,
    deliveryAddress: input.legs?.destination ?? input.trip.routeName ?? null,
    container20Count: countContainers(input.containers, '20') || null,
    container40Count: countContainers(input.containers, '40') || null,
    containerCount: containerCount || null,
    note: input.note ?? null,
  };
}

async function loadContainersByTrip(tripIds: number[]): Promise<Map<number, ContainerRenderInfo[]>> {
  const map = new Map<number, ContainerRenderInfo[]>();
  if (tripIds.length === 0) return map;
  const rows = await db.select({
    tripId: s.tripContainers.tripId,
    containerNumber: s.tripContainers.containerNumber,
    containerTypeCode: s.containerTypes.code,
    containerTypeName: s.containerTypes.name,
  }).from(s.tripContainers)
    .leftJoin(s.containerTypes, eq(s.tripContainers.containerTypeId, s.containerTypes.id))
    .where(inArray(s.tripContainers.tripId, tripIds));
  for (const r of rows) {
    if (!map.has(r.tripId)) map.set(r.tripId, []);
    map.get(r.tripId)!.push({
      containerNumber: r.containerNumber,
      containerTypeCode: r.containerTypeCode ?? null,
      containerTypeName: r.containerTypeName ?? null,
    });
  }
  return map;
}

async function loadLegRenderDataByTrip(tripIds: number[]): Promise<Map<number, LegRenderInfo>> {
  const map = new Map<number, LegRenderInfo>();
  if (tripIds.length === 0) return map;
  const rows = await db.select({
    tripId: s.tripLegs.tripId,
    sequence: s.tripLegs.sequence,
    origin: s.tripLegs.origin,
    destination: s.tripLegs.destination,
    loadingType: s.tripLegs.loadingType,
  }).from(s.tripLegs)
    .where(inArray(s.tripLegs.tripId, tripIds))
    .orderBy(s.tripLegs.tripId, s.tripLegs.sequence);
  for (const r of rows) {
    const existing = map.get(r.tripId);
    if (!existing) {
      map.set(r.tripId, { origin: r.origin, destination: r.destination, loadingType: r.loadingType as LoadingType });
    } else {
      existing.destination = r.destination;
      // Last-leg loadingType wins (matches the "destination" semantics — same leg).
      existing.loadingType = r.loadingType as LoadingType;
    }
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
  // Resolve the debit-note template (DEBIT_NOTE only) and freeze a render-only
  // snapshot onto the doc so re-exports stay stable after the template is
  // edited/deleted. The frontend passes its chosen templateId; if absent, fall
  // back to the customer's assigned template, then the global default.
  let resolvedTemplateId = input.debitNoteTemplateId ?? null;
  if (input.type === 'DEBIT_NOTE' && resolvedTemplateId == null && input.entityType === 'CUSTOMER') {
    const [cust] = await db.select({ tplId: s.customers.debitNoteTemplateId })
      .from(s.customers).where(eq(s.customers.id, input.entityId)).limit(1);
    resolvedTemplateId = cust?.tplId ?? null;
  }
  const template = input.type === 'DEBIT_NOTE'
    ? await resolveDebitNoteTemplate({ templateIdOverride: resolvedTemplateId, docType: input.type })
    : null;
  const snapshot = template ? templateToSnapshot(template) : null;
  // Insert doc + lines atomically — a failure between them must not leave an
  // orphan document (or its lines half-written).
  const docId = await db.transaction(async (tx) => {
    const [doc] = await tx.insert(s.billingDocuments).values({
      type: input.type, entityType: input.entityType, entityId: input.entityId,
      entityName: input.entityName ?? null, rangeFrom: input.rangeFrom, rangeTo: input.rangeTo,
      note: input.note ?? null, totalInclVat: String(total), createdBy: userId,
      debitNoteTemplateId: template?.id ?? null,
      debitNoteTemplateSnapshot: snapshot,
    }).returning();
    if (!doc) throw new ApiError(500, 'Không lưu được tài liệu');
    await persistLines(tx, doc.id, input.lines);
    return doc.id;
  });
  return getDocument(docId);
}

export async function updateDocument(id: number, input: SaveBillingDocumentInput): Promise<BillingDocument> {
  const total = docTotal(input.lines as BillingDocumentLine[]);
  // Re-snapshot on every edit so the doc never shows stale template styling on
  // new line data (the doc is always-editable; snapshot = last-saved render
  // state). Preserve the existing template link unless the builder sent an
  // explicit pick (number or null); only re-resolve the customer/default chain
  // when there is no link to carry forward.
  const [existing] = await db.select({ tplId: s.billingDocuments.debitNoteTemplateId })
    .from(s.billingDocuments).where(eq(s.billingDocuments.id, id)).limit(1);
  let resolvedTemplateId = input.debitNoteTemplateId !== undefined
    ? (input.debitNoteTemplateId ?? null)
    : (existing?.tplId ?? null);
  if (input.type === 'DEBIT_NOTE' && resolvedTemplateId == null && input.entityType === 'CUSTOMER') {
    const [cust] = await db.select({ tplId: s.customers.debitNoteTemplateId })
      .from(s.customers).where(eq(s.customers.id, input.entityId)).limit(1);
    resolvedTemplateId = cust?.tplId ?? null;
  }
  const template = input.type === 'DEBIT_NOTE'
    ? await resolveDebitNoteTemplate({ templateIdOverride: resolvedTemplateId, docType: input.type })
    : null;
  const snapshot = template ? templateToSnapshot(template) : null;
  // Always-editable: replace lines on edit — delete + re-insert inside one
  // transaction so a mid-way failure cannot wipe the document's lines.
  await db.transaction(async (tx) => {
    await tx.update(s.billingDocuments).set({
      entityName: input.entityName ?? null, rangeFrom: input.rangeFrom, rangeTo: input.rangeTo,
      note: input.note ?? null, totalInclVat: String(total), updatedAt: new Date(),
      debitNoteTemplateId: template?.id ?? null,
      debitNoteTemplateSnapshot: snapshot,
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
      typeLabel: l.typeLabel, unit: l.unit,
      description: l.description, routeName: l.routeName ?? null,
      containerNumbers: joinContainers(l.containerNumbers),
      renderData: l.renderData ? { ...l.renderData } : null,
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
    debitNoteTemplateId: doc.debitNoteTemplateId ?? null,
    debitNoteTemplateSnapshot: (doc.debitNoteTemplateSnapshot as DebitNoteTemplateSnapshot | null) ?? null,
    createdAt: doc.createdAt.toISOString(), updatedAt: doc.updatedAt.toISOString(),
    lines: lines.map((l) => ({
      id: l.id, documentId: l.documentId, sourceType: l.sourceType as BillingDocumentLine['sourceType'],
      sourceId: l.sourceId ?? null, lineType: l.lineType as BillingDocumentLine['lineType'],
      typeLabel: l.typeLabel, unit: l.unit,
      description: l.description, routeName: l.routeName,
      containerNumbers: splitContainers(l.containerNumbers),
      renderData: (l.renderData as BillingLineRenderData | null) ?? null,
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

function formatMonthYear(raw: string): string {
  const [year, month] = raw.split('-');
  if (!year || !month) return raw;
  return `${month}.${year}`;
}

// Verbatim legacy renderer (pre-template). Kept move-only so the regression
// oracle holds: buildBillingXlsx(doc, null) delegates here and is byte-identical
// to pre-template output for BOTH DEBIT_NOTE and PAYMENT_STATEMENT docs.
export async function buildLegacyXlsx(doc: BillingDocument): Promise<Buffer> {
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
        line.unit,
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

// ─── Template-driven export (DEBIT_NOTE only) ────────────────────────────────

/** Convert a #RRGGBB (or RRGGBB) accent to an ExcelJS ARGB color string. */
function hexToArgb(hex: string): string {
  const h = (hex || '').replace('#', '').padStart(6, '0').slice(-6);
  return ('FF' + h).toUpperCase();
}

/** 1-based column index → Excel letter (1→A, 2→B, …, 27→AA). */
function colLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function renderColumnValue(line: BillingDocumentLine, col: DebitNoteTemplateColumn, rowIndex: number): string | number | Date | null {
  const data = line.renderData ?? {};
  const routeParts = splitRouteName(line.routeName ?? '');
  switch (col.variable) {
    case 'rowIndex': return rowIndex;
    case 'departureDate': {
      const raw = data.departureDate;
      if (!raw) return null;
      const date = new Date(`${raw}T00:00:00`);
      return Number.isNaN(date.getTime()) ? String(raw) : date;
    }
    case 'truckPlate': return data.truckPlate ?? null;
    case 'actionType': return data.actionType ?? null;
    case 'origin': return data.origin ?? routeParts?.origin ?? null;
    case 'destination': return data.destination ?? routeParts?.destination ?? line.routeName ?? null;
    case 'deliveryAddress': return data.deliveryAddress ?? null;
    case 'container20Count': return data.container20Count ?? null;
    case 'container40Count': return data.container40Count ?? null;
    case 'containerNumbers': return (line.containerNumbers ?? []).join(', ') || null;
    case 'routeName': return line.routeName ?? null;
    case 'description': return exportDescription(line);
    case 'lineTypeLabel': return line.typeLabel;
    case 'unit': return line.unit;
    case 'amount': return effectiveAmount(line) || 0;
    case 'note': return data.note ?? null;
    case 'tripCode': return data.tripCode ?? (line.sourceType === 'TRIP' ? String(line.sourceId ?? '') : null);
    default: return null;
  }
}

function splitRouteName(routeName: string): { origin: string; destination: string } | null {
  const normalized = routeName.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const separator = normalized.match(/\s[-–—]\s/);
  if (!separator || separator.index === undefined) return null;
  const origin = normalized.slice(0, separator.index).trim();
  const destination = normalized.slice(separator.index + separator[0].length).trim();
  return origin && destination ? { origin, destination } : null;
}

async function enrichLinesForDebitNoteRender(lines: BillingDocumentLine[]): Promise<BillingDocumentLine[]> {
  const tripIds = Array.from(new Set(lines
    .filter((line) => line.sourceType === 'TRIP' && line.sourceId && !line.renderData)
    .map((line) => Number(line.sourceId))
    .filter((id) => Number.isFinite(id) && id > 0)));
  if (tripIds.length === 0) return lines;

  const trips = await db.select({
    id: s.trips.id,
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    routeName: s.routes.name,
    notes: s.trips.notes,
    truckPlate: s.trucks.licensePlate,
    externalPlateNumber: s.trips.externalPlateNumber,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .where(inArray(s.trips.id, tripIds));
  const tripsById = new Map(trips.map((trip) => [trip.id, trip]));
  const containersByTrip = await loadContainersByTrip(tripIds);
  const legsByTrip = await loadLegRenderDataByTrip(tripIds);

  return lines.map((line) => {
    if (line.renderData || line.sourceType !== 'TRIP' || !line.sourceId) return line;
    const trip = tripsById.get(Number(line.sourceId));
    if (!trip) return line;
    const containers = containersByTrip.get(trip.id) ?? [];
    return {
      ...line,
      routeName: line.routeName ?? trip.routeName ?? null,
      containerNumbers: line.containerNumbers ?? containerNumbers(containers),
      renderData: buildTripRenderData({
        trip,
        containers,
        legs: legsByTrip.get(trip.id),
        note: trip.notes ?? null,
      }),
    };
  });
}

function applyColumnFormat(cell: { numFmt?: string; alignment?: unknown }, col: DebitNoteTemplateColumn): void {
  if (col.format === 'date') cell.numFmt = 'dd/mm/yyyy';
  if (col.format === 'number' || col.format === 'currency') cell.numFmt = '#,##0';
  cell.alignment = { horizontal: col.align, vertical: 'middle', wrapText: true };
}

/**
 * Public entry point. `null`/`undefined` template OR any non-DEBIT_NOTE doc
 * delegates to the verbatim legacy renderer (byte-identical regression oracle).
 * A live DebitNoteTemplate is snapshotted, then rendered by renderTemplatedXlsx.
 */
export async function buildBillingXlsx(
  doc: BillingDocument,
  template?: DebitNoteTemplate | null,
): Promise<Buffer> {
  if (!template || doc.type !== 'DEBIT_NOTE') return buildLegacyXlsx(doc);
  return renderTemplatedXlsx(doc, templateToSnapshot(template));
}

/**
 * Render a debit note from a frozen snapshot (the doc's
 * debit_note_template_snapshot). Dynamic columns + optional letterhead/logo,
 * terms, and signature block. Reads the logo bytes from storage (graceful skip
 * if the file is missing). Not byte-identical to legacy — it is the new
 * customized path — but with default field values it reproduces the legacy look.
 */
export async function renderTemplatedXlsx(
  doc: BillingDocument,
  snap: DebitNoteTemplateSnapshot,
): Promise<Buffer> {
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = (ExcelJSMod as Record<string, unknown>).default
    ? ((ExcelJSMod as Record<string, unknown>).default as typeof ExcelJSMod)
    : ExcelJSMod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NEPO Logistics';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Giấy báo nợ');

  const cols = normalizeTemplateColumns(snap.columns);
  const nCols = cols.length;
  const amountIdx = cols.findIndex((col) => col.variable === 'amount') + 1;
  const totalColumns = cols
    .map((col, idx) => ({ col, idx: idx + 1 }))
    .filter(({ col }) => col.total || col.variable === 'amount');
  const accent = hexToArgb(snap.accentColor);

  ws.properties.defaultRowHeight = 22;
  ws.pageSetup = {
    paperSize: 9,
    orientation: snap.orientation === 'portrait' ? 'portrait' : 'landscape',
    fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
  };

  let row = 1;
  const bandStart = 1;

  // Optional letterhead: issuer block (top-left) + logo (top-right).
  const logoBuffer = snap.logoStorageKey ? await storageService.read(snap.logoStorageKey) : null;
  const hasIssuer = !!(snap.issuerName || snap.issuerAddress || snap.issuerTaxCode);
  if (logoBuffer || hasIssuer) {
    if (snap.issuerName) {
      const c = ws.getCell(row, 1);
      c.value = snap.issuerName;
      c.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
      row++;
    }
    if (snap.issuerAddress) {
      const c = ws.getCell(row, 1);
      c.value = snap.issuerAddress;
      c.font = { name: 'Arial', size: 10, color: { argb: 'FF374151' } };
      row++;
    }
    if (snap.issuerTaxCode) {
      const c = ws.getCell(row, 1);
      c.value = `Mã số thuế: ${snap.issuerTaxCode}`;
      c.font = { name: 'Arial', size: 10, color: { argb: 'FF374151' } };
      row++;
    }
    if (logoBuffer) {
      try {
        // base64 (not buffer) avoids the @types/node Buffer-generic friction with
        // ExcelJS's addImage typing.
        const imageId = wb.addImage({ base64: logoBuffer.toString('base64'), extension: 'png' });
        ws.addImage(imageId, { tl: { col: Math.max(0, nCols - 1), row: 0 }, ext: { width: 130, height: 50 } });
      } catch {
        // ExcelJS couldn't embed the image (bad format/bytes) — skip, keep text.
      }
    }
    row++; // spacer after letterhead
  }

  // Title.
  ws.mergeCells(row, 1, row, nCols);
  const titleCell = ws.getCell(row, 1);
  titleCell.value = snap.titleText;
  titleCell.font = { name: 'Arial', bold: true, size: 18, color: { argb: 'FF111827' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 32;
  row++;

  // Entity.
  ws.mergeCells(row, 1, row, nCols);
  const entCell = ws.getCell(row, 1);
  entCell.value = `Khách hàng: ${doc.entityName ?? ''}`;
  entCell.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
  entCell.alignment = { horizontal: 'center', vertical: 'middle' };
  row++;

  // Period.
  ws.mergeCells(row, 1, row, nCols);
  const perCell = ws.getCell(row, 1);
  perCell.value = `Kỳ: ${formatVietnameseDate(doc.rangeFrom)} - ${formatVietnameseDate(doc.rangeTo)}`;
  perCell.font = { name: 'Arial', size: 11, color: { argb: 'FF374151' } };
  perCell.alignment = { horizontal: 'center', vertical: 'middle' };
  row++;

  // Optional note.
  if (doc.note) {
    ws.mergeCells(row, 1, row, nCols);
    const noteCell = ws.getCell(row, 1);
    noteCell.value = `Ghi chú: ${doc.note}`;
    noteCell.font = { name: 'Arial', italic: true, size: 10, color: { argb: 'FF4B5563' } };
    noteCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    ws.getRow(row).height = 30;
    row++;
  }

  const bandEnd = row - 1;
  for (let r = bandStart; r <= bandEnd; r++) {
    ws.getRow(r).eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    });
  }

  // Column header.
  const headerRow = row;
  for (let c = 0; c < cols.length; c++) {
    const cell = ws.getCell(headerRow, c + 1);
    cell.value = cols[c].label;
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1F2937' } },
      left: { style: 'thin', color: { argb: 'FF1F2937' } },
      bottom: { style: 'thin', color: { argb: 'FF1F2937' } },
      right: { style: 'thin', color: { argb: 'FF1F2937' } },
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
  }
  ws.getRow(headerRow).height = 26;
  ws.views = [{ state: 'frozen', ySplit: headerRow }];
  row++;

  // Data rows, optionally grouped (ROUTE | LINE_TYPE | NONE).
  const groupKey = (l: BillingDocumentLine): string | null => {
    if (snap.groupingMode === 'ROUTE') return l.routeName ?? '';
    if (snap.groupingMode === 'LINE_TYPE') return l.typeLabel ?? '';
    return null;
  };
  const dataRows: number[] = [];
  let i = 0;
  while (i < doc.lines.length) {
    const key = groupKey(doc.lines[i]);
    let end = i + 1;
    if (key !== null) {
      while (end < doc.lines.length && groupKey(doc.lines[end]) === key) end++;
    }
    const groupLines = doc.lines.slice(i, end).filter((l) => !l.excluded);
    i = end;
    if (groupLines.length === 0) continue;

    if (key !== null) {
      const subtotal = groupLines.reduce((s, l) => s + effectiveAmount(l), 0);
      const bandRowNum = row++;
      if (nCols > 1) ws.mergeCells(bandRowNum, 1, bandRowNum, nCols - 1);
      const label = snap.groupingMode === 'LINE_TYPE'
        ? `${key || 'Khác'} (${groupLines.length} dòng)`
        : `Tuyến: ${key || 'Chưa có tuyến'} (${groupLines.length} dòng)`;
      ws.getCell(bandRowNum, 1).value = label;
      if (amountIdx > 0) {
        ws.getCell(bandRowNum, amountIdx).value = subtotal;
        ws.getCell(bandRowNum, amountIdx).numFmt = '#,##0';
        ws.getCell(bandRowNum, amountIdx).alignment = { horizontal: 'right', vertical: 'middle' };
      }
      const bandRow = ws.getRow(bandRowNum);
      bandRow.height = 28;
      bandRow.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF123B2A' } };
      bandRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = {
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF5EF' } };
        if (amountIdx > 0 && colNumber === amountIdx) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
    }

    for (const line of groupLines) {
      const r = row++;
      dataRows.push(r);
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        const cell = ws.getCell(r, c + 1);
        cell.value = renderColumnValue(line, col, dataRows.length);
        applyColumnFormat(cell, col);
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF111827' } };
        cell.border = {
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
      }
      ws.getRow(r).height = 24;
      if (line.lineType !== 'FREIGHT') {
        ws.getCell(r, 1).font = { name: 'Arial', italic: true, color: { argb: 'FF4B5563' } };
        ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
      }
      if (line.amountOverride != null && line.amountOverride !== line.baseAmount) {
        if (amountIdx > 0) ws.getCell(r, amountIdx).font = { name: 'Arial', bold: true, color: { argb: 'FF111827' } };
      }
    }
  }

  // Total.
  const totalRowNum = row + 1;
  if (nCols > 1) ws.mergeCells(totalRowNum, 1, totalRowNum, nCols - 1);
  ws.getCell(totalRowNum, 1).value = 'TỔNG CỘNG';
  ws.getCell(totalRowNum, 1).alignment = { horizontal: 'right', vertical: 'middle' };
  for (const { col, idx } of totalColumns) {
    const totalCell = ws.getCell(totalRowNum, idx);
    const result = col.variable === 'amount'
      ? doc.totalInclVat
      : doc.lines.filter((l) => !l.excluded).reduce((sum, line, dataIdx) => {
        const v = renderColumnValue(line, col, dataIdx + 1);
        return sum + (typeof v === 'number' && Number.isFinite(v) ? v : 0);
      }, 0);
    // Sum explicit data-row cells instead of a contiguous range so subtotal band
    // rows between groups never double-count into the final total.
    totalCell.value = dataRows.length > 0
      ? { formula: `SUM(${dataRows.map((r) => `${colLetter(idx)}${r}`).join(',')})`, result }
      : result;
    applyColumnFormat(totalCell, col);
  }
  const totalRow = ws.getRow(totalRowNum);
  totalRow.height = 28;
  totalRow.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF111827' } };
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF111827' } },
      bottom: { style: 'double', color: { argb: 'FF111827' } },
    };
  });
  row = totalRowNum + 1;

  // Optional terms + signature block.
  if (snap.termsText) {
    ws.mergeCells(row, 1, row, nCols);
    const tCell = ws.getCell(row, 1);
    tCell.value = snap.termsText;
    tCell.font = { name: 'Arial', italic: true, size: 9, color: { argb: 'FF4B5563' } };
    tCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    ws.getRow(row).height = 40;
    row++;
  }
  if (snap.signatureLeftLabel || snap.signatureRightLabel) {
    row++; // blank spacer
    const sigLabelRow = row++;
    ws.getCell(sigLabelRow, 1).value = snap.signatureLeftLabel ?? '';
    ws.getCell(sigLabelRow, 1).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF111827' } };
    ws.getCell(sigLabelRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    if (nCols > 1) {
      ws.getCell(sigLabelRow, nCols).value = snap.signatureRightLabel ?? '';
      ws.getCell(sigLabelRow, nCols).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF111827' } };
      ws.getCell(sigLabelRow, nCols).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    row += 3; // space for handwritten signatures
  }

  // Column widths follow the template.
  for (let c = 0; c < cols.length; c++) {
    ws.getColumn(c + 1).width = cols[c].width;
  }

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}
