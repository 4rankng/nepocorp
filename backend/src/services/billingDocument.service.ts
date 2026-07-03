import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, gte, lte, isNull, inArray, desc, like, type SQL } from 'drizzle-orm';
import { ApiError } from '../errors';
import { getSupplierStatement } from './statement.service';
import {
  BILLABLE_TRIP_STATUSES,
  LoadingType,
  defaultDebitNoteColumns,
  defaultPaymentStatementColumns,
} from '@tingting/shared';
import { companyInfoFromSettings } from './company-info.service';
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

// ─── Billing document templates ───────────────────────────────────────────────

const cloneColumns = (cols: readonly DebitNoteTemplateColumn[]): DebitNoteTemplateColumn[] =>
  cols.map((col) => ({ ...col }));

const DEFAULT_DEBIT_NOTE_COLUMNS: DebitNoteTemplateColumn[] =
  cloneColumns(defaultDebitNoteColumns as DebitNoteTemplateColumn[]);
const DEFAULT_PAYMENT_STATEMENT_COLUMNS: DebitNoteTemplateColumn[] =
  cloneColumns(defaultPaymentStatementColumns as DebitNoteTemplateColumn[]);

const VIETSUN_TABLE_COLUMN_BY_ID = new Map(DEFAULT_PAYMENT_STATEMENT_COLUMNS.map((col) => [col.id, col]));
const VIETSUN_TABLE_WIDTH_BY_COLUMN_ID = new Map(DEFAULT_PAYMENT_STATEMENT_COLUMNS.map((col) => [col.id, col.width]));

const DEFAULT_DEBIT_NOTE_SNAPSHOT: DebitNoteTemplateSnapshot = {
  id: null,
  name: 'Mặc định giấy báo nợ',
  titleText: 'GIẤY BÁO NỢ',
  issuerName: null,
  issuerAddress: null,
  issuerTaxCode: null,
  issuerRepresentative: null,
  accentColor: '#00A651',
  showContainerColumn: true,
  showUnitColumn: true,
  groupingMode: 'NONE',
  columns: cloneColumns(DEFAULT_DEBIT_NOTE_COLUMNS),
  orientation: 'portrait',
  termsText: 'Vui lòng ghi số tham chiếu giấy báo nợ này trong chứng từ thanh toán',
  signatureLeftLabel: 'Khách hàng',
  signatureLeftName: null,
  signatureRightLabel: 'Người lập',
  signatureRightName: 'Phan Kim Phụng',
  logoStorageKey: null,
};

const DEFAULT_PAYMENT_STATEMENT_SNAPSHOT: DebitNoteTemplateSnapshot = {
  ...DEFAULT_DEBIT_NOTE_SNAPSHOT,
  name: 'Mặc định bảng kê',
  titleText: 'BẢNG KÊ CƯỚC VẬN CHUYỂN',
  accentColor: '#1F4E79',
  groupingMode: 'NONE',
  columns: [
    ...DEFAULT_PAYMENT_STATEMENT_COLUMNS,
  ],
};

function looksLikePaymentStatementColumns(cols: DebitNoteTemplateColumn[]): boolean {
  const variables = new Set(cols.map((col) => col.variable));
  const ids = new Set(cols.map((col) => col.id));
  const horizontalSignals = [
    variables.has('rowIndex'),
    variables.has('truckPlate'),
    variables.has('actionType'),
    variables.has('origin') && variables.has('deliveryAddress'),
    ids.has('stt') && ids.has('bien_so'),
    ids.has('gia_vc') && ids.has('so_cont'),
  ];
  return horizontalSignals.filter(Boolean).length >= 2;
}

function normalizeTemplateColumns(cols: unknown, docType: BillingDocumentType = 'DEBIT_NOTE'): DebitNoteTemplateColumn[] {
  const fallback = docType === 'PAYMENT_STATEMENT'
    ? DEFAULT_PAYMENT_STATEMENT_COLUMNS
    : DEFAULT_DEBIT_NOTE_COLUMNS;
  if (!Array.isArray(cols) || cols.length === 0) return cloneColumns(fallback);

  const parsed = cloneColumns(cols as DebitNoteTemplateColumn[]);
  if (docType === 'DEBIT_NOTE' && looksLikePaymentStatementColumns(parsed)) {
    return cloneColumns(DEFAULT_DEBIT_NOTE_COLUMNS);
  }
  return parsed;
}

function rowToTemplate(row: typeof s.debitNoteTemplates.$inferSelect): DebitNoteTemplate {
  return {
    id: row.id, name: row.name, isDefault: row.isDefault,
    documentType: row.documentType as DebitNoteTemplate['documentType'],
    logoStorageKey: row.logoStorageKey, titleText: row.titleText,
    issuerName: row.issuerName, issuerAddress: row.issuerAddress, issuerTaxCode: row.issuerTaxCode,
    issuerRepresentative: row.issuerRepresentative,
    accentColor: row.accentColor,
    showContainerColumn: row.showContainerColumn, showUnitColumn: row.showUnitColumn,
    groupingMode: row.groupingMode as DebitNoteTemplate['groupingMode'],
    columns: normalizeTemplateColumns(row.columns, row.documentType as BillingDocumentType),
    amountInWords: row.amountInWords, orientation: row.orientation as DebitNoteTemplate['orientation'],
    termsText: row.termsText,
    signatureLeftLabel: row.signatureLeftLabel, signatureLeftName: row.signatureLeftName,
    signatureRightLabel: row.signatureRightLabel, signatureRightName: row.signatureRightName,
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

function defaultSnapshotForType(type: string): DebitNoteTemplateSnapshot {
  return type === 'PAYMENT_STATEMENT'
    ? { ...DEFAULT_PAYMENT_STATEMENT_SNAPSHOT, columns: [...DEFAULT_PAYMENT_STATEMENT_SNAPSHOT.columns] }
    : { ...DEFAULT_DEBIT_NOTE_SNAPSHOT, columns: [...DEFAULT_DEBIT_NOTE_SNAPSHOT.columns] };
}

export async function getDefaultDebitNoteTemplate(docType: BillingDocumentType = 'DEBIT_NOTE'): Promise<DebitNoteTemplate | null> {
  const [row] = await db.select().from(s.debitNoteTemplates)
    .where(and(
      eq(s.debitNoteTemplates.isDefault, true),
      eq(s.debitNoteTemplates.documentType, docType),
      isNull(s.debitNoteTemplates.deletedAt),
    )).limit(1);
  return row ? rowToTemplate(row) : null;
}

/**
 * Resolve the template for a billing document export. Order:
 * explicit override → customer override → document-type default.
 * Soft-deleted templates are skipped (fall through to the next source).
 */
export async function resolveDebitNoteTemplate(opts: {
  templateIdOverride?: number | null;
  customerTemplateId?: number | null;
  docType?: string;
}): Promise<DebitNoteTemplate | null> {
  const docType = opts.docType === 'PAYMENT_STATEMENT' ? 'PAYMENT_STATEMENT' : 'DEBIT_NOTE';
  if (opts.templateIdOverride) {
    const t = await getDebitNoteTemplate(opts.templateIdOverride);
    if (t && t.documentType === docType) return t;
  }
  if (docType === 'DEBIT_NOTE' && opts.customerTemplateId) {
    const t = await getDebitNoteTemplate(opts.customerTemplateId);
    if (t && t.documentType === docType) return t;
  }
  return getDefaultDebitNoteTemplate(docType);
}

/** Frozen render-only copy written onto each saved billing document. */
export function templateToSnapshot(t: DebitNoteTemplate): DebitNoteTemplateSnapshot {
  return {
    id: t.id, name: t.name, titleText: t.titleText,
    issuerName: t.issuerName, issuerAddress: t.issuerAddress, issuerTaxCode: t.issuerTaxCode,
    issuerRepresentative: t.issuerRepresentative,
    accentColor: t.accentColor,
    showContainerColumn: t.showContainerColumn, showUnitColumn: t.showUnitColumn,
    groupingMode: t.groupingMode, columns: normalizeTemplateColumns(t.columns, t.documentType), orientation: t.orientation,
    termsText: t.termsText,
    signatureLeftLabel: t.signatureLeftLabel, signatureLeftName: t.signatureLeftName,
    signatureRightLabel: t.signatureRightLabel, signatureRightName: t.signatureRightName,
    logoStorageKey: t.logoStorageKey,
  };
}

/**
 * Resolve the snapshot to render a doc with, applying the export precedence:
 * explicit `?templateId=` override → the doc's frozen snapshot (history
 * stability) → customer's assigned template (DEBIT_NOTE only) → document-type
 * default → built-in standard snapshot.
 */
export async function resolveDebitNoteTemplateForDoc(
  doc: { type: string; entityType: string; entityId: number; debitNoteTemplateSnapshot?: DebitNoteTemplateSnapshot | null },
  opts: { templateIdOverride?: number | null } = {},
): Promise<DebitNoteTemplateSnapshot | null> {
  const docType = doc.type === 'PAYMENT_STATEMENT' ? 'PAYMENT_STATEMENT' : 'DEBIT_NOTE';
  if (opts.templateIdOverride && opts.templateIdOverride > 0) {
    const t = await getDebitNoteTemplate(opts.templateIdOverride);
    if (t && t.documentType === docType) return templateToSnapshot(t);
  }
  if (doc.debitNoteTemplateSnapshot) return {
    ...doc.debitNoteTemplateSnapshot,
    titleText: doc.type === 'PAYMENT_STATEMENT' && doc.debitNoteTemplateSnapshot.titleText === 'GIẤY BÁO NỢ'
      ? 'BẢNG KÊ CƯỚC VẬN CHUYỂN'
      : doc.debitNoteTemplateSnapshot.titleText,
  };
  let customerTemplateId: number | null = null;
  if (docType === 'DEBIT_NOTE' && doc.entityType === 'CUSTOMER') {
    const [cust] = await db.select({ tplId: s.customers.debitNoteTemplateId })
      .from(s.customers).where(eq(s.customers.id, doc.entityId)).limit(1);
    customerTemplateId = cust?.tplId ?? null;
  }
  const t = await resolveDebitNoteTemplate({ customerTemplateId, docType });
  return t ? templateToSnapshot(t) : defaultSnapshotForType(docType);
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
    const unit = containerUnit(containerInfo);
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
      unit,
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
        unit,
        routeName: trip.routeName ?? null, containerNumbers: containers,
        renderData: {
          ...renderData,
          documentCode: expenseDocumentCode(fee),
          note: fee.billingLabel ?? fee.name ?? fee.expenseType,
        },
        baseAmount: amt, amountOverride: null, excluded: false, sortOrder: sortOrder++,
      });
    }
  }

  return { lines, entityName };
}

/**
 * Build customer payment-statement lines in the horizontal business shape:
 * each trip / shipment is one row, while freight and approved ancillary fees are
 * exposed as separate render variables for customer-specific table columns.
 */
async function buildCustomerPaymentStatementLines(customerId: number, from: string, to: string): Promise<{ lines: BillingDraftLine[]; entityName: string }> {
  const [customer] = await db.select({ id: s.customers.id, name: s.customers.name })
    .from(s.customers).where(and(eq(s.customers.id, customerId), isNull(s.customers.deletedAt)));
  if (!customer) throw new ApiError(404, 'Không tìm thấy khách hàng');
  const entityName = customer.name;

  const trips = await db.select({
    id: s.trips.id, tripCode: s.trips.tripCode, departureDate: s.trips.departureDate,
    revenue: s.trips.revenue, routeName: s.routes.name, notes: s.trips.notes,
    truckPlate: s.trucks.licensePlate, externalPlateNumber: s.trips.externalPlateNumber,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .where(and(
      eq(s.trips.customerId, customerId),
      inArray(s.trips.status, [...BILLABLE_TRIP_STATUSES]),
      isNull(s.trips.deletedAt),
      gte(s.trips.departureDate, from),
      lte(s.trips.departureDate, to),
    ))
    .orderBy(s.trips.departureDate);

  const tripIds = trips.map((t) => t.id);
  const containersByTrip = await loadContainersByTrip(tripIds);
  const legsByTrip = await loadLegRenderDataByTrip(tripIds);
  const feesByTrip = await loadApprovedFeesByTrip(tripIds);

  const lines: BillingDraftLine[] = [];
  let sortOrder = 0;
  for (const trip of trips) {
    const containerInfo = containersByTrip.get(trip.id) ?? [];
    const containers = containerNumbers(containerInfo);
    const approvedFees = (feesByTrip.get(trip.id) ?? [])
      .map((fee) => ({
        label: fee.billingLabel ?? fee.name ?? fee.expenseType,
        amount: Number(fee.sellAmount ?? 0),
      }))
      .filter((fee) => fee.amount > 0);
    const freightAmount = Number(trip.revenue ?? 0);
    const serviceFeeAmount = approvedFees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalAmount = freightAmount + serviceFeeAmount;
    const serviceFeeDescription = approvedFees.map((fee) => fee.label).join(', ') || null;
    const renderData = {
      ...buildTripRenderData({
        trip,
        containers: containerInfo,
        legs: legsByTrip.get(trip.id),
        note: trip.notes ?? null,
      }),
      freightAmount,
      serviceFeeAmount: serviceFeeAmount || null,
      totalAmount,
      serviceFeeDescription,
    };

    lines.push({
      sourceType: 'TRIP', sourceId: trip.id, lineType: 'FREIGHT',
      description: `Cước vận chuyển${trip.routeName ? ` — ${trip.routeName}` : ''}${serviceFeeDescription ? `; ${serviceFeeDescription}` : ''}${trip.tripCode ? ` (${trip.tripCode})` : ''}`,
      typeLabel: serviceFeeAmount > 0 ? 'Cước + chi hộ' : 'Doanh thu',
      unit: 'lô',
      routeName: trip.routeName ?? null,
      containerNumbers: containers,
      renderData,
      baseAmount: totalAmount,
      amountOverride: null,
      excluded: false,
      sortOrder: sortOrder++,
    });
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

type ContainerRenderInfo = { containerNumber: string | null; containerTypeCode: string | null; containerTypeName: string | null };
type LegRenderInfo = { origin: string | null; destination: string | null; loadingType: LoadingType | null };
type ApprovedFeeRenderInfo = {
  tripId: number;
  id: number;
  sellAmount: string | null;
  expenseType: string;
  billingLabel: string | null;
  name: string | null;
  invoiceNumber: string | null;
  declarationNumber: string | null;
};

function containerNumbers(containers: ContainerRenderInfo[]): string[] | null {
  const list = containers.map((c) => c.containerNumber).filter((n): n is string => Boolean(n));
  return list.length > 0 ? list : null;
}

function containerUnit(containers: ContainerRenderInfo[]): string {
  const c20 = countContainers(containers, '20');
  const c40 = countContainers(containers, '40');
  if (c20 > 0 && c40 === 0) return "20'";
  if (c40 > 0 && c20 === 0) return "40'";
  return 'cont';
}

function expenseDocumentCode(fee: Pick<ApprovedFeeRenderInfo, 'invoiceNumber' | 'declarationNumber'>): string | null {
  return fee.invoiceNumber?.trim() || fee.declarationNumber?.trim() || null;
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
  const routeParts = splitRouteName(input.trip.routeName ?? '');
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
    origin: input.legs?.origin ?? routeParts?.origin ?? null,
    destination: routeParts?.destination ?? input.trip.routeName ?? input.legs?.destination ?? null,
    deliveryAddress: input.legs?.destination ?? null,
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
async function loadApprovedFeesByTrip(tripIds: number[]): Promise<Map<number, ApprovedFeeRenderInfo[]>> {
  const map = new Map<number, ApprovedFeeRenderInfo[]>();
  if (tripIds.length === 0) return map;
  const rows = await db.select({
    tripId: s.tripExpenses.tripId, id: s.tripExpenses.id,
    sellAmount: s.tripExpenses.sellAmount, expenseType: s.tripExpenses.expenseType,
    invoiceNumber: s.tripExpenses.invoiceNumber, declarationNumber: s.tripExpenses.declarationNumber,
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
    const [customer] = await db.select({ isCarrier: s.customers.isCarrier })
      .from(s.customers)
      .where(and(eq(s.customers.id, entityId), isNull(s.customers.deletedAt)))
      .limit(1);
    result = customer?.isCarrier
      ? await buildCarrierPaymentLines(entityId, from, to)
      : await buildCustomerPaymentStatementLines(entityId, from, to);
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
  // Resolve the document template and freeze a render-only snapshot onto the doc
  // so re-exports stay stable after the template is edited/deleted.
  let resolvedTemplateId = input.debitNoteTemplateId ?? null;
  if (input.type === 'DEBIT_NOTE' && resolvedTemplateId == null && input.entityType === 'CUSTOMER') {
    const [cust] = await db.select({ tplId: s.customers.debitNoteTemplateId })
      .from(s.customers).where(eq(s.customers.id, input.entityId)).limit(1);
    resolvedTemplateId = cust?.tplId ?? null;
  }
  const template = await resolveDebitNoteTemplate({ templateIdOverride: resolvedTemplateId, docType: input.type });
  const snapshot = template ? templateToSnapshot(template) : defaultSnapshotForType(input.type);
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
  const template = await resolveDebitNoteTemplate({ templateIdOverride: resolvedTemplateId, docType: input.type });
  const snapshot = template ? templateToSnapshot(template) : defaultSnapshotForType(input.type);
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

const VIETNAMESE_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const VIETNAMESE_TRIPLE_UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ', 'tỷ tỷ'];

function readVietnameseTriple(value: number, forceHundreds: boolean): string {
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const unit = value % 10;
  const parts: string[] = [];

  if (hundred > 0 || forceHundreds) {
    parts.push(`${VIETNAMESE_DIGITS[hundred]} trăm`);
  }

  if (ten > 1) {
    parts.push(`${VIETNAMESE_DIGITS[ten]} mươi`);
    if (unit === 1) parts.push('mốt');
    else if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(VIETNAMESE_DIGITS[unit]);
  } else if (ten === 1) {
    parts.push('mười');
    if (unit === 5) parts.push('lăm');
    else if (unit > 0) parts.push(VIETNAMESE_DIGITS[unit]);
  } else if (unit > 0) {
    if (hundred > 0 || forceHundreds) parts.push('lẻ');
    parts.push(VIETNAMESE_DIGITS[unit]);
  }

  return parts.join(' ');
}

function sentenceCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function amountToVietnameseWords(amount: number): string {
  const rounded = Math.round(amount);
  if (!Number.isFinite(rounded)) return '';
  if (rounded === 0) return 'Không đồng';

  const sign = rounded < 0 ? 'Âm ' : '';
  let remaining = Math.abs(rounded);
  const triples: number[] = [];
  while (remaining > 0) {
    triples.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words: string[] = [];
  for (let idx = triples.length - 1; idx >= 0; idx--) {
    const triple = triples[idx];
    if (triple === 0) continue;
    const hasHigherGroup = words.length > 0;
    const text = readVietnameseTriple(triple, hasHigherGroup && triple < 100);
    const unit = VIETNAMESE_TRIPLE_UNITS[idx] ?? '';
    words.push(unit ? `${text} ${unit}` : text);
  }

  return `${sign}${sentenceCase(words.join(' '))} đồng`;
}

function hasTemplateToken(value: string): boolean {
  return /\{\{?\s*[\w.]+\s*\}?\}/.test(value);
}

function renderTemplateText(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}|\{\s*([\w.]+)\s*\}/g, (match, doubleKey, singleKey) => {
    const key = doubleKey ?? singleKey;
    const value = variables[key];
    return value == null ? match : String(value);
  });
}

type BillingPartyInfo = {
  name: string;
  address: string;
  taxCode: string;
  representative: string;
  representativeTitle: string;
  phone: string;
};

async function loadCompanyInfo() {
  const rows = await db.select().from(s.appSettings).where(like(s.appSettings.key, 'company.%'));
  return companyInfoFromSettings(rows);
}

async function loadCounterpartyInfo(doc: BillingDocument): Promise<BillingPartyInfo> {
  if (doc.entityType === 'CUSTOMER') {
    const [customer] = await db.select({
      name: s.customers.name,
      taxCode: s.customers.taxCode,
      contactPerson: s.customers.contactPerson,
      contactInfo: s.customers.contactInfo,
      phone: s.customers.phone,
    }).from(s.customers).where(eq(s.customers.id, doc.entityId)).limit(1);
    return {
      name: customer?.name ?? doc.entityName ?? '',
      address: customer?.contactInfo ?? '',
      taxCode: customer?.taxCode ?? '',
      representative: customer?.contactPerson ?? '',
      representativeTitle: 'Giám Đốc',
      phone: customer?.phone ?? '',
    };
  }

  const [supplier] = await db.select({
    name: s.suppliers.name,
    taxCode: s.suppliers.taxCode,
    contactPerson: s.suppliers.contactPerson,
    phone: s.suppliers.phone,
    note: s.suppliers.note,
  }).from(s.suppliers).where(eq(s.suppliers.id, doc.entityId)).limit(1);
  return {
    name: supplier?.name ?? doc.entityName ?? '',
    address: supplier?.note ?? '',
    taxCode: supplier?.taxCode ?? '',
    representative: supplier?.contactPerson ?? '',
    representativeTitle: 'Giám Đốc',
    phone: supplier?.phone ?? '',
  };
}

function customerCode(name: string, fallback: number): string {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd');
  const words = normalized
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !['CONG', 'TY', 'TNHH', 'MTV', 'CP', 'CO', 'LTD'].includes(word.toUpperCase()));
  const code = words.slice(0, 3).map((word) => word[0]?.toUpperCase()).join('');
  return code || String(fallback);
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

  const ws = wb.addWorksheet(doc.type === 'DEBIT_NOTE' ? 'Giấy báo nợ' : 'Bảng kê');
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

// ─── Template-driven export ──────────────────────────────────────────────────

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
      const [year, month, day] = String(raw).split('-').map(Number);
      const date = year && month && day
        ? new Date(Date.UTC(year, month - 1, day))
        : new Date(`${raw}T00:00:00`);
      return Number.isNaN(date.getTime()) ? String(raw) : date;
    }
    case 'truckPlate': return data.truckPlate ?? null;
    case 'actionType': return data.actionType ?? null;
    case 'origin': return data.origin ?? routeParts?.origin ?? null;
    case 'destination': return data.destination ?? routeParts?.destination ?? line.routeName ?? null;
    case 'deliveryAddress': return data.deliveryAddress ?? null;
    case 'container20Count': return data.container20Count ?? null;
    case 'container40Count': return data.container40Count ?? null;
    case 'containerCount': return data.containerCount ?? (line.containerNumbers?.length || null);
    case 'containerNumbers': return (line.containerNumbers ?? []).join(', ') || null;
    case 'routeName': return line.routeName ?? null;
    case 'description': return exportDescription(line);
    case 'lineTypeLabel': return line.typeLabel;
    case 'unit': return line.unit;
    case 'amount': {
      const amount = effectiveAmount(line) || 0;
      if (col.id === 'don_gia') {
        const qty = Number(data.containerCount ?? line.containerNumbers?.length ?? 1);
        return qty > 1 ? Math.round(amount / qty) : amount;
      }
      return amount;
    }
    case 'freightAmount': return data.freightAmount ?? null;
    case 'serviceFeeAmount': return data.serviceFeeAmount ?? null;
    case 'totalAmount': return data.totalAmount ?? (effectiveAmount(line) || 0);
    case 'serviceFeeDescription': return data.serviceFeeDescription ?? null;
    case 'note': return data.note ?? null;
    case 'documentCode': return data.documentCode ?? null;
    case 'tripCode':
      return col.id === 'chung_tu'
        ? data.documentCode ?? null
        : data.tripCode ?? (line.sourceType === 'TRIP' ? String(line.sourceId ?? '') : null);
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
  const directTripIds = lines
    .filter((line) => line.sourceType === 'TRIP' && line.sourceId && !line.renderData)
    .map((line) => Number(line.sourceId))
    .filter((id) => Number.isFinite(id) && id > 0);
  const expenseIds = Array.from(new Set(lines
    .filter((line) => line.sourceType === 'EXPENSE' && line.sourceId)
    .map((line) => Number(line.sourceId))
    .filter((id) => Number.isFinite(id) && id > 0)));

  const expenseTripRows = expenseIds.length > 0
    ? await db.select({
      id: s.tripExpenses.id,
      tripId: s.tripExpenses.tripId,
      invoiceNumber: s.tripExpenses.invoiceNumber,
      declarationNumber: s.tripExpenses.declarationNumber,
    })
      .from(s.tripExpenses)
      .where(inArray(s.tripExpenses.id, expenseIds))
    : [];
  const expenseById = new Map(expenseTripRows.map((row) => [row.id, row]));
  const tripIds = Array.from(new Set([
    ...directTripIds,
    ...expenseTripRows.map((row) => row.tripId),
  ]));
  if (tripIds.length === 0 && expenseById.size === 0) return lines;

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
    const expenseInfo = line.sourceType === 'EXPENSE' && line.sourceId
      ? expenseById.get(Number(line.sourceId))
      : undefined;
    const documentCode = expenseInfo ? expenseDocumentCode(expenseInfo) : null;
    if (line.renderData) {
      return {
        ...line,
        renderData: {
          ...line.renderData,
          documentCode: line.renderData.documentCode ?? documentCode,
        },
      };
    }
    if (!line.sourceId) return line;
    const tripId = line.sourceType === 'TRIP'
      ? Number(line.sourceId)
      : line.sourceType === 'EXPENSE'
        ? expenseInfo?.tripId
        : null;
    if (!tripId) return line;
    const trip = tripsById.get(tripId);
    if (!trip) return line;
    const containers = containersByTrip.get(trip.id) ?? [];
    const enrichedLine = {
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
    return {
      ...enrichedLine,
      renderData: {
        ...enrichedLine.renderData,
        documentCode,
      },
    };
  });
}

function applyInferredColumnFormat(cell: { numFmt?: string; alignment?: unknown }, value: unknown): void {
  if (value instanceof Date) {
    cell.numFmt = 'm/d/yyyy';
  } else if (typeof value === 'number') {
    cell.numFmt = '#,##0';
  }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function renderedValueLength(value: unknown): number {
  if (value == null) return 0;
  if (value instanceof Date) return 10;
  if (typeof value === 'number') return value.toLocaleString('en-US').length;
  if (typeof value === 'object' && 'formula' in value) {
    const result = (value as { result?: unknown }).result;
    return renderedValueLength(result);
  }
  return String(value)
    .split('\n')
    .reduce((max, part) => Math.max(max, part.trim().length), 0);
}

function autoColumnWidth(header: string, values: unknown[]): number {
  const lengths = [header, ...values].map(renderedValueLength).filter((len) => len > 0);
  if (lengths.length === 0) return 8;
  const avg = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  const headerMin = renderedValueLength(header) + 2;
  return Math.max(4, Math.min(42, Math.ceil(Math.max(avg * 1.35 + 2, headerMin))));
}

function renderDebitNoteColumnLabel(col: DebitNoteTemplateColumn): string {
  const reference = VIETSUN_TABLE_COLUMN_BY_ID.get(col.id);
  if (!reference) return col.label;
  const compact = (value: string) => value.replace(/\s+/g, '');
  return compact(col.label) === compact(reference.label) ? reference.label : col.label;
}

function aggregateDebitNoteExportLines(lines: BillingDocumentLine[]): BillingDocumentLine[] {
  const groups = new Map<string, BillingDocumentLine>();
  const passthrough: BillingDocumentLine[] = [];

  for (const line of lines) {
    if (line.excluded) continue;
    const data = line.renderData ?? {};
    const keyParts = [
      data.departureDate ?? '',
      data.truckPlate ?? '',
      data.actionType ?? '',
      data.origin ?? '',
      data.destination ?? line.routeName ?? '',
      data.deliveryAddress ?? '',
      (line.containerNumbers ?? []).join('|'),
      data.container20Count ?? '',
      data.container40Count ?? '',
    ];
    const canGroup = line.sourceType === 'TRIP' || line.sourceType === 'EXPENSE';
    if (!canGroup) {
      passthrough.push(line);
      continue;
    }

    const key = keyParts.join('\u001f');
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...line, lineType: 'FREIGHT', baseAmount: effectiveAmount(line), amountOverride: null });
      continue;
    }
    groups.set(key, {
      ...existing,
      baseAmount: effectiveAmount(existing) + effectiveAmount(line),
      amountOverride: null,
    });
  }

  return [...groups.values(), ...passthrough].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

type DebitNoteLineGroup = {
  key: string;
  label: string;
  first: BillingDocumentLine;
  lines: BillingDocumentLine[];
};

function debitNoteGroupKey(line: BillingDocumentLine): string {
  const data = line.renderData ?? {};
  return [
    data.tripCode ?? '',
    data.departureDate ?? '',
    line.routeName ?? '',
    (line.containerNumbers ?? []).join('|'),
  ].join('\u001f');
}

function debitNoteGroupLabel(line: BillingDocumentLine): string {
  const qty = Number(line.renderData?.containerCount ?? line.containerNumbers?.length ?? 1) || 1;
  const containerText = (line.containerNumbers ?? []).join(';');
  const unit = line.unit || 'cont';
  return `${String(qty).padStart(2, '0')}x${unit}${containerText ? ` ${containerText}` : ''}`;
}

function groupDebitNoteLines(lines: BillingDocumentLine[]): DebitNoteLineGroup[] {
  const groups: DebitNoteLineGroup[] = [];
  const byKey = new Map<string, DebitNoteLineGroup>();
  for (const line of lines) {
    const key = debitNoteGroupKey(line);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: debitNoteGroupLabel(line), first: line, lines: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.lines.push(line);
  }
  return groups;
}

async function loadDebitNoteLogoBytes(logoStorageKey?: string | null): Promise<Buffer | null> {
  if (logoStorageKey) {
    const stored = await storageService.read(logoStorageKey);
    if (stored) return stored;
  }

  const candidates = [
    path.resolve(process.cwd(), 'assets', 'Nepo.png'),
    path.resolve(process.cwd(), 'backend', 'assets', 'Nepo.png'),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.promises.readFile(candidate);
    } catch {
      // Try the next runtime cwd variant.
    }
  }
  return null;
}

/**
 * Public entry point. `null`/`undefined` template or a mismatched document type
 * delegates to the verbatim legacy renderer. A live template is snapshotted,
 * then rendered by renderTemplatedXlsx.
 */
export async function buildBillingXlsx(
  doc: BillingDocument,
  template?: DebitNoteTemplate | null,
): Promise<Buffer> {
  if (!template) return buildLegacyXlsx(doc);
  if (template.documentType !== doc.type) return buildLegacyXlsx(doc);
  return renderTemplatedXlsx(doc, templateToSnapshot(template));
}

async function renderDebitNoteXlsx(
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
  const cols = normalizeTemplateColumns(snap.columns, 'DEBIT_NOTE').filter((col) => col.width > 0);
  const nCols = cols.length;
  const headerCols = Math.max(nCols, 8);
  const totalColumns = cols
    .map((col, idx) => ({ col, idx: idx + 1 }))
    .filter(({ col }) => col.total);
  const company = await loadCompanyInfo();
  const partner = await loadCounterpartyInfo(doc);
  const lines = await enrichLinesForDebitNoteRender(doc.lines);
  const dataLines = lines.filter((line) => !line.excluded);
  const lineGroups = groupDebitNoteLines(dataLines);
  const moneyFmt = '_(* #,##0_);_(* \\(#,##0\\);_(* \\-??_);_(@_)';
  const baseFont = { name: 'Times New Roman', size: 11, color: { argb: 'FF000000' } };
  const boldFont = { ...baseFont, bold: true };
  const thinGray = { style: 'thin' as const, color: { argb: 'FFD8DCE3' } };
  const thinBlack = { style: 'thin' as const, color: { argb: 'FF000000' } };
  const accent = hexToArgb(snap.accentColor || '#00A651');

  ws.properties.defaultRowHeight = 22;
  ws.pageSetup = {
    paperSize: 9,
    orientation: snap.orientation === 'portrait' ? 'portrait' : 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.35, bottom: 0.45, header: 0.2, footer: 0.2 },
  };

  for (let c = 1; c <= headerCols; c++) {
    ws.getColumn(c).width = cols[c - 1]?.width ?? 12;
  }
  for (let r = 1; r <= 13; r++) {
    ws.getRow(r).height = r === 7 ? 24 : 18;
    for (let c = 1; c <= headerCols; c++) {
      ws.getCell(r, c).border = { top: thinGray, left: thinGray, right: thinGray, bottom: thinGray };
    }
  }

  ws.mergeCells(1, 1, 3, 3);
  const logoCell = ws.getCell(1, 1);
  const logoBytes = await loadDebitNoteLogoBytes(snap.logoStorageKey);
  if (logoBytes) {
    const imageId = wb.addImage({ base64: logoBytes.toString('base64'), extension: 'png' });
    ws.addImage(imageId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 185, height: 64 } });
  } else {
    logoCell.value = 'NePO\nPower your success';
    logoCell.font = { name: 'Arial', size: 24, bold: true, color: { argb: accent } };
    logoCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  }

  const companyRows = [
    { row: 1, value: company.name, bold: true },
    { row: 2, value: company.address },
    { row: 4, value: 'ĐT: 0225-8832393' },
    { row: 5, value: 'E-mail: acc@nepocorp.com' },
  ];
  for (const item of companyRows) {
    ws.mergeCells(item.row, 4, item.row, headerCols);
    const cell = ws.getCell(item.row, 4);
    cell.value = item.value;
    cell.font = item.bold ? boldFont : baseFont;
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: false };
  }

  ws.mergeCells(7, 2, 7, Math.min(4, headerCols));
  ws.getCell(7, 2).value = 'GIẤY BÁO NỢ';
  ws.getCell(7, 2).font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FF7A7F87' } };
  ws.getCell(7, 2).alignment = { horizontal: 'left', vertical: 'middle' };

  const noticeNo = doc.note?.trim() || `${customerCode(partner.name, doc.entityId)}${doc.rangeTo.replaceAll('-', '').slice(2)}`;
  const leftMeta = [
    ['Số :', noticeNo],
    ['Ngày tháng:', formatVietnameseDate(doc.rangeTo)],
    ['Mã khách:', customerCode(partner.name, doc.entityId)],
  ];
  leftMeta.forEach(([label, value], index) => {
    const row = 9 + index;
    ws.getCell(row, 2).value = label;
    ws.getCell(row, 2).font = boldFont;
    ws.getCell(row, 3).value = value;
    ws.getCell(row, 3).font = boldFont;
  });

  ws.getCell(9, 5).value = 'Gửi tới:';
  ws.getCell(9, 5).font = boldFont;
  ws.mergeCells(9, 6, 9, headerCols);
  ws.getCell(9, 6).value = [partner.representative || 'Phòng kế toán', partner.phone ? `(${partner.phone})` : ''].filter(Boolean).join(' ');
  ws.getCell(10, 5).value = partner.name;
  ws.getCell(10, 5).font = boldFont;
  ws.mergeCells(10, 5, 10, headerCols);
  ws.getCell(11, 5).value = partner.address;
  ws.mergeCells(11, 5, 11, headerCols);
  ws.getCell(13, 5).value = partner.taxCode ? `MST : ${partner.taxCode}` : 'MST :';
  ws.mergeCells(13, 5, 13, headerCols);

  const tableHeaderRow = 15;
  for (let c = 0; c < cols.length; c++) {
    const col = cols[c];
    const cell = ws.getCell(tableHeaderRow, c + 1);
    cell.value = col.label;
    cell.font = boldFont;
    cell.alignment = { horizontal: col.align, vertical: 'middle', wrapText: true };
    cell.border = { top: thinBlack, left: thinBlack, right: thinBlack, bottom: thinBlack };
  }
  ws.getRow(tableHeaderRow).height = 28;

  let row = tableHeaderRow + 1;
  const dataRows: number[] = [];
  const descriptionCol = Math.max(1, cols.findIndex((col) => col.variable === 'description') + 1);
  for (const group of lineGroups) {
    const groupRow = row++;
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      const cell = ws.getCell(groupRow, c + 1);
      let value: string | number | Date | null = null;
      if (col.variable === 'departureDate') {
        value = renderColumnValue(group.first, col, dataRows.length + 1);
      } else if (c + 1 === descriptionCol) {
        value = group.label;
      }
      cell.value = value;
      applyInferredColumnFormat(cell, value);
      cell.alignment = { horizontal: c + 1 === descriptionCol ? 'center' : col.align, vertical: 'middle', wrapText: true };
      cell.font = c + 1 === descriptionCol ? boldFont : baseFont;
      cell.border = { top: thinBlack, left: thinBlack, right: thinBlack, bottom: thinBlack };
      if (col.format === 'date' && value instanceof Date) cell.numFmt = 'd/m/yy';
    }
    ws.getRow(groupRow).height = 24;

    for (const line of group.lines) {
      const r = row++;
      dataRows.push(r);
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        const cell = ws.getCell(r, c + 1);
        const rawValue = renderColumnValue(line, col, dataRows.length);
        const value = col.variable === 'departureDate' ? null : rawValue;
        cell.value = value;
        applyInferredColumnFormat(cell, value);
        cell.alignment = { horizontal: col.align, vertical: 'middle', wrapText: true };
        cell.font = baseFont;
        cell.border = { top: thinBlack, left: thinBlack, right: thinBlack, bottom: thinBlack };
        if (col.format === 'currency' || col.variable === 'amount') cell.numFmt = moneyFmt;
        if (col.format === 'date' && value instanceof Date) cell.numFmt = 'd/m/yy';
      }
      ws.getRow(r).height = 24;
    }
  }

  const totalRow = row + 1;
  const amountCol = totalColumns[0]?.idx ?? cols.findIndex((col) => col.variable === 'amount') + 1;
  if (amountCol > 1) ws.mergeCells(totalRow, 1, totalRow, amountCol - 1);
  ws.getCell(totalRow, 1).value = 'TỔNG CỘNG';
  ws.getCell(totalRow, 1).font = boldFont;
  ws.getCell(totalRow, 1).alignment = { horizontal: 'right', vertical: 'middle' };
  if (amountCol > 0) {
    const result = dataLines.reduce((sum, line) => sum + effectiveAmount(line), 0);
    ws.getCell(totalRow, amountCol).value = dataRows.length > 0
      ? { formula: `SUM(${colLetter(amountCol)}${dataRows[0]}:${colLetter(amountCol)}${dataRows[dataRows.length - 1]})`, result }
      : result;
    ws.getCell(totalRow, amountCol).numFmt = moneyFmt;
    ws.getCell(totalRow, amountCol).font = boldFont;
    ws.getCell(totalRow, amountCol).alignment = { horizontal: 'right', vertical: 'middle' };
  }
  for (let c = 1; c <= Math.max(nCols, amountCol); c++) {
    ws.getCell(totalRow, c).border = { top: thinBlack, left: thinBlack, right: thinBlack, bottom: thinBlack };
  }

  const totalAmount = dataLines.reduce((sum, line) => sum + effectiveAmount(line), 0);
  const noteRow = totalRow + 2;
  ws.getCell(noteRow, 1).value = 'Lưu ý:';
  ws.getCell(noteRow, 1).font = { ...boldFont, color: { argb: 'FF8A8A8A' } };
  if (nCols >= 3) ws.mergeCells(noteRow, 2, noteRow, Math.max(3, nCols - 2));
  ws.getCell(noteRow, 2).value = snap.termsText || 'Vui lòng ghi số tham chiếu giấy báo nợ này trong chứng từ thanh toán';
  ws.getCell(noteRow, 2).font = { ...baseFont, color: { argb: 'FF8A8A8A' } };

  const wordsRow = noteRow + 2;
  ws.getCell(wordsRow, 1).value = 'Bằng chữ:';
  ws.getCell(wordsRow, 1).font = { ...boldFont, color: { argb: 'FF8A8A8A' } };
  if (nCols >= 3) ws.mergeCells(wordsRow, 2, wordsRow, nCols);
  ws.getCell(wordsRow, 2).value = amountToVietnameseWords(totalAmount);
  ws.getCell(wordsRow, 2).font = { ...boldFont, italic: true };

  const bankTop = wordsRow + 2;
  const bankEndCol = Math.max(4, Math.min(nCols, 6));
  if (bankEndCol >= 1) ws.mergeCells(bankTop, 1, bankTop, bankEndCol);
  const bankHeader = ws.getCell(bankTop, 1);
  bankHeader.value = 'THÔNG TIN CHUYỂN KHOẢN';
  bankHeader.font = boldFont;
  bankHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  bankHeader.border = { top: thinBlack, left: thinBlack, right: thinBlack, bottom: thinBlack };

  const bankRows = [
    ['Tên tài khoản:', company.name],
    ['Số tài khoản:', company.bankAccount],
    ['Ngân hàng:', company.bankName],
  ];
  bankRows.forEach(([label, value], index) => {
    const r = bankTop + index + 1;
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { ...boldFont, color: { argb: 'FF8A8A8A' } };
    ws.getCell(r, 2).value = value;
    ws.getCell(r, 2).font = boldFont;
    if (bankEndCol >= 2) ws.mergeCells(r, 2, r, bankEndCol);
    for (let c = 1; c <= bankEndCol; c++) {
      ws.getCell(r, c).border = { top: thinGray, left: thinBlack, right: thinBlack, bottom: thinGray };
    }
  });

  const thanksRow = bankTop + bankRows.length + 2;
  if (nCols >= 4) ws.mergeCells(thanksRow, 1, thanksRow, Math.max(4, Math.min(nCols, 6)));
  ws.getCell(thanksRow, 1).value = 'Cảm ơn quý khách hàng đã sử dụng dịch vụ của NePO!';
  ws.getCell(thanksRow, 1).font = { ...boldFont, italic: true, color: { argb: 'FF8A8A8A' } };

  const signatureStartCol = Math.max(bankEndCol + 1, nCols - 1);
  if (signatureStartCol <= nCols) {
    ws.mergeCells(bankTop + 1, signatureStartCol, bankTop + 1, nCols);
    ws.getCell(bankTop + 1, signatureStartCol).value = snap.signatureRightLabel || 'Người lập';
    ws.getCell(bankTop + 1, signatureStartCol).font = boldFont;
    ws.getCell(bankTop + 1, signatureStartCol).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(bankTop + 5, signatureStartCol, bankTop + 5, nCols);
    ws.getCell(bankTop + 5, signatureStartCol).value = snap.signatureRightName || company.representative.replace(/^Ông\s+|^Bà\s+/i, '');
    ws.getCell(bankTop + 5, signatureStartCol).font = boldFont;
    ws.getCell(bankTop + 5, signatureStartCol).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
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
  if (doc.type === 'DEBIT_NOTE') return renderDebitNoteXlsx(doc, snap);

  const ExcelJSMod = await import('exceljs');
  const ExcelJS = (ExcelJSMod as Record<string, unknown>).default
    ? ((ExcelJSMod as Record<string, unknown>).default as typeof ExcelJSMod)
    : ExcelJSMod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NEPO Logistics';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet(`Tháng ${Number(doc.rangeTo.slice(5, 7)) || Number(doc.rangeFrom.slice(5, 7)) || 1}`);

  const cols = normalizeTemplateColumns(snap.columns, 'PAYMENT_STATEMENT').filter((col) => col.width > 0);
  const nCols = cols.length;
  const widthSamples: unknown[][] = cols.map(() => []);
  const amountIdx = cols.findIndex((col) => col.variable === 'amount') + 1;
  const totalColumns = cols
    .map((col, idx) => ({ col, idx: idx + 1 }))
    .filter(({ col }) => col.total);
  const lines = await enrichLinesForDebitNoteRender(doc.lines);
  const dataLines = aggregateDebitNoteExportLines(lines);
  const partner = await loadCounterpartyInfo(doc);
  const company = await loadCompanyInfo();
  const amountSubtotal = dataLines.reduce((sum, line) => sum + effectiveAmount(line), 0);
  const vatAmount = Math.round(amountSubtotal * 0.08);
  const grandTotal = amountSubtotal + vatAmount;
  const customerName = partner.name || doc.entityName || '';
  const issuerName = company.name;
  const templateVariables: Record<string, string | number> = {
    rangeFrom: formatVietnameseDate(doc.rangeFrom),
    rangeTo: formatVietnameseDate(doc.rangeTo),
    rangeMonth: formatMonthYear(doc.rangeTo),
    invoiceNo: doc.note?.trim() || '........',
    invoiceDate: formatVietnameseDate(doc.rangeTo),
    customerName,
    customerAddress: partner.address,
    customerTaxCode: partner.taxCode,
    customerRepresentative: partner.representative,
    customerPosition: partner.representativeTitle,
    issuerName,
    issuerAddress: company.address,
    issuerTaxCode: company.taxCode,
    issuerRepresentative: company.representative,
    issuerPosition: company.representativeTitle,
    subtotal: amountSubtotal.toLocaleString('en-US'),
    vatAmount: vatAmount.toLocaleString('en-US'),
    grandTotal: grandTotal.toLocaleString('en-US'),
    amountInWords: amountToVietnameseWords(grandTotal),
  };

  const thinBlack = { style: 'thin' as const, color: { argb: 'FF000000' } };
  const hairBlack = { style: 'hair' as const, color: { argb: 'FF000000' } };
  const baseFont = { name: 'Times New Roman', size: 11, color: { argb: 'FF000000' } };
  const boldFont = { ...baseFont, bold: true };
  const moneyFmt = '_(* #,##0_);_(* \\(#,##0\\);_(* \\-??_);_(@_)';
  const nColsForIntro = Math.max(nCols, 12);

  ws.properties.defaultRowHeight = 22;
  ws.pageSetup = {
    paperSize: 9,
    orientation: snap.orientation === 'portrait' ? 'portrait' : 'landscape',
    fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
    margins: { left: 0.5, right: 0.2, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  const introRowHeights = new Map<number, number>([
    [1, 13.5],
    [2, 26.25],
    [3, 19.5],
    [16, 20.1],
  ]);
  for (let r = 1; r <= 16; r++) ws.getRow(r).height = introRowHeights.get(r) ?? 18;
  ws.getRow(17).height = 15;
  if (nCols > 1) ws.mergeCells(17, 1, 17, nCols);

  const rawTitle = snap.titleText || 'BẢNG KÊ CƯỚC VẬN CHUYỂN';
  const titleTemplate = hasTemplateToken(rawTitle) || /\bTHÁNG\b/i.test(rawTitle)
    ? rawTitle
    : `${rawTitle} THÁNG {rangeMonth}`;
  ws.mergeCells(2, 1, 2, nColsForIntro);
  ws.getCell(2, 1).value = renderTemplateText(titleTemplate, templateVariables);
  ws.getCell(2, 1).font = { name: 'Times New Roman', size: 16, bold: true };
  ws.getCell(2, 1).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells(3, 1, 3, nColsForIntro);
  ws.getCell(3, 1).value = renderTemplateText('(Kèm hoá đơn GTGT số: {invoiceNo}   ngày {invoiceDate})', templateVariables);
  ws.getCell(3, 1).font = { name: 'Times New Roman', size: 12, bold: true };
  ws.getCell(3, 1).alignment = { horizontal: 'center', vertical: 'middle' };

  const termsLines = renderTemplateText(
    snap.termsText ?? `- Số TK ${company.bankAccount}\n- Tại ngân hàng ${company.bankName}`,
    templateVariables,
  ).split('\n');
  const introRows: Array<{ row: number; value: string; bold?: boolean }> = [
    { row: 4, value: 'BÊN A (BÊN THUÊ DỊCH VỤ): {customerName}', bold: true },
    { row: 5, value: 'Địa chỉ: {customerAddress}' },
    { row: 6, value: 'Mã số thuế: {customerTaxCode}' },
    { row: 7, value: 'Đại diện bởi : {customerRepresentative}' },
    { row: 8, value: 'Chức vụ: {customerPosition}' },
    { row: 9, value: 'BÊN B (BÊN CUNG CẤP DỊCH VỤ): {issuerName}', bold: true },
    { row: 10, value: 'Địa chỉ: {issuerAddress}' },
    { row: 11, value: 'Mã số thuế: {issuerTaxCode}' },
    { row: 12, value: 'Đại diện bởi : {issuerRepresentative}' },
    { row: 13, value: 'Chức vụ: {issuerPosition}' },
    { row: 14, value: termsLines[0] ?? '- Số TK ' },
    { row: 15, value: termsLines[1] ?? '- Tại ngân hàng ' },
    { row: 16, value: 'Cùng thống nhất tiến hành đối chiếu sản lượng và doanh thu dịch vụ Bên B đã hoàn thành cung cấp/thực hiện cho Bên A như sau:' },
  ];
  for (const item of introRows) {
    const cell = ws.getCell(item.row, 1);
    cell.value = renderTemplateText(item.value, templateVariables);
    cell.font = item.bold ? boldFont : baseFont;
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
  }

  const headerTop = 18;
  const headerBottom = 19;
  const quantityIndexes = cols
    .map((col, idx) => ({ col, idx: idx + 1 }))
    .filter(({ col }) => col.variable === 'container20Count' || col.variable === 'container40Count');
  const quantityStart = quantityIndexes.length > 0 ? Math.min(...quantityIndexes.map((x) => x.idx)) : 0;
  const quantityEnd = quantityIndexes.length > 0 ? Math.max(...quantityIndexes.map((x) => x.idx)) : 0;

  for (let c = 1; c <= nCols; c++) {
    const col = cols[c - 1];
    const label = renderDebitNoteColumnLabel(col);
    const isQuantityChild = col.variable === 'container20Count' || col.variable === 'container40Count';
    const topCell = ws.getCell(headerTop, c);
    const bottomCell = ws.getCell(headerBottom, c);
    if (isQuantityChild) {
      bottomCell.value = label;
    } else {
      topCell.value = label;
      ws.mergeCells(headerTop, c, headerBottom, c);
    }
  }
  if (quantityStart > 0 && quantityEnd >= quantityStart) {
    ws.mergeCells(headerTop, quantityStart, headerTop, quantityEnd);
    ws.getCell(headerTop, quantityStart).value = 'Số lượng';
  }

  for (let r = headerTop; r <= headerBottom; r++) {
    ws.getRow(r).height = 14.25;
    for (let c = 1; c <= nCols; c++) {
      const cell = ws.getCell(r, c);
      cell.font = boldFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: thinBlack, left: thinBlack, right: thinBlack, bottom: thinBlack };
    }
  }

  const firstDataRow = 20;
  let row = firstDataRow;
  const dataRows: number[] = [];
  for (const line of dataLines) {
    const r = row++;
    dataRows.push(r);
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      const cell = ws.getCell(r, c + 1);
      const value = renderColumnValue(line, col, dataRows.length);
      widthSamples[c].push(value);
      cell.value = value;
      applyInferredColumnFormat(cell, value);
      cell.font = baseFont;
      cell.border = { top: thinBlack, left: thinBlack, right: thinBlack, bottom: hairBlack };
      if (col.variable === 'amount') cell.numFmt = moneyFmt;
      if (col.variable === 'rowIndex' && r > firstDataRow) {
        cell.value = { formula: `A${r - 1}+1`, result: dataRows.length };
        cell.numFmt = '#,##0';
      }
    }
    ws.getRow(r).height = 27;
  }

  const subtotalRow = row++;
  const vatRow = row++;
  const grandRow = row++;
  const wordsRow = row++;

  if (nCols >= 6) {
    ws.mergeCells(subtotalRow, 1, subtotalRow, Math.min(6, nCols));
    ws.mergeCells(vatRow, 1, vatRow, Math.min(6, nCols));
    ws.mergeCells(grandRow, 1, grandRow, Math.min(6, nCols));
  }
  ws.getCell(subtotalRow, 1).value = 'CỘNG';
  ws.getCell(vatRow, 1).value = 'THUẾ GTGT 8%';
  ws.getCell(grandRow, 1).value = 'TỔNG THANH TOÁN';
  for (const { col, idx } of totalColumns) {
    const totalCell = ws.getCell(subtotalRow, idx);
    const result = dataLines.reduce((sum, line, dataIdx) => {
      const v = renderColumnValue(line, col, dataIdx + 1);
      return sum + (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    }, 0);
    totalCell.value = dataRows.length > 0
      ? { formula: `SUM(${colLetter(idx)}${dataRows[0]}:${colLetter(idx)}${dataRows[dataRows.length - 1]})`, result }
      : result;
    widthSamples[idx - 1]?.push(result);
    applyInferredColumnFormat(totalCell, result);
    if (col.variable === 'amount') totalCell.numFmt = moneyFmt;
  }
  if (amountIdx > 0) {
    ws.getCell(vatRow, amountIdx).value = { formula: `${colLetter(amountIdx)}${subtotalRow}*0.08` };
    ws.getCell(grandRow, amountIdx).value = { formula: `${colLetter(amountIdx)}${subtotalRow}+${colLetter(amountIdx)}${vatRow}` };
    ws.getCell(vatRow, amountIdx).numFmt = moneyFmt;
    ws.getCell(grandRow, amountIdx).numFmt = moneyFmt;
    widthSamples[amountIdx - 1]?.push(vatAmount, grandTotal);
  }

  ws.getCell(wordsRow, 1).value = renderTemplateText('Bằng chữ: {amountInWords}', templateVariables);
  if (nCols > 1) ws.mergeCells(wordsRow, 1, wordsRow, nCols);

  for (let r = subtotalRow; r <= wordsRow; r++) {
    ws.getRow(r).height = r === wordsRow ? 24.95 : 27;
    for (let c = 1; c <= nCols; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { ...boldFont, bold: r !== wordsRow ? true : false };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: thinBlack, left: thinBlack, right: thinBlack, bottom: r === wordsRow ? undefined : hairBlack };
    }
  }

  const signatureLabelRow = row++;
  const signatureHintRow = row++;
  const signatureNameRow = row + 3;
  row = signatureNameRow + 1;
  const leftEnd = nCols >= 11 ? 5 : Math.max(1, Math.floor(nCols / 2));
  const rightStart = nCols >= 11 ? 9 : Math.min(nCols, leftEnd + 1);
  const rightEnd = nCols >= 11 ? 11 : nCols;
  for (const r of [signatureLabelRow, signatureHintRow, signatureNameRow]) {
    if (leftEnd > 1) ws.mergeCells(r, 1, r, leftEnd);
    if (rightStart < rightEnd) ws.mergeCells(r, rightStart, r, rightEnd);
  }
  ws.getCell(signatureLabelRow, 1).value = snap.signatureLeftLabel?.trim() || '';
  ws.getCell(signatureLabelRow, rightStart).value = snap.signatureRightLabel?.trim() || '';
  ws.getCell(signatureHintRow, 1).value = '(Ký, họ tên)';
  ws.getCell(signatureHintRow, rightStart).value = '(Ký, họ tên, đóng dấu)';
  ws.getCell(signatureNameRow, 1).value = snap.signatureLeftName?.trim() || '';
  ws.getCell(signatureNameRow, rightStart).value = snap.signatureRightName?.trim() || '';
  for (const cell of [ws.getCell(signatureLabelRow, 1), ws.getCell(signatureLabelRow, rightStart)]) {
    cell.font = boldFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: thinBlack };
  }
  for (const cell of [ws.getCell(signatureHintRow, 1), ws.getCell(signatureHintRow, rightStart)]) {
    cell.font = { ...baseFont, italic: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  for (const cell of [ws.getCell(signatureNameRow, 1), ws.getCell(signatureNameRow, rightStart)]) {
    cell.font = boldFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  ws.getRow(signatureLabelRow).height = 24.95;
  ws.getRow(signatureHintRow).height = 18;
  ws.getRow(signatureNameRow).height = 24.95;

  for (let c = 0; c < cols.length; c++) {
    ws.getColumn(c + 1).width =
      VIETSUN_TABLE_WIDTH_BY_COLUMN_ID.get(cols[c].id) ??
      autoColumnWidth(renderDebitNoteColumnLabel(cols[c]), widthSamples[c] ?? []);
  }
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}
