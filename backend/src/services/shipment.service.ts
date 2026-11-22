/**
 * Lô hàng (Shipment) service — NEPO-61 + NEPO-62.
 *
 * Owns the sea-shipment master record: auto code [Mã KH][Năm][STT] generation,
 * sea-booking/customs fields, uploaded documents (chứng từ), manual cost rows
 * with per-row economics (Thu khách / Trả NCC, Dịch vụ / Nộp hộ, VND/USD, VAT,
 * Chờ hóa đơn), the derived truck-transfer section, and the lô profit rollup.
 * Trip link/unlink validation lives in trip-mutations.service.ts.
 */
import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { db } from '../db';
import * as s from '../db/schema';
import { ApiError } from '../errors';
import {
  buildShipmentCode,
  shipmentCodePrefix,
  shipmentCodeSeqRe,
  FeeGroup,
  LotFeeStatus,
  TripFlowType,
  TruckTransferCostKey,
  FEE_GROUP_LABELS,
  LOT_DEBIT_NOTE_ORDER,
  TRUCK_TRANSFER_COST_ROWS,
} from '@tingting/shared';
import type {
  CreateShipmentInput,
  UpdateShipmentInput,
  ShipmentCostInput,
  ShipmentCostUpdateInput,
  RegisterShipmentDocumentInput,
  LinkTripShipmentInput,
  Shipment,
  ShipmentCost,
  ShipmentDocument,
  ShipmentProfitSummary,
  LotCostRegister,
  LotCostRow,
  LotCostGroup,
  TruckTransferCostRow,
} from '@tingting/shared';
import { storageService } from './storage.service';

const SHIPMENT_SELECT_FIELDS = {
  id: s.shipments.id,
  shipmentCode: s.shipments.shipmentCode,
  customerId: s.shipments.customerId,
  customerName: s.customers.name,
  customerShortName: s.customers.shortName,
  flowType: s.shipments.flowType,
  shippingLine: s.shipments.shippingLine,
  bookingNo: s.shipments.bookingNo,
  blNo: s.shipments.blNo,
  vesselVoyage: s.shipments.vesselVoyage,
  pol: s.shipments.pol,
  pod: s.shipments.pod,
  etd: s.shipments.etd,
  eta: s.shipments.eta,
  cutoffDate: s.shipments.cutoffDate,
  containerSeals: s.shipments.containerSeals,
  customsDeclarationNo: s.shipments.customsDeclarationNo,
  customsDeclarationDate: s.shipments.customsDeclarationDate,
  notes: s.shipments.notes,
  createdBy: s.shipments.createdBy,
  createdAt: s.shipments.createdAt,
  updatedAt: s.shipments.updatedAt,
  deletedAt: s.shipments.deletedAt,
};

const SHIPMENT_LIST_BASE = () => db.select(SHIPMENT_SELECT_FIELDS).from(s.shipments)
  .leftJoin(s.customers, eq(s.shipments.customerId, s.customers.id));

/** drizzle returns PG timestamps as Date; the wire contract is ISO strings. */
function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

type ShipmentRow = typeof s.shipments.$inferSelect & {
  customerName: string | null;
  customerShortName: string | null;
};

function toShipment(row: ShipmentRow): Shipment {
  return {
    ...row,
    flowType: (row.flowType as TripFlowType | null) ?? null,
    createdAt: iso(row.createdAt) as string,
    updatedAt: iso(row.updatedAt) as string,
    deletedAt: iso(row.deletedAt),
  };
}

function toShipmentCost(row: typeof s.shipmentCosts.$inferSelect): ShipmentCost {
  return {
    ...row,
    costType: row.costType as FeeGroup,
    direction: row.direction as 'CUSTOMER' | 'SUPPLIER',
    serviceMode: row.serviceMode as 'SERVICE' | 'ADVANCE',
    currency: row.currency as 'VND' | 'USD',
    amount: Number(row.amount),
    incurredDate: String(row.incurredDate),
    createdAt: iso(row.createdAt) as string,
    updatedAt: iso(row.updatedAt) as string,
  };
}

function toShipmentDocument(row: typeof s.shipmentDocuments.$inferSelect): ShipmentDocument {
  return { ...row, docType: row.docType as ShipmentDocument['docType'], createdAt: iso(row.createdAt) as string };
}

/** Escape LIKE wildcards in a user-supplied search term (house pattern). */
function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

async function assertShipmentExists(id: number): Promise<void> {
  const [row] = await db.select({ id: s.shipments.id })
    .from(s.shipments).where(eq(s.shipments.id, id)).limit(1);
  if (!row) throw new ApiError(404, 'Không tìm thấy lô hàng');
}

export async function listShipments(filters: {
  search?: string;
  customerId?: number;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Shipment[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const conds: Array<SQL | undefined> = [isNull(s.shipments.deletedAt)];
  if (filters.customerId) conds.push(eq(s.shipments.customerId, filters.customerId));
  if (filters.search) {
    const term = `%${escapeLikeTerm(filters.search.trim())}%`;
    conds.push(sql`(
      ${s.shipments.shipmentCode} ILIKE ${term}
      OR ${s.shipments.bookingNo} ILIKE ${term}
      OR ${s.shipments.blNo} ILIKE ${term}
      OR unaccent(${s.customers.name}) ILIKE unaccent(${term})
      OR unaccent(${s.customers.shortName}) ILIKE unaccent(${term})
    )`);
  }
  const where = and(...conds);
  const [rows, countRows] = await Promise.all([
    SHIPMENT_LIST_BASE().where(where)
      .orderBy(desc(s.shipments.createdAt), desc(s.shipments.id))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(s.shipments)
      .leftJoin(s.customers, eq(s.shipments.customerId, s.customers.id))
      .where(where),
  ]);
  return {
    items: rows.map(toShipment),
    total: Number(countRows[0]?.count ?? 0),
    page,
    pageSize,
  };
}

export async function getShipmentById(id: number): Promise<Shipment> {
  const [row] = await SHIPMENT_LIST_BASE()
    .where(and(eq(s.shipments.id, id), isNull(s.shipments.deletedAt)))
    .limit(1);
  if (!row) throw new ApiError(404, 'Không tìm thấy lô hàng');
  return toShipment(row);
}

/**
 * Lô profit — NEPO-61/62. Revenue = Σ giấy báo nợ issued on the lô; supplier
 * costs = Σ shipment_costs direction=SUPPLIER excluding awaiting-invoice rows
 * (Chờ hóa đơn has no invoice yet, so it books no cost); trip running cost =
 * totalCost for OWN trips, externalFreightCost (falling back to totalCost) for
 * EXTERNAL ones — mirrors the P&L decomposition in pnl.service.ts.
 */
async function computeProfit(shipmentId: number): Promise<ShipmentProfitSummary> {
  const [revenueRow] = await db.select({
    total: sql<string>`coalesce(sum(${s.billingDocuments.totalInclVat}), 0)`,
    count: sql<number>`count(*)`,
  }).from(s.billingDocuments).where(and(
    eq(s.billingDocuments.shipmentId, shipmentId),
    eq(s.billingDocuments.type, 'DEBIT_NOTE'),
    isNull(s.billingDocuments.deletedAt),
  ));
  const [costRow] = await db.select({
    collect: sql<string>`coalesce(sum(case when ${s.shipmentCosts.direction} = 'CUSTOMER' and not ${s.shipmentCosts.awaitingInvoice} then ${s.shipmentCosts.amount} else 0 end), 0)`,
    pay: sql<string>`coalesce(sum(case when ${s.shipmentCosts.direction} = 'SUPPLIER' and not ${s.shipmentCosts.awaitingInvoice} then ${s.shipmentCosts.amount} else 0 end), 0)`,
  }).from(s.shipmentCosts).where(eq(s.shipmentCosts.shipmentId, shipmentId));
  const [tripRow] = await db.select({
    total: sql<string>`coalesce(sum(case when ${s.trips.carrierType} = 'EXTERNAL'
      then coalesce(${s.trips.externalFreightCost}, ${s.trips.totalCost}, 0)
      else coalesce(${s.trips.totalCost}, 0) end), 0)`,
    count: sql<number>`count(*)`,
  }).from(s.trips).where(and(
    eq(s.trips.shipmentId, shipmentId),
    isNull(s.trips.deletedAt),
  ));
  const revenueInclVat = Number(revenueRow?.total ?? 0);
  const collectTotal = Number(costRow?.collect ?? 0);
  const payTotal = Number(costRow?.pay ?? 0);
  const tripCosts = Number(tripRow?.total ?? 0);
  return {
    revenueInclVat,
    collectTotal,
    payTotal,
    tripCosts,
    profit: revenueInclVat - payTotal - tripCosts,
    linkedTripCount: Number(tripRow?.count ?? 0),
    billingDocumentCount: Number(revenueRow?.count ?? 0),
  };
}

export async function getShipmentDetail(id: number) {
  const shipment = await getShipmentById(id);
  const [documents, costs, profit, billingDocuments, trips] = await Promise.all([
    db.select().from(s.shipmentDocuments)
      .where(eq(s.shipmentDocuments.shipmentId, id))
      .orderBy(desc(s.shipmentDocuments.createdAt), desc(s.shipmentDocuments.id)),
    db.select().from(s.shipmentCosts)
      .where(eq(s.shipmentCosts.shipmentId, id))
      .orderBy(desc(s.shipmentCosts.incurredDate), desc(s.shipmentCosts.id)),
    computeProfit(id),
    db.select({
      id: s.billingDocuments.id,
      type: s.billingDocuments.type,
      entityType: s.billingDocuments.entityType,
      entityId: s.billingDocuments.entityId,
      entityName: s.billingDocuments.entityName,
      rangeFrom: s.billingDocuments.rangeFrom,
      rangeTo: s.billingDocuments.rangeTo,
      totalInclVat: s.billingDocuments.totalInclVat,
      documentNumber: s.billingDocuments.documentNumber,
      parentDocumentId: s.billingDocuments.parentDocumentId,
      issuedAt: s.billingDocuments.issuedAt,
      note: s.billingDocuments.note,
      createdAt: s.billingDocuments.createdAt,
    }).from(s.billingDocuments).where(and(
      eq(s.billingDocuments.shipmentId, id),
      isNull(s.billingDocuments.deletedAt),
    )).orderBy(desc(s.billingDocuments.createdAt), desc(s.billingDocuments.id)),
    // NEPO-62 — the truck trips attached to this lô; their operational figures
    // feed the truck-transfer section and the lô profit.
    db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      status: s.trips.status,
      departureDate: s.trips.departureDate,
      plate: s.trucks.licensePlate,
      totalCost: s.trips.totalCost,
      revenue: s.trips.revenue,
      grossProfit: s.trips.grossProfit,
      carrierType: s.trips.carrierType,
    }).from(s.trips)
      .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .where(and(eq(s.trips.shipmentId, id), isNull(s.trips.deletedAt)))
      .orderBy(desc(s.trips.departureDate), desc(s.trips.id)),
  ]);
  return {
    ...shipment,
    documents: documents.map(toShipmentDocument),
    costs: costs.map(toShipmentCost),
    profit,
    billingDocuments: billingDocuments.map((doc) => ({
      ...doc,
      totalInclVat: Number(doc.totalInclVat),
      issuedAt: iso(doc.issuedAt),
      createdAt: iso(doc.createdAt),
    })),
    trips: trips.map((trip) => ({
      ...trip,
      totalCost: trip.totalCost != null ? Number(trip.totalCost) : null,
      revenue: trip.revenue != null ? Number(trip.revenue) : null,
      grossProfit: trip.grossProfit != null ? Number(trip.grossProfit) : null,
    })),
  };
}

/**
 * Auto code [Mã KH][Năm][STT]: prefix from the customer's shortName, year from
 * the creation date, sequence per prefix+year under an advisory lock so two
 * concurrent creates cannot take the same number. Two customers sharing a
 * shortName share the sequence space (codes stay unique; interleaved numbers
 * are acceptable — the prefix is the customer's identity, not a unique key).
 */
export async function createShipment(input: CreateShipmentInput, userId: number | null): Promise<Shipment> {
  const [customer] = await db.select({
    id: s.customers.id,
    name: s.customers.name,
    shortName: s.customers.shortName,
  }).from(s.customers)
    .where(and(eq(s.customers.id, input.customerId), isNull(s.customers.deletedAt)))
    .limit(1);
  if (!customer) throw new ApiError(404, 'Không tìm thấy khách hàng');
  const prefix = shipmentCodePrefix(customer.shortName ?? '');
  if (prefix.length < 2) {
    throw new ApiError(400, 'Khách hàng chưa có tên viết tắt (Mã KH) hợp lệ — hãy cập nhật trong cấu hình khách hàng');
  }
  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}${String(year % 100).padStart(2, '0')}`;
  const code = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`shipments:${prefix}:${year}`}))`);
    const rows = await tx.select({ code: s.shipments.shipmentCode })
      .from(s.shipments)
      .where(sql`${s.shipments.shipmentCode} LIKE ${`${yearPrefix}%`}`);
    const re = shipmentCodeSeqRe(prefix, year);
    let maxSeq = 0;
    for (const row of rows) {
      const match = re.exec(row.code);
      if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
    }
    return buildShipmentCode(prefix, year, maxSeq + 1);
  });
  const [row] = await db.insert(s.shipments).values({
    shipmentCode: code,
    customerId: input.customerId,
    flowType: input.flowType ?? null,
    shippingLine: input.shippingLine ?? null,
    bookingNo: input.bookingNo ?? null,
    blNo: input.blNo ?? null,
    vesselVoyage: input.vesselVoyage ?? null,
    pol: input.pol ?? null,
    pod: input.pod ?? null,
    etd: input.etd ?? null,
    eta: input.eta ?? null,
    cutoffDate: input.cutoffDate ?? null,
    containerSeals: input.containerSeals ?? null,
    customsDeclarationNo: input.customsDeclarationNo ?? null,
    customsDeclarationDate: input.customsDeclarationDate ?? null,
    notes: input.notes ?? null,
    createdBy: userId,
  }).returning({ id: s.shipments.id });
  return getShipmentById(row.id);
}

export async function updateShipment(id: number, input: UpdateShipmentInput): Promise<Shipment> {
  const current = await getShipmentById(id);
  // The code encodes the customer — moving a lô between customers would
  // silently break the [Mã KH] invariant.
  if (input.customerId !== undefined && input.customerId !== null && input.customerId !== current.customerId) {
    throw new ApiError(400, 'Không thể đổi khách hàng của lô (mã lô gắn với khách hàng)');
  }
  const set: Record<string, unknown> = { updatedAt: new Date() };
  const fields = [
    'flowType', 'shippingLine', 'bookingNo', 'blNo', 'vesselVoyage', 'pol', 'pod',
    'etd', 'eta', 'cutoffDate', 'containerSeals',
    'customsDeclarationNo', 'customsDeclarationDate', 'notes',
  ] as const;
  for (const field of fields) {
    if (input[field] !== undefined) set[field] = input[field] ?? null;
  }
  await db.update(s.shipments).set(set).where(eq(s.shipments.id, id));
  return getShipmentById(id);
}

// ─── Documents (chứng từ) ────────────────────────────────────────────────────

export async function registerShipmentDocument(
  shipmentId: number,
  input: RegisterShipmentDocumentInput,
  file: { originalname: string; mimetype: string; size: number },
  storageKey: string,
  userId: number | null,
): Promise<ShipmentDocument> {
  await assertShipmentExists(shipmentId);
  const [row] = await db.insert(s.shipmentDocuments).values({
    shipmentId,
    docType: input.docType,
    fileName: file.originalname,
    storageKey,
    mimeType: file.mimetype || null,
    fileSize: file.size,
    note: input.note ?? null,
    uploadedBy: userId,
  }).returning();
  return toShipmentDocument(row);
}

export async function deleteShipmentDocument(shipmentId: number, docId: number): Promise<void> {
  const [row] = await db.select({ id: s.shipmentDocuments.id, storageKey: s.shipmentDocuments.storageKey })
    .from(s.shipmentDocuments)
    .where(and(eq(s.shipmentDocuments.id, docId), eq(s.shipmentDocuments.shipmentId, shipmentId)))
    .limit(1);
  if (!row) throw new ApiError(404, 'Không tìm thấy chứng từ');
  await db.delete(s.shipmentDocuments).where(eq(s.shipmentDocuments.id, docId));
  await storageService.delete(row.storageKey);
}

export async function readShipmentDocumentFile(shipmentId: number, docId: number) {
  const [row] = await db.select().from(s.shipmentDocuments)
    .where(and(eq(s.shipmentDocuments.id, docId), eq(s.shipmentDocuments.shipmentId, shipmentId)))
    .limit(1);
  if (!row) throw new ApiError(404, 'Không tìm thấy chứng từ');
  const buffer = await storageService.read(row.storageKey);
  if (!buffer) throw new ApiError(404, 'File chứng từ không còn tồn tại trên máy chủ');
  return { document: toShipmentDocument(row), buffer };
}

// ─── Costs (chi phí) ─────────────────────────────────────────────────────────

/**
 * NEPO-62 money rule: VND is always an integer. A USD row stores its original
 * amount + exchange rate; the VND column is derived here (rounded), so every
 * downstream total stays integer-exact and the register never re-derives it.
 */
export function deriveCostAmountVnd(input: {
  currency?: 'VND' | 'USD';
  fxAmount?: number | null;
  exchangeRate?: number | null;
  amount?: number;
}): string {
  if (input.currency === 'USD') {
    if (input.fxAmount == null || input.exchangeRate == null) {
      throw new ApiError(400, 'Dòng USD cần số tiền gốc và tỷ giá quy đổi');
    }
    return String(Math.round(input.fxAmount * input.exchangeRate));
  }
  return String(input.amount ?? 0);
}

export async function addShipmentCost(shipmentId: number, input: ShipmentCostInput, userId: number | null): Promise<ShipmentCost> {
  await assertShipmentExists(shipmentId);
  const [row] = await db.insert(s.shipmentCosts).values({
    shipmentId,
    costType: input.costType,
    direction: input.direction ?? 'SUPPLIER',
    serviceMode: input.serviceMode ?? 'SERVICE',
    description: input.description,
    currency: input.currency ?? 'VND',
    fxAmount: input.currency === 'USD' ? String(input.fxAmount) : null,
    exchangeRate: input.currency === 'USD' ? String(input.exchangeRate) : null,
    amount: deriveCostAmountVnd(input),
    vatRate: String(input.vatRate ?? 0.08),
    awaitingInvoice: input.awaitingInvoice ?? false,
    incurredDate: input.incurredDate,
    note: input.note ?? null,
    createdBy: userId,
  }).returning();
  return toShipmentCost(row);
}

export async function updateShipmentCost(shipmentId: number, costId: number, input: ShipmentCostUpdateInput): Promise<ShipmentCost> {
  const [current] = await db.select().from(s.shipmentCosts)
    .where(and(eq(s.shipmentCosts.id, costId), eq(s.shipmentCosts.shipmentId, shipmentId)))
    .limit(1);
  if (!current) throw new ApiError(404, 'Không tìm thấy chi phí');
  const merged = {
    currency: (input.currency ?? current.currency) as 'VND' | 'USD',
    fxAmount: input.fxAmount !== undefined ? input.fxAmount : (current.fxAmount != null ? Number(current.fxAmount) : null),
    exchangeRate: input.exchangeRate !== undefined ? input.exchangeRate : (current.exchangeRate != null ? Number(current.exchangeRate) : null),
    amount: input.amount !== undefined ? input.amount : Number(current.amount),
  };
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.costType !== undefined) set.costType = input.costType;
  if (input.direction !== undefined) set.direction = input.direction;
  if (input.serviceMode !== undefined) set.serviceMode = input.serviceMode;
  if (input.description !== undefined) set.description = input.description;
  if (input.currency !== undefined) set.currency = input.currency;
  set.fxAmount = merged.currency === 'USD' && merged.fxAmount != null ? String(merged.fxAmount) : null;
  set.exchangeRate = merged.currency === 'USD' && merged.exchangeRate != null ? String(merged.exchangeRate) : null;
  set.amount = deriveCostAmountVnd(merged);
  if (input.vatRate !== undefined) set.vatRate = String(input.vatRate);
  if (input.awaitingInvoice !== undefined) set.awaitingInvoice = input.awaitingInvoice;
  if (input.incurredDate !== undefined) set.incurredDate = input.incurredDate;
  if (input.note !== undefined) set.note = input.note ?? null;
  const [row] = await db.update(s.shipmentCosts).set(set)
    .where(eq(s.shipmentCosts.id, costId)).returning();
  return toShipmentCost(row);
}

export async function deleteShipmentCost(shipmentId: number, costId: number): Promise<void> {
  const [row] = await db.select({ id: s.shipmentCosts.id }).from(s.shipmentCosts)
    .where(and(eq(s.shipmentCosts.id, costId), eq(s.shipmentCosts.shipmentId, shipmentId)))
    .limit(1);
  if (!row) throw new ApiError(404, 'Không tìm thấy chi phí');
  await db.delete(s.shipmentCosts).where(eq(s.shipmentCosts.id, costId));
}

// ─── Lot cost register (Bảng chi phí theo lô — NEPO-62) ──────────────────────
// Vertical rows grouped into the six service groups. Row status precedence:
// awaiting-invoice wins over already-on-debit-note, which wins over pending.
// The truck-transfer section is DERIVED from the linked trips' own operational
// figures (dầu / lương / vé cầu đường / cước thuê xe ngoài) — it is never
// manually bookable, so sea freight or customs fees can never leak into it.

/** One row per operational cost key: Σ across the lô's linked trips. */
export function truckTransferRows(
  trips: Array<{
    tripCode: string | null;
    totalFuelCost: string | null;
    driverSalary: string | null;
    tollCost: string | null;
    externalFreightCost: string | null;
    carrierType: string;
  }>,
): { rows: TruckTransferCostRow[]; total: number } {
  const sums = new Map<TruckTransferCostKey, { amount: number; tripCodes: string[] }>();
  const add = (key: TruckTransferCostKey, raw: string | null, tripCode: string | null) => {
    if (raw == null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount === 0) return;
    const bucket = sums.get(key) ?? { amount: 0, tripCodes: [] };
    bucket.amount += amount;
    if (tripCode) bucket.tripCodes.push(tripCode);
    sums.set(key, bucket);
  };
  for (const trip of trips) {
    add(TruckTransferCostKey.FUEL, trip.totalFuelCost, trip.tripCode);
    add(TruckTransferCostKey.DRIVER_SALARY, trip.driverSalary, trip.tripCode);
    add(TruckTransferCostKey.TOLLS, trip.tollCost, trip.tripCode);
    // Cước thuê xe ngoài only exists on EXTERNAL-carrier trips.
    if (trip.carrierType === 'EXTERNAL') {
      add(TruckTransferCostKey.EXTERNAL_FREIGHT, trip.externalFreightCost, trip.tripCode);
    }
  }
  const rows: TruckTransferCostRow[] = TRUCK_TRANSFER_COST_ROWS
    .filter((def) => sums.has(def.key))
    .map((def) => {
      const bucket = sums.get(def.key)!;
      return {
        key: def.key,
        label: def.label,
        amount: bucket.amount,
        tripCode: bucket.tripCodes.join(', ') || null,
      };
    });
  return { rows, total: rows.reduce((sum, row) => sum + row.amount, 0) };
}

export async function getLotCostRegister(shipmentId: number): Promise<LotCostRegister> {
  const shipment = await getShipmentById(shipmentId);

  // Raw select: the exists() probe joins billing lines/documents by explicit
  // table names — drizzle's column interpolation renders unqualified "id"
  // here, which binds to the sub-select's own bdl.id instead of shipment_costs.
  const costRowsResult = await db.execute(sql`
    select sc.id, sc.cost_type, sc.direction, sc.service_mode, sc.description,
           sc.currency, sc.fx_amount, sc.exchange_rate, sc.amount, sc.vat_rate,
           sc.awaiting_invoice, sc.incurred_date, sc.note,
           exists (
             select 1 from billing_document_lines bdl
             join billing_documents bd on bd.id = bdl.document_id
             where bdl.source_type = 'SHIPMENT_COST'
               and bdl.source_id = sc.id
               and bd.type = 'DEBIT_NOTE'
               and bd.deleted_at is null
           ) as on_debit_note
    from shipment_costs sc
    where sc.shipment_id = ${shipmentId}
    order by sc.incurred_date, sc.id
  `);
  const costs = (costRowsResult as unknown as Array<{
    id: number; cost_type: string; direction: string; service_mode: string;
    description: string; currency: string; fx_amount: string | null; exchange_rate: string | null;
    amount: string; vat_rate: string; awaiting_invoice: boolean; incurred_date: string;
    note: string | null; on_debit_note: boolean;
  }>).map((row) => ({
    id: Number(row.id),
    costType: row.cost_type,
    direction: row.direction,
    serviceMode: row.service_mode,
    description: row.description,
    currency: row.currency,
    fxAmount: row.fx_amount,
    exchangeRate: row.exchange_rate,
    amount: row.amount,
    vatRate: row.vat_rate,
    awaitingInvoice: Boolean(row.awaiting_invoice),
    incurredDate: String(row.incurred_date),
    note: row.note,
    onDebitNote: Boolean(row.on_debit_note),
  }));

  const linkedTrips = await db.select({
    tripCode: s.trips.tripCode,
    totalFuelCost: s.trips.totalFuelCost,
    driverSalary: s.trips.driverSalary,
    tollCost: s.trips.tollCost,
    externalFreightCost: s.trips.externalFreightCost,
    carrierType: s.trips.carrierType,
  }).from(s.trips)
    .where(and(eq(s.trips.shipmentId, shipmentId), isNull(s.trips.deletedAt)))
    .orderBy(s.trips.departureDate);

  const rows: LotCostRow[] = costs.map((cost) => {
    const group = cost.costType as FeeGroup;
    return {
      id: cost.id,
      costType: group,
      label: FEE_GROUP_LABELS[group] ?? cost.costType,
      group,
      direction: cost.direction as 'CUSTOMER' | 'SUPPLIER',
      serviceMode: cost.serviceMode as 'SERVICE' | 'ADVANCE',
      status: cost.awaitingInvoice
        ? LotFeeStatus.AWAITING_INVOICE
        : (cost.onDebitNote ? LotFeeStatus.ON_DEBIT_NOTE : LotFeeStatus.PENDING),
      description: cost.description,
      currency: cost.currency as 'VND' | 'USD',
      fxAmount: cost.fxAmount != null ? Number(cost.fxAmount) : null,
      exchangeRate: cost.exchangeRate != null ? Number(cost.exchangeRate) : null,
      amount: Number(cost.amount),
      vatRate: cost.vatRate,
      awaitingInvoice: cost.awaitingInvoice,
      incurredDate: String(cost.incurredDate),
      note: cost.note,
    };
  });

  const groupOrder = shipment.flowType === 'NHAP'
    ? LOT_DEBIT_NOTE_ORDER.NHAP
    : LOT_DEBIT_NOTE_ORDER.XUAT;
  const groups: LotCostGroup[] = groupOrder.map((group) => {
    const groupRows = rows.filter((row) => row.group === group);
    const billable = groupRows.filter((row) => !row.awaitingInvoice);
    return {
      group,
      label: FEE_GROUP_LABELS[group],
      rows: groupRows,
      collectTotal: billable
        .filter((row) => row.direction === 'CUSTOMER')
        .reduce((sum, row) => sum + row.amount, 0),
      payTotal: billable
        .filter((row) => row.direction === 'SUPPLIER')
        .reduce((sum, row) => sum + row.amount, 0),
    };
  });
  const billable = rows.filter((row) => !row.awaitingInvoice);

  return {
    shipmentId: shipment.id,
    shipmentCode: shipment.shipmentCode,
    customerId: shipment.customerId,
    customerName: shipment.customerName ?? '',
    flowType: shipment.flowType,
    groups,
    truckTransfer: truckTransferRows(linkedTrips),
    totals: {
      collect: billable
        .filter((row) => row.direction === 'CUSTOMER')
        .reduce((sum, row) => sum + row.amount, 0),
      pay: billable
        .filter((row) => row.direction === 'SUPPLIER')
        .reduce((sum, row) => sum + row.amount, 0),
    },
  };
}

export type { LinkTripShipmentInput };
