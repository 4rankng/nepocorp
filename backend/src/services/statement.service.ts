import { db } from '../db';
import * as s from '../db/schema';
import { and, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type { Writable } from 'stream';
import ExcelJS from 'exceljs';
import { TxnType, computeFifoAging, FORWARDER_EXPENSE_TYPE_DEFAULTS } from '@tingting/shared';
import type { AgingBucket, FastStatementDetail, PeriodSummary, StatementVoucher, StatementVoucherLine, SupplierFuelStatement, SupplierFuelStatementRow, SupplierFuelStatementUnassignedTrip, StatementLine, StatementPeriodTotals } from '@tingting/shared';
import { LedgerService } from './ledger.service';
import { ApiError } from '../errors';
import { escapeHtml, formatDateVi } from '../lib/format';
import { getCompanyInfo } from './company-info.service';
import { CustomerAgingListItem } from './aging.service';

type LedgerRow = typeof s.ledger.$inferSelect;
// Ledger rows enriched with related trip context for customer and supplier displays.
export type EnrichedLedgerRow = LedgerRow & {
  routeName?: string | null;
  containerNumbers?: string[];
  tripId?: number | null;
  tripCode?: string | null;
  serviceFeeLabel?: string | null;
  fuelDetails?: {
    departureDate: string;
    truckPlate: string | null;
    routeName: string | null;
    liters: string | null;
    unitPrice: string | null;
    amount: string;
  } | null;
  expenseDetails?: {
    expenseDate: string;
    vehiclePlate: string | null;
    vehicleComponent: 'TRUCK' | 'TRAILER' | null;
    categoryName: string;
    amount: string;
  } | null;
};

export interface FuelTripStatementRow {
  id: number;
  tripCode: string | null;
  departureDate: string;
  truckPlate: string | null;
  routeName: string | null;
  fuelLiters: string | null;
  fuelActualUnitPrice: string | null;
  fuelPriceApplied: string | null;
  totalFuelCost: string | null;
}

export interface SupplierExpenseStatementRow {
  id: number;
  supplierId: number;
  expenseDate: string;
  vehiclePlate: string | null;
  vehicleComponent: 'TRUCK' | 'TRAILER' | null;
  categoryName: string;
  amount: string;
  createdAt: Date | string;
}

export interface CustomerStatementData {
  customer: { id: number; name: string; contactInfo: string | null; taxCode?: string | null; debitNoteMode?: string | null; isCarrier?: boolean };
  ledgerRows: EnrichedLedgerRow[];
  totalOutstanding: number;
  /** Debt owed across the WHOLE ledger — independent of any date filter. */
  currentTotalOutstanding?: number;
  /** Aging frozen at the period end; null when the request had no end date. */
  agingAsOfPeriodEnd?: AgingBucket[] | null;
  unpaidTrips: Array<{ tripId: number; date: string; outstanding: number; note: string }>;
  agingBuckets: Array<{ range: string; amount: number }>;
  latestActivityDate?: string | null;
  periodSummary?: PeriodSummary;
  /** NEPO-46 sổ chi tiết lines + tổng kết kỳ (see shared StatementLine). */
  statementLines: StatementLine[];
  statementTotals: StatementPeriodTotals;
  /** NEPO-47 — cùng dữ liệu xếp theo mẫu Fast 'SỔ CHI TIẾT CÔNG NỢ'. */
  fastStatement: FastStatementDetail;
  /** Kỳ báo cáo of the request (client filter or ledger activity bounds) —
   * renders 'TỪ NGÀY … ĐẾN NGÀY …' in the Fast header + exports. */
  period: { dateFrom: string; dateTo: string };
}

export interface SupplierStatementData {
  supplier: { id: number; name: string; phone: string | null; contactPerson: string | null };
  ledgerRows: EnrichedLedgerRow[];
  totalOutstanding: number;
  /** Debt owed across the WHOLE ledger — independent of any date filter. */
  currentTotalOutstanding?: number;
  /** Aging frozen at the period end; null when the request had no end date. */
  agingAsOfPeriodEnd?: AgingBucket[] | null;
  agingBuckets: Array<{ range: string; amount: number }>;
  hasFuelExpenses?: boolean;
  latestActivityDate?: string | null;
  periodSummary?: PeriodSummary;
}

export function withPayableProjectionBalances(rows: EnrichedLedgerRow[]): EnrichedLedgerRow[] {
  let balance = 0;
  return [...rows]
    .sort((a, b) => a.id - b.id)
    .map(row => {
      balance += Number(row.credit ?? 0) - Number(row.debit ?? 0);
      return { ...row, balance: String(balance) };
    })
    .reverse();
}

export function withReceivableProjectionBalances(rows: EnrichedLedgerRow[]): EnrichedLedgerRow[] {
  let balance = 0;
  return [...rows]
    .sort((a, b) => a.id - b.id)
    .map(row => {
      balance += Number(row.debit ?? 0) - Number(row.credit ?? 0);
      return { ...row, balance: String(balance) };
    })
    .reverse();
}

export function attachFuelDetailsToLedgerRows(
  ledgerRows: EnrichedLedgerRow[],
  trips: FuelTripStatementRow[],
): EnrichedLedgerRow[] {
  const tripById = new Map(trips.map(trip => [trip.id, trip]));
  return ledgerRows.map(row => {
    if (row.txnType !== TxnType.FUEL_EXPENSE || !row.txnId) return row;
    const trip = tripById.get(row.txnId);
    if (!trip) return { ...row, tripCode: null, fuelDetails: null };
    return {
      ...row,
      tripCode: trip.tripCode,
      fuelDetails: {
        departureDate: trip.departureDate,
        truckPlate: trip.truckPlate,
        routeName: trip.routeName,
        liters: trip.fuelLiters,
        unitPrice: trip.fuelActualUnitPrice ?? trip.fuelPriceApplied,
        amount: row.credit ?? trip.totalFuelCost ?? '0',
      },
    };
  });
}

/**
 * Resolves payable expense rows to their operational vehicle context.
 *
 * New ledger rows carry the expense id in txnId. Legacy rows predate that
 * linkage, so they are resolved only when the match is deterministic: the
 * same supplier and amount plus an identical creation timestamp, or a single
 * unique supplier/amount candidate. Ambiguous rows intentionally stay blank.
 */
export function attachSupplierExpenseDetailsToLedgerRows(
  ledgerRows: EnrichedLedgerRow[],
  expenses: SupplierExpenseStatementRow[],
): EnrichedLedgerRow[] {
  const expenseById = new Map(expenses.map(expense => [expense.id, expense]));
  const expensesBySupplierAmount = new Map<string, SupplierExpenseStatementRow[]>();
  for (const expense of expenses) {
    const key = `${expense.supplierId}|${Number(expense.amount)}`;
    const candidates = expensesBySupplierAmount.get(key) ?? [];
    candidates.push(expense);
    expensesBySupplierAmount.set(key, candidates);
  }

  return ledgerRows.map(row => {
    if (row.txnType !== TxnType.VENDOR_EXPENSE) return row;

    let expense = row.txnId ? expenseById.get(row.txnId) : undefined;
    if (!expense) {
      const candidates = expensesBySupplierAmount.get(
        `${row.entityId}|${Number(row.credit ?? 0)}`,
      ) ?? [];
      const rowTimestamp = new Date(row.timestamp).getTime();
      const timestampMatches = candidates.filter(candidate =>
        Math.abs(new Date(candidate.createdAt).getTime() - rowTimestamp) < 1_000,
      );
      expense = timestampMatches.length === 1
        ? timestampMatches[0]
        : candidates.length === 1
          ? candidates[0]
          : undefined;
    }

    if (!expense) return { ...row, expenseDetails: null };
    return {
      ...row,
      expenseDetails: {
        expenseDate: expense.expenseDate,
        vehiclePlate: expense.vehiclePlate,
        vehicleComponent: expense.vehicleComponent,
        categoryName: expense.categoryName,
        amount: expense.amount,
      },
    };
  });
}

interface StatementExportConfig {
  heading: string;
  sheetName?: string;
  entityLabel: string;
  entityName: string;
  contactLines: string[];
  txnLabels: Record<string, string>;
  ledgerRows: EnrichedLedgerRow[];
  totalOutstanding: number;
  agingBuckets: Array<{ range: string; amount: number }>;
  /** NEPO-46: when present, the detail section renders the sổ chi tiết
   * layout (month groups + aggregate payments + running balance) instead of
   * the flat ledger table. Supplier/carrier/fuel exports omit it. */
  statementLines?: StatementLine[];
  statementTotals?: StatementPeriodTotals;
  periodSummary?: PeriodSummary | null;
  /** NEPO-47 — Fast 'SỔ CHI TIẾT CÔNG NỢ' header data (customer statements
   * only): account line, customer code (MST), report period, company
   * letterhead (tên + địa chỉ công ty; '' = ẩn dòng letterhead tương ứng). */
  fast?: {
    accountLine: string;
    customerCode: string | null;
    period: { dateFrom: string; dateTo: string };
    companyName: string;
    companyAddress: string;
  };
}

export function safeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (c) => c === 'đ' ? 'd' : 'D')
    .replace(/[^a-zA-Z0-9 ._-]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'statement';
}

export function attachmentDisposition(filename: string): string {
  const fallback = safeFilename(filename);
  const encoded = encodeURIComponent(filename)
    .replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/** Parse a `YYYY-MM-DD` query param. Returns `undefined` for missing/invalid
 * values so malformed inputs degrade to "no filter" instead of producing
 * NaN-based comparisons that silently yield wrong totals. */
function parseIsoDateParam(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Strict YYYY-MM-DD check (the format the frontend date inputs emit).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const t = new Date(raw + 'T00:00:00').getTime();
  return Number.isFinite(t) ? raw : undefined;
}

export function normalizeDateParam(raw: string | undefined): string | undefined {
  return parseIsoDateParam(raw);
}

/**
 * Computes the AR/AP period summary (số dư đầu kỳ / phát sinh trong kỳ / số dư
 * cuối kỳ) for the period filter on the detail pages.
 *
 * Sign convention matches `LedgerService.postEntry`:
 *   - CUSTOMER (AR): outstanding grows with debit, shrinks with credit.
 *     `periodActivity = debitTotal − creditTotal`.
 *   - VENDOR (AP): outstanding grows with credit, shrinks with debit.
 *     `periodActivity = creditTotal − debitTotal`.
 *
 * Opening balance is derived from every debit/credit strictly before
 * `dateFrom`. It deliberately does not trust the stored running balance:
 * backdated payments have a business timestamp earlier than rows inserted
 * before them, while the stored balance necessarily follows insertion order.
 *
 * Returns `null` when neither bound is supplied — the caller then omits the
 * field entirely and the frontend renders a loading skeleton.
 */
export function computePeriodSummary(
  rows: Array<{ id: number; timestamp: Date | string; debit: string | null; credit: string | null; balance: string }>,
  dateFrom: string | undefined,
  dateTo: string | undefined,
  entityType: 'CUSTOMER' | 'VENDOR',
): PeriodSummary | null {
  if (!dateFrom && !dateTo) return null;

  const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
  const toTs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null;

  let openingBalance = 0;
  let debitTotal = 0;
  let creditTotal = 0;

  for (const r of rows) {
    const t = new Date(r.timestamp).getTime();
    const debit = Number(r.debit ?? 0) || 0;
    const credit = Number(r.credit ?? 0) || 0;

    if (fromTs !== null && t < fromTs) {
      openingBalance += entityType === 'CUSTOMER'
        ? debit - credit
        : credit - debit;
    } else if ((fromTs === null || t >= fromTs) && (toTs === null || t <= toTs)) {
      debitTotal += debit;
      creditTotal += credit;
    }
  }

  const periodActivity = entityType === 'CUSTOMER'
    ? debitTotal - creditTotal
    : creditTotal - debitTotal;
  const closingBalance = openingBalance + periodActivity;

  return {
    openingBalance,
    closingBalance,
    periodActivity,
    debitTotal,
    creditTotal,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
  };
}

const TXN_LABELS: Record<string, string> = {
  TRIP_REVENUE: 'Doanh thu chuyến',
  PAYMENT_RECEIVED: 'Thu tiền',
  PENALTY: 'Phạt',
  MANAGEMENT_FEE: 'Phí quản lý',
  ADJUSTMENT: 'Điều chỉnh',
  DRIVER_SALARY: 'Lương lái xe',
  UNLOCK_REVERSAL: 'Hoàn tác khóa chuyến',
  EXTERNAL_CARRIER_COST: 'Cước thuê ngoài',
  SERVICE_FEE: 'Phí chi hộ',
};

function serviceFeeLabel(expenseType: string, billingLabel?: string | null, name?: string | null): string {
  return (
    billingLabel?.trim()
    || name?.trim()
    || FORWARDER_EXPENSE_TYPE_DEFAULTS[expenseType]?.billingLabel
    || expenseType
  );
}

function isLegacyServiceFeeRevenueRow(row: LedgerRow): boolean {
  if (row.txnType !== TxnType.TRIP_REVENUE || !row.note) return false;
  return row.note.includes('Tạm ứng/nộp hộ') || row.note.includes('Phí chi hộ');
}

const VENDOR_TXN_LABELS: Record<string, string> = {
  VENDOR_EXPENSE: 'Ghi nhận chi phí',
  VENDOR_PAYMENT: 'Thanh toán công nợ',
  FUEL_EXPENSE: 'Chi phí nhiên liệu',
  COMMISSION: 'Hoa hồng',
  EXTERNAL_CARRIER_COST: 'Cước thuê ngoài',
  ADJUSTMENT: 'Điều chỉnh',
  UNLOCK_REVERSAL: 'Hoàn tác khóa chuyến',
};

/**
 * FIFO aging for a set of ledger rows, in the entity's own sign convention
 * (CUSTOMER: outstanding grows with debit; VENDOR: with credit — the mirror of
 * `computePeriodSummary`).
 *
 * Callers deliberately pass the FULL ledger when they need "what does this
 * counterparty owe right now", and a date-truncated slice when they need the
 * position as of a period end.
 */
function computeAgingFor(
  rows: Array<{ timestamp: Date; debit: string | null; credit: string | null }>,
  entityType: 'CUSTOMER' | 'VENDOR',
  referenceDate: Date,
): { total: number; buckets: AgingBucket[] } {
  const sign = entityType === 'CUSTOMER' ? 1 : -1;
  const { aging } = computeFifoAging(
    rows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      debit: sign === 1 ? (r.debit ?? '0') : (r.credit ?? '0'),
      credit: sign === 1 ? (r.credit ?? '0') : (r.debit ?? '0'),
    })),
    referenceDate,
  );
  return {
    total: aging.current + aging.d30 + aging.d60 + aging.over90,
    buckets: [
      { range: '0-30 ngày', amount: aging.current },
      { range: '31-60 ngày', amount: aging.d30 },
      { range: '61-90 ngày', amount: aging.d60 },
      { range: 'Trên 90 ngày', amount: aging.over90 },
    ],
  };
}

/**
 * Collapse legacy edit-cycle noise from statement detail tables (NEPO-43, r2:
 * every entity, every surface). While a trip was COMPLETED, updateTripFigures
 * ran a full postTripUnlock + postTripLock cycle on every save even when
 * nothing ledger-relevant changed. The UNLOCK_REVERSAL and the re-posted
 * original land in the SAME transaction — identical instant, same entityType
 * and txnId, mirrored amount (debit↔credit) — a net-0 pair that only clutters
 * the chi tiết table, so both rows are hidden here.
 *
 * Matching is generic across every pair the lock can mint — CUSTOMER↔
 * TRIP_REVENUE / SERVICE_FEE, CARRIER↔EXTERNAL_CARRIER_COST,
 * DRIVER↔DRIVER_SALARY, VENDOR↔fuel (FUEL_EXPENSE / VENDOR_EXPENSE),
 * FORWARDER↔FORWARDER_ADVANCE. A reversal with no same-instant match (a trip
 * genuinely reopened or canceled) still shows, and payments, penalties etc.
 * are never dropped. Aging, balances and period summary are computed upstream
 * on the uncollapsed rows and stay untouched — this only filters display rows.
 */
export function collapseEditCyclePairs(rows: EnrichedLedgerRow[]): EnrichedLedgerRow[] {
  // Bucket matchable original rows by entity|txn|side:amount|instant so a
  // reversal matches at most one original row (1:1). entityType/entityId are
  // part of the key: statement builders merge ledgers (e.g. the carrier
  // payable merges historical CUSTOMER rows with CARRIER rows), and rows from
  // different ledgers must never cross-pair.
  const originalBuckets = new Map<string, number[]>();
  const bucketKey = (row: EnrichedLedgerRow, side: 'd' | 'c', amount: number, instant: number) =>
    `${row.entityType}|${row.entityId}|${row.txnId}|${side}${amount}|${instant}`;

  rows.forEach((row, index) => {
    if (row.txnType === TxnType.UNLOCK_REVERSAL || row.txnId == null) return;
    const debit = Number(row.debit ?? 0);
    const credit = Number(row.credit ?? 0);
    const instant = new Date(row.timestamp).getTime();
    for (const side of ['d', 'c'] as const) {
      const amount = side === 'd' ? debit : credit;
      if (amount <= 0) continue;
      const key = bucketKey(row, side, amount, instant);
      const bucket = originalBuckets.get(key);
      if (bucket) bucket.push(index);
      else originalBuckets.set(key, [index]);
    }
  });

  // Pair oldest-first (ascending id) so N identical same-instant pairs collapse
  // in posting order and a surplus original or reversal stays visible.
  for (const bucket of originalBuckets.values()) {
    bucket.sort((a, b) => rows[a].id - rows[b].id);
  }

  const dropped = new Set<number>();
  rows.forEach((row, index) => {
    if (row.txnType !== TxnType.UNLOCK_REVERSAL || row.txnId == null) return;
    const debit = Number(row.debit ?? 0);
    const credit = Number(row.credit ?? 0);
    const instant = new Date(row.timestamp).getTime();
    // A reversal mirrors exactly one original side: its credit cancels an
    // original debit, its debit cancels an original credit.
    const key = debit > 0
      ? bucketKey(row, 'c', debit, instant)
      : credit > 0
        ? bucketKey(row, 'd', credit, instant)
        : null;
    if (key === null) return;
    const originalIndex = originalBuckets.get(key)?.shift();
    if (originalIndex === undefined) return;
    dropped.add(index);
    dropped.add(originalIndex);
  });

  if (dropped.size === 0) return rows;
  return rows.filter((_, index) => !dropped.has(index));
}

/** VND is integer-only (NEPO money law): round every parsed component. */
function toVndInt(v: string | number | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Ledger timestamps store Indochina wall time at UTC-offset 0 (repo-wide
 * display convention: toISOString().slice(0, 10) is the posting date). */
function ledgerDay(ts: Date | string): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export interface StatementLinesResult {
  lines: StatementLine[];
  totals: StatementPeriodTotals;
}

/** The MISA payment line text — both call sites (draft creation + fold)
 * MUST produce the identical format: 'KH trả X ₫ ngày dd/mm/yyyy'. The
 * channel suffix names the TK đối ứng for the accountant: BANK →
 * ' (chuyển khoản)' (TK 1121), CASH → ' (tiền mặt)' (TK 1111); legacy rows
 * with no recorded channel keep the bare text. */
const paymentLineDescription = (
  debit: number,
  credit: number,
  postedDate: string,
  method?: string | null,
): string => {
  const base = `KH trả ${(credit - debit).toLocaleString('vi-VN')} ₫ ngày ${postedDate.slice(8, 10)}/${postedDate.slice(5, 7)}/${postedDate.slice(0, 4)}`;
  if (method === 'BANK') return `${base} (chuyển khoản)`;
  if (method === 'CASH') return `${base} (tiền mặt)`;
  return base;
};

/** TK đối ứng per ledger row (MISA sổ chi tiết thanh toán với người mua): a
 * payment row maps its recorded channel to the cash/bank account — '1121'
 * chuyển khoản, '1111' tiền mặt; legacy rows without a channel → null (the
 * sổ renders '—'). Revenue/fee rows clear against '5111' doanh thu. Other
 * txn types (ADJUSTMENT, UNLOCK_REVERSAL, PENALTY, …) carry no counter
 * account rather than inventing one. */
const counterAccountFor = (r: EnrichedLedgerRow, isPayment: boolean): string | null => {
  if (isPayment) {
    if (r.paymentMethod === 'CASH') return '1111';
    if (r.paymentMethod === 'BANK') return '1121';
    return null;
  }
  const t = r.txnType as TxnType;
  return t === TxnType.TRIP_REVENUE || t === TxnType.SERVICE_FEE || t === TxnType.MANAGEMENT_FEE
    ? '5111'
    : null;
};

/** The ledger note embeds the trip code ('Doanh thu chuyến TRP-202610-0057',
 * 'Phí chi hộ chuyến X (Hoàn tác)'), but the sổ chi tiết already carries that
 * code in its Số hiệu column — repeating it made the diễn giải read like a
 * duplicate posting (kế toán feedback 2026-11-12). Strip the line's OWN code
 * and tidy the leftover spaces; any other reference in the note stays. */
const stripDocNoFromNote = (note: string, docNo: string | null): string => {
  if (!docNo || !note.includes(docNo)) return note;
  return note
    .split(docNo)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Builds the MISA 'Sổ chi tiết' lines (NEPO-46) from the statement's display
 * rows (already period-filtered + collapseEditCyclePairs'd) and the period
 * opening balance.
 *
 * Payment folding: one bank receipt = one document. PAYMENT_RECEIVED rows
 * sharing a receiptId fold into a single aggregate line — 'KH trả X ₫ ngày
 * dd/mm' — because recordPayment FIFO-splits the received total across trips
 * at posting time, and the accountant must read the receipt, not the split.
 * Rows without a receipt (legacy) stand alone. Folding is presentational:
 * the running balance is opening + Σ(debit − credit) over whatever lines are
 * on screen, so the sổ always closes at the same dư cuối the period summary
 * reports, regardless of grouping.
 *
 * Money law: every component passes toVndInt (integers in, integers out);
 * correctness validates by TOTAL — closingBalance must equal opening +
 * Σnợ − Σcó — never against per-trip component sums, since the balance
 * legitimately carries non-trip rows (trả trước credits, adjustments) that
 * trip-level sums never see.
 */
export function buildStatementLines(
  rows: EnrichedLedgerRow[],
  openingBalance: number,
  tripDepartureByTripId?: Map<number, string>,
): StatementLinesResult {
  const opening = Math.round(openingBalance);

  interface LineDraft {
    id: number;
    kind: StatementLine['kind'];
    timestamp: number;
    postedDate: string;
    docDate: string | null;
    docNo: string | null;
    description: string;
    /** Receipt channel 'BANK' | 'CASH'; null = legacy row without a channel. */
    method: string | null;
    /** TK đối ứng — '1121'/'1111' for payments, '5111' for revenue rows, else null. */
    counterAccount: string | null;
    debit: number;
    credit: number;
    txnType: TxnType;
    tripId: number | null;
    routeName: string | null;
    containerNumbers: string[];
    rowCount: number;
  }

  const drafts = new Map<number, LineDraft>();
  const receiptToDraftId = new Map<string, number>();

  const ordered = [...rows].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return ta !== tb ? ta - tb : a.id - b.id;
  });

  for (const r of ordered) {
    const debit = toVndInt(r.debit);
    const credit = toVndInt(r.credit);
    const postedDate = ledgerDay(r.timestamp);
    const isPayment = r.txnType === TxnType.PAYMENT_RECEIVED;

    // Fold into an existing same-receipt document — the 2nd..Nth FIFO row of
    // one bank receipt adds its amount to the aggregate payment line.
    if (isPayment && r.receiptId) {
      const existingId = receiptToDraftId.get(r.receiptId);
      if (existingId !== undefined) {
        const draft = drafts.get(existingId);
        if (draft) {
          draft.debit += debit;
          draft.credit += credit;
          draft.rowCount += 1;
          // The aggregate amount changes with every folded row — the
          // 'KH trả X ₫ ngày dd/mm' text must track the running receipt
          // total, not the first FIFO slice. method/counterAccount stay the
          // first row's: every slice of one receipt posts the same channel.
          draft.description = paymentLineDescription(draft.debit, draft.credit, draft.postedDate, draft.method);
          continue;
        }
      }
    }

    const method = isPayment ? (r.paymentMethod ?? null) : null;

    drafts.set(r.id, {
      id: r.id,
      kind: isPayment ? 'payment' : 'transaction',
      timestamp: new Date(r.timestamp).getTime(),
      postedDate,
      docDate: isPayment
        ? postedDate
        : (r.tripId != null ? tripDepartureByTripId?.get(r.tripId) ?? null : null),
      docNo: isPayment ? (r.receiptId ?? null) : (r.tripCode ?? null),
      description: isPayment
        ? paymentLineDescription(debit, credit, postedDate, method)
        : stripDocNoFromNote(r.note ?? 'Ghi nhận công nợ', r.tripCode ?? null),
      method,
      counterAccount: counterAccountFor(r, isPayment),
      debit,
      credit,
      // Drizzle's pgEnum infers a string union; the values are exactly the
      // shared TxnType enum members, so this cast is safe.
      txnType: r.txnType as TxnType,
      tripId: r.tripId ?? null,
      routeName: r.routeName ?? null,
      containerNumbers: r.containerNumbers ?? [],
      rowCount: 1,
    });
    if (isPayment && r.receiptId) receiptToDraftId.set(r.receiptId, r.id);
  }

  const lines: StatementLine[] = [];
  let balance = opening;
  let debitTotal = 0;
  let creditTotal = 0;
  const orderedDrafts = [...drafts.values()].sort((a, b) =>
    a.timestamp !== b.timestamp ? a.timestamp - b.timestamp : a.id - b.id,
  );
  for (const d of orderedDrafts) {
    balance += d.debit - d.credit;
    debitTotal += d.debit;
    creditTotal += d.credit;
    lines.push({
      id: d.id,
      kind: d.kind,
      month: d.postedDate.slice(0, 7),
      postedDate: d.postedDate,
      docDate: d.docDate,
      docNo: d.docNo,
      description: d.description,
      counterAccount: d.counterAccount,
      debit: d.debit,
      credit: d.credit,
      balance,
      txnType: d.txnType,
      tripId: d.tripId,
      ...(d.routeName ? { routeName: d.routeName } : {}),
      ...(d.containerNumbers.length > 0 ? { containerNumbers: d.containerNumbers } : {}),
      ...(d.kind === 'payment' ? { rowCount: d.rowCount } : {}),
    });
  }

  return {
    lines,
    totals: {
      openingBalance: opening,
      debitTotal,
      creditTotal,
      closingBalance: balance,
    },
  };
}

/**
 * NEPO-47 — re-renders the sổ chi tiết into the customer's Fast 'SỔ CHI TIẾT
 * CÔNG NỢ' layout (đọc mô tả NEPO-47): one STT per chứng từ, nhiều dòng
 * nghiệp vụ dưới cùng một STT (cước vận chuyển + chi hộ của cùng chuyến;
 * 2 dòng Nợ/Có của cùng phiếu), số dư chỉ ở đầu kỳ + tổng + cuối kỳ dạng 2 ô
 * Nợ|Có — mỗi dòng mang TK Đ.ỨNG từ `StatementLine.counterAccount` (null =
 * không có mã cố định); KHÔNG cột dư từng dòng.
 *
 * Grouping is presentational and order-preserving: lines sharing a voucher
 * document (trip code for shipments, receipt for payments) fold into one
 * voucher keyed by first occurrence; the money is untouched — Σ voucher nợ =
 * debitTotal, Σ voucher có = creditTotal, and the dư đầu/cuối pairs are the
 * signed balances split by sign (dương = Nợ khách còn nợ, âm = Có khách trả
 * trước). A composite voucher can legitimately carry both sides at once.
 */
export function buildFastStatement(
  lines: StatementLine[],
  totals: StatementPeriodTotals,
): FastStatementDetail {
  interface VoucherDraft {
    kind: StatementVoucher['kind'];
    docDate: string | null;
    docNo: string | null;
    lines: StatementVoucherLine[];
    debit: number;
    credit: number;
  }

  const drafts = new Map<string, VoucherDraft>();
  for (const line of lines) {
    // One voucher = one document: trip shipments group by their code (cước +
    // chi hộ under one STT), bank/cash receipts already fold per receipt
    // upstream, and docNo-less rows (legacy receipts, standalone adjustments)
    // each stand as their own voucher.
    const key = line.docNo && line.kind === 'transaction'
      ? `doc:${line.docNo}`
      : line.kind === 'payment' && line.docNo
        ? `receipt:${line.docNo}`
        : `row:${line.id}`;
    const detail = line.kind === 'payment'
      ? line.description
      : `${line.description}${line.routeName ? ` — ${line.routeName}` : ''}${line.containerNumbers?.length ? ` (${line.containerNumbers.join(', ')})` : ''}`;

    let draft = drafts.get(key);
    if (!draft) {
      draft = {
        kind: line.kind,
        docDate: line.docDate ?? line.postedDate,
        docNo: line.docNo,
        lines: [],
        debit: 0,
        credit: 0,
      };
      drafts.set(key, draft);
    }
    draft.lines.push({ description: detail, debit: line.debit, credit: line.credit, contraAccount: line.counterAccount ?? null });
    draft.debit += line.debit;
    draft.credit += line.credit;
  }

  const vouchers: StatementVoucher[] = [...drafts.values()].map((d, i) => ({
    stt: i + 1,
    kind: d.kind,
    docDate: d.docDate,
    docNo: d.docNo,
    lines: d.lines,
    debit: d.debit,
    credit: d.credit,
  }));

  // Signed balance → Fast 2 ô Nợ|Có: dương là Nợ (khách còn nợ), âm là Có
  // (khách trả trước); chỉ một ô trong hai mang số.
  const openingSigned = Math.round(totals.openingBalance);
  const closingSigned = Math.round(totals.closingBalance);
  return {
    opening: { debit: Math.max(0, openingSigned), credit: Math.max(0, -openingSigned) },
    vouchers,
    totals,
    closing: { debit: Math.max(0, closingSigned), credit: Math.max(0, -closingSigned) },
  };
}

const SHARED_CSS = `body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; max-width: 900px; margin: 24px auto; padding: 0 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 18px 0 4px; color: #00702f; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
  .total { font-size: 16px; font-weight: 700; color: #111827; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12.5px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; font-weight: 700; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .aging { width: auto; margin-top: 8px; }
  .aging td { padding: 4px 12px 4px 0; }
  .soke th { white-space: nowrap; }
  .soke td:nth-child(1), .soke td:nth-child(2), .soke td:nth-child(3) { white-space: nowrap; }
  .soke .soke-month td { background: #e6f4ea; color: #00702f; font-weight: 700; }
  .soke .soke-payment td { background: #f0fdf4; }
  .soke .soke-opening td { background: #f9fafb; }
  .soke tfoot td { background: #f3f4f6; border-top: 2px solid #00702f; }
  .soke-neg { color: #dc2626; }
  .soke-pos { color: #10b981; }
  .du-line { font-size: 13px; margin: 4px 0 12px; color: #374151; }
  .soke-head { text-align: center; margin: 6px 0 12px; font-size: 13px; line-height: 1.8; }
  .soke-head div:first-child { font-weight: 700; }
  .soke .stt { text-align: center; }
  .soke-sign { margin-top: 30px; font-size: 13px; }
  .soke-sign-date { text-align: right; color: #6b7280; }
  .soke-sign-row { display: flex; justify-content: space-between; margin-top: 16px; font-weight: 700; text-align: center; }
  .soke-sign-row span { font-weight: 400; color: #6b7280; font-size: 11px; }
  @media print { body { margin: 0; } .soke-sign-row { page-break-inside: avoid; } }`;

export async function getStatementData(customerId: number, dateFrom?: string, dateTo?: string): Promise<CustomerStatementData | null> {
  const [customer] = await db.select().from(s.customers).where(eq(s.customers.id, customerId)).limit(1);
  if (!customer) return null;

  const allLedgerRows = withReceivableProjectionBalances(
    (await LedgerService.getEntriesByEntity('CUSTOMER', customerId))
      .filter(row =>
        row.txnType !== TxnType.EXTERNAL_CARRIER_COST
        && row.txnType !== TxnType.VENDOR_PAYMENT
        && !(
          row.txnType === TxnType.UNLOCK_REVERSAL
          && row.note?.startsWith('Cước thuê ngoài')
        )
      ),
  );
  let ledgerRows = allLedgerRows;

  const now = new Date();
  // Debt owed TODAY, independent of the period filter. `totalOutstanding`
  // below is derived from the period-filtered rows, so a scoped request would
  // otherwise report the period's net movement as if it were the live balance.
  const currentTotalOutstanding = computeAgingFor(allLedgerRows, 'CUSTOMER', now).total;
  const agingAsOfPeriodEnd = dateTo
    ? computeAgingFor(
      allLedgerRows.filter((r) => new Date(r.timestamp).getTime() <= new Date(`${dateTo}T23:59:59.999`).getTime()),
      'CUSTOMER',
      new Date(`${dateTo}T23:59:59.999`),
    ).buckets
    : null;

  // Period summary (đầu kỳ / phát sinh / cuối kỳ) is computed BEFORE the
  // date filter so we can read the stored `balance` of the last pre-period row.
  const periodSummary = computePeriodSummary(ledgerRows, dateFrom, dateTo, 'CUSTOMER');

  // Latest activity across the WHOLE ledger (pre-filter) — the detail pages
  // use it to default the period filter to the month that actually has data
  // instead of the current month (which is often empty).
  const latestActivityDate = ledgerRows.length > 0
    ? ledgerRows.reduce((max, r) => r.timestamp > max ? r.timestamp : max, ledgerRows[0].timestamp).toISOString().slice(0, 10)
    : null;

  // Optional date range filter — used by frontend /debt/:id "Bộ lọc khoảng thời gian"
  // (Flow 04 §2.4.1 + PRODUCT-SPECS §4.10: "Bộ lọc khoảng thời gian: 2 ô date picker")
  if (dateFrom || dateTo) {
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const toTs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null;
    ledgerRows = ledgerRows.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      if (fromTs !== null && t < fromTs) return false;
      if (toTs !== null && t > toTs) return false;
      return true;
    });
  }

  // Fetch routes/container numbers for trip-backed ledger rows. SERVICE_FEE
  // rows store trip_expenses.id in txnId, so resolve those fee ids back to
  // their trip and configured billing label first. EXTERNAL_CARRIER_COST
  // (cước thuê ngoài) also stores the trip id in txnId, so it gets the same
  // route/container enrichment as a regular trip revenue row.
  const directlyLinkedTripIds = Array.from(new Set(
    ledgerRows
      .filter((r) => r.txnId && (
        r.txnType === TxnType.TRIP_REVENUE
        || r.txnType === TxnType.UNLOCK_REVERSAL
        || r.txnType === TxnType.PAYMENT_RECEIVED
        || r.txnType === TxnType.EXTERNAL_CARRIER_COST
      ))
      .map((r) => r.txnId as number)
  ));

  const serviceFeeIds = Array.from(new Set(
    ledgerRows
      .filter((r) => r.txnId && r.txnType === TxnType.SERVICE_FEE)
      .map((r) => r.txnId as number)
  ));

  const serviceFeeMap = new Map<number, { tripId: number; label: string; containerNumber: string | null }>();
  if (serviceFeeIds.length > 0) {
    const feeRows = await db.select({
      feeId: s.tripExpenses.id,
      tripId: s.tripExpenses.tripId,
      expenseType: s.tripExpenses.expenseType,
      billingLabel: s.forwarderExpenseTypes.billingLabel,
      typeName: s.forwarderExpenseTypes.name,
      containerNumber: sql<string | null>`COALESCE(${s.tripContainers.containerNumber}, ${s.tripExpenses.containerNumber})`,
    })
      .from(s.tripExpenses)
      .leftJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
      .leftJoin(s.tripContainers, eq(s.tripExpenses.tripContainerId, s.tripContainers.id))
      .where(inArray(s.tripExpenses.id, serviceFeeIds));

    for (const fee of feeRows) {
      serviceFeeMap.set(fee.feeId, {
        tripId: fee.tripId,
        label: serviceFeeLabel(fee.expenseType, fee.billingLabel, fee.typeName),
        containerNumber: fee.containerNumber ?? null,
      });
    }
  }

  const tripIds = Array.from(new Set([
    ...directlyLinkedTripIds,
    ...Array.from(serviceFeeMap.values()).map((fee) => fee.tripId),
  ]));

  const legacyFeeCandidates = new Map<string, Array<{ tripId: number; label: string; containerNumber: string | null }>>();
  if (directlyLinkedTripIds.length > 0) {
    const feeRows = await db.select({
      tripId: s.tripExpenses.tripId,
      sellAmount: s.tripExpenses.sellAmount,
      expenseType: s.tripExpenses.expenseType,
      billingLabel: s.forwarderExpenseTypes.billingLabel,
      typeName: s.forwarderExpenseTypes.name,
      containerNumber: sql<string | null>`COALESCE(${s.tripContainers.containerNumber}, ${s.tripExpenses.containerNumber})`,
    })
      .from(s.tripExpenses)
      .leftJoin(s.forwarderExpenseTypes, eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code))
      .leftJoin(s.tripContainers, eq(s.tripExpenses.tripContainerId, s.tripContainers.id))
      .where(inArray(s.tripExpenses.tripId, directlyLinkedTripIds));

    for (const fee of feeRows) {
      const amount = Number(fee.sellAmount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const key = `${fee.tripId}|${amount}`;
      const existing = legacyFeeCandidates.get(key) ?? [];
      existing.push({
        tripId: fee.tripId,
        label: serviceFeeLabel(fee.expenseType, fee.billingLabel, fee.typeName),
        containerNumber: fee.containerNumber ?? null,
      });
      legacyFeeCandidates.set(key, existing);
    }
  }

  const tripDetailsMap = new Map<number, { tripCode: string | null; routeName: string | null; containerNumbers: string[]; departureDate: string | null }>();
  if (tripIds.length > 0) {
    const tripRows = await db.select({
      tripId: s.trips.id,
      tripCode: s.trips.tripCode,
      routeName: s.routes.name,
      departureDate: s.trips.departureDate,
    }).from(s.trips)
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .where(inArray(s.trips.id, tripIds));

    const containerRows = await db.select({
      tripId: s.tripContainers.tripId,
      containerNumber: s.tripContainers.containerNumber,
    }).from(s.tripContainers)
      .where(inArray(s.tripContainers.tripId, tripIds));

    const containersByTrip = new Map<number, string[]>();
    for (const c of containerRows) {
      if (!c.containerNumber) continue;
      if (!containersByTrip.has(c.tripId)) {
        containersByTrip.set(c.tripId, []);
      }
      containersByTrip.get(c.tripId)!.push(c.containerNumber);
    }

    for (const t of tripRows) {
      tripDetailsMap.set(t.tripId, {
        tripCode: t.tripCode,
        routeName: t.routeName,
        containerNumbers: containersByTrip.get(t.tripId) ?? [],
        departureDate: t.departureDate ?? null,
      });
    }
  }

  const enrichedLedgerRows = ledgerRows.map((r) => {
    const feeDetails = r.txnType === TxnType.SERVICE_FEE && r.txnId
      ? serviceFeeMap.get(r.txnId)
      : undefined;
    const directTripId = r.txnId && (
      r.txnType === TxnType.TRIP_REVENUE
      || r.txnType === TxnType.UNLOCK_REVERSAL
      || r.txnType === TxnType.PAYMENT_RECEIVED
      || r.txnType === TxnType.EXTERNAL_CARRIER_COST
    )
      ? r.txnId
      : null;
    const legacyFeeDetails = directTripId && isLegacyServiceFeeRevenueRow(r)
      ? legacyFeeCandidates.get(`${directTripId}|${Number(r.debit)}`)?.shift()
      : undefined;
    const tripId = feeDetails?.tripId ?? legacyFeeDetails?.tripId ?? directTripId;
    const details = tripId ? tripDetailsMap.get(tripId) : undefined;
    const feeContainerNumber = feeDetails?.containerNumber ?? legacyFeeDetails?.containerNumber ?? null;
    return {
      ...r,
      routeName: details?.routeName ?? null,
      containerNumbers: feeContainerNumber
        ? [feeContainerNumber]
        : details?.containerNumbers ?? [],
      tripId,
      tripCode: details?.tripCode ?? null,
      serviceFeeLabel: feeDetails?.label ?? legacyFeeDetails?.label ?? null,
    };
  });

  const { aging, openInvoices } = computeFifoAging(
    enrichedLedgerRows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      debit: r.debit ?? '0',
      credit: r.credit ?? '0',
    })),
    now,
  );
  const totalOutstanding = aging.current + aging.d30 + aging.d60 + aging.over90;

  const revenueEntries = enrichedLedgerRows.filter((r) => r.txnType === TxnType.TRIP_REVENUE);
  const tripNotes = new Map<number, string>();
  for (const entry of revenueEntries) {
    if (entry.txnId && !tripNotes.has(entry.txnId)) {
      tripNotes.set(entry.txnId, entry.note || '');
    }
  }

  const tsToTripId = new Map<string, number>();
  for (const entry of revenueEntries) {
    if (entry.txnId && entry.timestamp) {
      tsToTripId.set(new Date(entry.timestamp).toISOString(), entry.txnId);
    }
  }

  const tripOutstanding = new Map<number, { tripId: number; date: string; outstanding: number; note: string }>();
  for (const inv of openInvoices) {
    if (inv.open <= 0) continue;
    const tsRaw: unknown = inv.ts;
    if (tsRaw == null) continue;
    const tsKey = tsRaw instanceof Date ? tsRaw.toISOString() : String(tsRaw);
    const tripId = tsToTripId.get(tsKey) ?? 0;
    if (!tripId) continue;
    const existing = tripOutstanding.get(tripId);
    if (existing) {
      existing.outstanding += inv.open;
    } else {
      tripOutstanding.set(tripId, {
        tripId,
        date: tsKey.slice(0, 10),
        outstanding: inv.open,
        note: tripNotes.get(tripId) || '',
      });
    }
  }

  const unpaidTrips = Array.from(tripOutstanding.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  // NEPO-46 sổ chi tiết: build from the same collapsed display rows the
  // response renders, seeded by the period opening balance (0 for the
  // unscoped whole-ledger statement — the book starts at zero).
  const displayRows = collapseEditCyclePairs(enrichedLedgerRows);
  const tripDepartureByTripId = new Map<number, string>();
  for (const [tripId, details] of tripDetailsMap) {
    if (details.departureDate) tripDepartureByTripId.set(tripId, details.departureDate);
  }
  const { lines: statementLines, totals: statementTotals } = buildStatementLines(
    displayRows,
    periodSummary?.openingBalance ?? 0,
    tripDepartureByTripId,
  );

  // NEPO-47 Fast layout — derived presentationally from the same lines/totals.
  const fastStatement = buildFastStatement(statementLines, statementTotals);

  // 'TỪ NGÀY … ĐẾN NGÀY …' header period: the requested filter when scoped,
  // otherwise the ledger's actual activity bounds so the unscoped book still
  // reports a truthful range.
  let periodFrom = dateFrom;
  let periodTo = dateTo;
  if (!periodFrom || !periodTo) {
    let minTs: Date | null = null;
    let maxTs: Date | null = null;
    for (const r of allLedgerRows) {
      if (!minTs || r.timestamp < minTs) minTs = r.timestamp;
      if (!maxTs || r.timestamp > maxTs) maxTs = r.timestamp;
    }
    if (minTs) periodFrom = periodFrom ?? minTs.toISOString().slice(0, 10);
    if (maxTs) periodTo = periodTo ?? maxTs.toISOString().slice(0, 10);
  }

  return {
    customer: { id: customer.id, name: customer.name, contactInfo: customer.contactInfo, taxCode: customer.taxCode, debitNoteMode: customer.debitNoteMode ?? 'MONTHLY', isCarrier: customer.isCarrier },
    ledgerRows: displayRows,
    totalOutstanding,
    currentTotalOutstanding,
    agingAsOfPeriodEnd,
    unpaidTrips,
    latestActivityDate,
    agingBuckets: [
      { range: '0-30 ngày', amount: aging.current },
      { range: '31-60 ngày', amount: aging.d30 },
      { range: '61-90 ngày', amount: aging.d60 },
      { range: 'Trên 90 ngày', amount: aging.over90 },
    ],
    ...(periodSummary ? { periodSummary } : null),
    statementLines,
    statementTotals,
    fastStatement,
    period: { dateFrom: periodFrom ?? '', dateTo: periodTo ?? '' },
  };
}

export async function exportStatementXlsx(data: CustomerStatementData, dateStr: string, writable: Writable): Promise<void> {
  const company = await getCompanyInfo();
  return buildStatementXlsx({
    heading: 'SỔ CHI TIẾT CÔNG NỢ',
    sheetName: 'SỔ CHI TIẾT CÔNG NỢ',
    entityLabel: 'Khách hàng',
    entityName: data.customer.name,
    contactLines: [`Liên hệ: ${data.customer.contactInfo || '—'}`],
    txnLabels: TXN_LABELS,
    ledgerRows: data.ledgerRows,
    totalOutstanding: data.totalOutstanding,
    agingBuckets: data.agingBuckets,
    statementLines: data.statementLines,
    statementTotals: data.statementTotals,
    periodSummary: data.periodSummary ?? null,
    fast: {
      accountLine: 'TÀI KHOẢN: 131111 - PHẢI THU NGẮN HẠN KHÁCH HÀNG: HOẠT ĐỘNG SXKD (VND)',
      customerCode: data.customer.taxCode || null,
      period: data.period,
      companyName: company.name,
      companyAddress: company.address,
    },
  }, dateStr, writable);
}

export async function exportStatementHtml(data: CustomerStatementData, dateStr: string): Promise<string> {
  const company = await getCompanyInfo();
  return buildStatementHtml({
    heading: 'SỔ CHI TIẾT CÔNG NỢ',
    entityLabel: 'Khách hàng',
    entityName: data.customer.name,
    contactLines: [`Liên hệ: ${data.customer.contactInfo || '—'}`],
    txnLabels: TXN_LABELS,
    ledgerRows: data.ledgerRows,
    totalOutstanding: data.totalOutstanding,
    agingBuckets: data.agingBuckets,
    statementLines: data.statementLines,
    statementTotals: data.statementTotals,
    periodSummary: data.periodSummary ?? null,
    fast: {
      accountLine: 'TÀI KHOẢN: 131111 - PHẢI THU NGẮN HẠN KHÁCH HÀNG: HOẠT ĐỘNG SXKD (VND)',
      customerCode: data.customer.taxCode || null,
      period: data.period,
      companyName: company.name,
      companyAddress: company.address,
    },
  }, dateStr);
}

export async function getSupplierStatement(supplierId: number, dateFrom?: string, dateTo?: string): Promise<SupplierStatementData> {
  const [supplier] = await db.select({
    id: s.suppliers.id,
    name: s.suppliers.name,
    phone: s.suppliers.phone,
    contactPerson: s.suppliers.contactPerson,
  }).from(s.suppliers).where(eq(s.suppliers.id, supplierId)).limit(1);

  if (!supplier) throw new ApiError(404, 'Không tìm thấy nhà cung cấp');

  const allLedgerRows: EnrichedLedgerRow[] = await LedgerService.getEntriesByEntity('VENDOR', supplierId);
  let ledgerRows = allLedgerRows;

  // Whole-ledger facts computed before any date filtering: the fuel-supplier
  // marker (drives the "Bảng kê xăng dầu" button) and the latest activity
  // date (drives the period filter default on the detail page).
  const hasFuelExpenses = ledgerRows.some((row) => row.txnType === TxnType.FUEL_EXPENSE);
  const latestActivityDate = ledgerRows.length > 0
    ? ledgerRows.reduce((max, r) => r.timestamp > max ? r.timestamp : max, ledgerRows[0].timestamp).toISOString().slice(0, 10)
    : null;

  const now = new Date();
  // The debt the supplier is owed TODAY, independent of the period filter —
  // `/payables/:id` used to show the period's net movement under a "TỔNG CÔNG NỢ"
  // heading instead, which made September read 265tr against a real 1.04bn.
  const currentTotalOutstanding = computeAgingFor(allLedgerRows, 'VENDOR', now).total;
  const agingAsOfPeriodEnd = dateTo
    ? computeAgingFor(
      allLedgerRows.filter((r) => new Date(r.timestamp).getTime() <= new Date(`${dateTo}T23:59:59.999`).getTime()),
      'VENDOR',
      new Date(`${dateTo}T23:59:59.999`),
    ).buckets
    : null;

  const periodSummary = computePeriodSummary(ledgerRows, dateFrom, dateTo, 'VENDOR');
  if (dateFrom || dateTo) {
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const toTs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null;
    ledgerRows = ledgerRows.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      if (fromTs !== null && t < fromTs) return false;
      if (toTs !== null && t > toTs) return false;
      return true;
    });
  }

  // Fuel expenses point at a trip internally. Resolve the immutable trip fuel
  // snapshot and vehicle context so the statement can be audited operationally
  // without exposing the internal txnId.
  const fuelTripIds = Array.from(new Set(
    ledgerRows
      .filter((row) => row.txnType === TxnType.FUEL_EXPENSE && row.txnId)
      .map((row) => row.txnId as number),
  ));
  if (fuelTripIds.length > 0) {
    const tripRows = await db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      departureDate: s.trips.departureDate,
      truckPlate: s.trucks.licensePlate,
      routeName: s.routes.name,
      // Σ the supplier's allocation rows via scalar subquery — a supplier may
      // now have multiple rows per trip (per-purchase pricing), which a plain
      // join would fan out into duplicate statement rows.
      fuelLiters: sql<string | null>`coalesce((select sum(a.liters) from trip_fuel_allocations a where a.trip_id = ${s.trips.id} and a.supplier_id = ${supplierId}), ${s.trips.fuelLiters})`,
      fuelActualUnitPrice: s.trips.fuelActualUnitPrice,
      fuelPriceApplied: s.trips.fuelPriceApplied,
      totalFuelCost: s.trips.totalFuelCost,
    })
      .from(s.trips)
      .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .where(inArray(s.trips.id, fuelTripIds));
    ledgerRows = attachFuelDetailsToLedgerRows(ledgerRows, tripRows);
  }

  if (ledgerRows.some(row => row.txnType === TxnType.VENDOR_EXPENSE)) {
    const expenseLedgerRows = ledgerRows.filter(row => row.txnType === TxnType.VENDOR_EXPENSE);
    const linkedExpenseIds = Array.from(new Set(
      expenseLedgerRows.flatMap(row => row.txnId ? [row.txnId] : []),
    ));
    const legacyTimestamps = expenseLedgerRows
      .filter(row => !row.txnId)
      .map(row => new Date(row.timestamp).getTime())
      .filter(Number.isFinite);
    const candidateScopes = [];
    if (linkedExpenseIds.length > 0) {
      candidateScopes.push(inArray(s.expenses.id, linkedExpenseIds));
    }
    if (legacyTimestamps.length > 0) {
      const minTimestamp = new Date(Math.min(...legacyTimestamps) - 999);
      const maxTimestamp = new Date(Math.max(...legacyTimestamps) + 999);
      candidateScopes.push(and(
        gte(s.expenses.createdAt, minTimestamp),
        lte(s.expenses.createdAt, maxTimestamp),
      ));
    }
    const expenseRows = await db.select({
      id: s.expenses.id,
      supplierId: s.expenses.supplierId,
      expenseDate: s.expenses.expenseDate,
      vehiclePlate: sql<string | null>`coalesce(${s.trucks.licensePlate}, ${s.trailers.licensePlate})`,
      vehicleComponent: s.expenses.vehicleComponent,
      categoryName: s.expenseCategories.name,
      amount: s.expenses.amount,
      createdAt: s.expenses.createdAt,
    })
      .from(s.expenses)
      .innerJoin(s.expenseCategories, eq(s.expenses.categoryId, s.expenseCategories.id))
      .leftJoin(
        s.trucks,
        and(eq(s.expenses.truckId, s.trucks.id), eq(s.expenses.vehicleComponent, 'TRUCK')),
      )
      .leftJoin(
        s.trailers,
        and(eq(s.expenses.truckId, s.trailers.id), eq(s.expenses.vehicleComponent, 'TRAILER')),
      )
      .where(and(
        eq(s.expenses.supplierId, supplierId),
        or(...candidateScopes),
      ));
    ledgerRows = attachSupplierExpenseDetailsToLedgerRows(ledgerRows, expenseRows);
  }

  const { aging } = computeFifoAging(
    ledgerRows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      debit: r.credit ?? '0',
      credit: r.debit ?? '0',
    })),
    now,
  );

  const totalOutstanding = aging.current + aging.d30 + aging.d60 + aging.over90;

  return {
    supplier,
    // Display rows only — totalOutstanding/currentTotalOutstanding/aging and
    // periodSummary above are computed from the uncollapsed rows (r1 rule).
    ledgerRows: collapseEditCyclePairs(ledgerRows),
    totalOutstanding,
    currentTotalOutstanding,
    agingAsOfPeriodEnd,
    hasFuelExpenses,
    latestActivityDate,
    agingBuckets: [
      { range: '0-30 ngày', amount: aging.current },
      { range: '31-60 ngày', amount: aging.d30 },
      { range: '61-90 ngày', amount: aging.d60 },
      { range: 'Trên 90 ngày', amount: aging.over90 },
    ],
    ...(periodSummary ? { periodSummary } : null),
  };
}

/**
 * Bảng kê xăng dầu — per-trip fuel statement for a fuel supplier.
 *
 * Reconciliation surface for fuel vendors (e.g. Petrolimex): the ledger books
 * fuel at trip-lock time while the accountant reconciles per delivery month,
 * so a posting-date-only view never matches her book. This view keeps the
 * ledger's posting-date filter (balances stay untouched) but groups rows per
 * trip (net of unlock reversals), shows BOTH the trip date and the posting
 * date, and reports the two totals side by side: Σ by posting date and Σ by
 * trip-departure month.
 */
export async function getSupplierFuelStatement(
  supplierId: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<SupplierFuelStatement> {
  const [supplier] = await db.select({
    id: s.suppliers.id,
    name: s.suppliers.name,
    phone: s.suppliers.phone,
    contactPerson: s.suppliers.contactPerson,
  }).from(s.suppliers).where(eq(s.suppliers.id, supplierId)).limit(1);
  if (!supplier) throw new ApiError(404, 'Không tìm thấy nhà cung cấp');

  const allRows = await LedgerService.getEntriesByEntity('VENDOR', supplierId);
  const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
  const toTs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null;
  const isFuelRow = (r: LedgerRow) =>
    r.txnType === TxnType.FUEL_EXPENSE || r.txnType === TxnType.UNLOCK_REVERSAL;
  const inRange = (r: LedgerRow) => {
    const t = new Date(r.timestamp).getTime();
    return (fromTs === null || t >= fromTs) && (toTs === null || t <= toTs);
  };

  // Balances follow computePeriodSummary's convention (AP grows with credit,
  // shrinks with debit; opening derived from rows strictly before dateFrom —
  // never from the stored running balance, which follows insertion order).
  let openingBalance = 0;
  let fuelNet = 0;
  let otherDebits = 0;
  let otherCredits = 0;
  for (const r of allRows) {
    const debit = Number(r.debit ?? 0) || 0;
    const credit = Number(r.credit ?? 0) || 0;
    const t = new Date(r.timestamp).getTime();
    if (fromTs !== null && t < fromTs) {
      openingBalance += credit - debit;
      continue;
    }
    if (!inRange(r)) continue;
    if (isFuelRow(r)) {
      fuelNet += credit - debit;
    } else {
      otherDebits += debit;
      otherCredits += credit;
    }
  }
  const closingBalance = openingBalance + fuelNet + otherCredits - otherDebits;

  // Net fuel per trip across the WHOLE ledger, net of unlock reversals. Keyed
  // by trip so each one can be placed on either basis — the ledger posts when a
  // trip is locked, which is often a different month from its departure.
  interface TripGroup {
    amount: number;
    hadReversal: boolean;
    firstPostedAt: Date | null;
    lastPostedAt: Date | null;
  }
  const netByTripAllTime = new Map<number, TripGroup>();
  const postingInRange = new Set<number>();
  for (const r of allRows) {
    if (!isFuelRow(r)) continue;
    const tripId = r.txnId ?? 0;
    const g = netByTripAllTime.get(tripId) ?? {
      amount: 0, hadReversal: false, firstPostedAt: null, lastPostedAt: null,
    };
    g.amount += Number(r.credit ?? 0) - Number(r.debit ?? 0);
    if (r.txnType === TxnType.UNLOCK_REVERSAL) g.hadReversal = true;
    if (g.firstPostedAt === null || r.timestamp < g.firstPostedAt) g.firstPostedAt = r.timestamp;
    if (g.lastPostedAt === null || r.timestamp > g.lastPostedAt) g.lastPostedAt = r.timestamp;
    netByTripAllTime.set(tripId, g);
    if (inRange(r)) postingInRange.add(tripId);
  }

  // Trip context for every trip this supplier is attached to PLUS every trip the
  // ledger references. Covering `fuel_supplier_id = supplierId` (rather than
  // only ledger-linked trips) is what makes unposted trips detectable at all.
  const ledgerTripIds = Array.from(netByTripAllTime.keys()).filter((id) => id !== 0);
  const supplierTripIds = (await db.select({ id: s.trips.id })
    .from(s.trips)
    .where(eq(s.trips.fuelSupplierId, supplierId))).map((r) => r.id);
  const tripContextById = new Map<number, {
    tripCode: string | null; departureDate: string;
    licensePlate: string | null; routeName: string | null; liters: number | null;
    fuelSupplierId: number | null; totalFuelCost: number | null;
  }>();
  const candidateTripIds = Array.from(new Set([...ledgerTripIds, ...supplierTripIds]));
  if (candidateTripIds.length > 0) {
    // Same liters subquery as getSupplierStatement: sum the supplier's
    // allocation rows, falling back to the trip's total when unallocated.
    const tripRows = await db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      departureDate: s.trips.departureDate,
      licensePlate: s.trucks.licensePlate,
      routeName: s.routes.name,
      fuelSupplierId: s.trips.fuelSupplierId,
      totalFuelCost: s.trips.totalFuelCost,
      liters: sql<string | null>`coalesce((select sum(a.liters) from trip_fuel_allocations a where a.trip_id = ${s.trips.id} and a.supplier_id = ${supplierId}), ${s.trips.fuelLiters})`,
    }).from(s.trips)
      .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .where(inArray(s.trips.id, candidateTripIds));
    for (const t of tripRows) {
      const liters = t.liters != null && t.liters !== '' ? Number(t.liters) : null;
      tripContextById.set(t.id, {
        tripCode: t.tripCode,
        departureDate: t.departureDate,
        licensePlate: t.licensePlate,
        routeName: t.routeName,
        liters: liters != null && Number.isFinite(liters) && liters > 0 ? liters : null,
        fuelSupplierId: t.fuelSupplierId,
        totalFuelCost: t.totalFuelCost != null && t.totalFuelCost !== '' ? Number(t.totalFuelCost) : null,
      });
    }
  }

  const buildRow = (tripId: number, g: TripGroup): SupplierFuelStatementRow => {
    const trip = tripContextById.get(tripId) ?? null;
    const liters = trip?.liters ?? null;
    const unitPrice = liters != null && liters > 0
      ? Math.round((g.amount / liters) * 100) / 100
      : null;
    return {
      tripId,
      tripCode: trip?.tripCode ?? null,
      departureDate: trip?.departureDate ?? null,
      firstPostedAt: g.firstPostedAt ? g.firstPostedAt.toISOString().slice(0, 10) : '',
      lastPostedAt: g.lastPostedAt ? g.lastPostedAt.toISOString().slice(0, 10) : '',
      licensePlate: trip?.licensePlate ?? null,
      routeName: trip?.routeName ?? null,
      liters,
      unitPrice,
      amount: Math.round(g.amount),
      hadReversal: g.hadReversal,
    };
  };

  // Pure churn (reversed then re-posted to the same amount) nets to zero and
  // carries no liability — dropping those lines keeps the sheet tickable
  // against the accountant's book without touching the totals.
  const isMeaningful = (row: SupplierFuelStatementRow) => row.amount !== 0;
  const sortRows = (a: SupplierFuelStatementRow, b: SupplierFuelStatementRow) =>
    (a.departureDate ?? '9999').localeCompare(b.departureDate ?? '9999')
    || (a.tripCode ?? '').localeCompare(b.tripCode ?? '');

  /** True when the trip's departure date falls inside the requested period. */
  const departureInRange = (tripId: number) => {
    const trip = tripContextById.get(tripId);
    if (!trip) return false;
    if (dateFrom && trip.departureDate < dateFrom) return false;
    if (dateTo && trip.departureDate > dateTo) return false;
    return true;
  };

  // Detail table = DEPARTURE basis: the supplier bills on the day the fuel was
  // drawn, so this is the only cut that reconciles with their statement.
  const rows: SupplierFuelStatementRow[] = Array.from(netByTripAllTime.entries())
    .filter(([tripId]) => departureInRange(tripId))
    .map(([tripId, g]) => buildRow(tripId, g))
    .filter(isMeaningful)
    .sort(sortRows);

  // Posting basis kept for the variance block at the top of the sheet.
  const postingRows: SupplierFuelStatementRow[] = Array.from(postingInRange)
    .map((tripId) => buildRow(tripId, netByTripAllTime.get(tripId)!))
    .filter(isMeaningful)
    .sort(sortRows);

  const departureTotalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const crossingMonthAmount = fuelNet - departureTotalAmount;

  // Trips that drew fuel inside the period but posted nothing for this supplier.
  // With no supplier id, trip-lock writes no FUEL_EXPENSE row, so the cost is
  // absent from every payable ledger — and from this statement.
  //
  // Queried separately rather than via tripContextById: those trips have
  // fuel_supplier_id = NULL, so they are by definition not in this supplier's
  // trip list and would never be loaded above. TRP-202609-0048 is the real
  // case — 152 lít, never posted anywhere.
  const unassignedTrips: SupplierFuelStatementUnassignedTrip[] = [];
  if (dateFrom && dateTo) {
    const unassigned = await db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      departureDate: s.trips.departureDate,
      licensePlate: s.trucks.licensePlate,
      routeName: s.routes.name,
      liters: s.trips.fuelLiters,
      totalFuelCost: s.trips.totalFuelCost,
    }).from(s.trips)
      // INNER join on trucks: a trip whose truck row is gone is orphaned data,
      // not an un-invoiced delivery. Listing those would bury the real case —
      // September had ~21 such rows against one genuine miss.
      .innerJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .where(and(
        isNull(s.trips.fuelSupplierId),
        isNull(s.trucks.deletedAt),
        // Xe ngoài can never hold a fuel supplier (the figures schema rejects
        // one), so it must never surface in the "gán NCC" follow-up —
        // explicitly, not via the trucks join side effect (a reassigned trip
        // may keep a truckId while being EXTERNAL).
        sql`coalesce(${s.trips.carrierType}, 'OWN') = 'OWN'`,
        sql`${s.trips.fuelLiters} > 0`,
        gte(s.trips.departureDate, dateFrom),
        lte(s.trips.departureDate, dateTo),
      ))
      .orderBy(s.trips.departureDate, s.trips.id);
    for (const t of unassigned) {
      const liters = t.liters != null && t.liters !== '' ? Number(t.liters) : null;
      unassignedTrips.push({
        tripId: t.id,
        tripCode: t.tripCode,
        departureDate: t.departureDate,
        licensePlate: t.licensePlate,
        routeName: t.routeName,
        liters: liters != null && Number.isFinite(liters) && liters > 0 ? liters : null,
        totalFuelCost: t.totalFuelCost != null && t.totalFuelCost !== '' ? Number(t.totalFuelCost) : null,
      });
    }
  }

  const totalLiters = rows.some((row) => row.liters != null)
    ? Math.round(rows.reduce((sum, row) => sum + (row.liters ?? 0), 0))
    : null;

  // Σ per trip-departure month across ALL postings (any date) for trips whose
  // departure falls inside the period — the supplier-invoice view of the same
  // period, which is what the accountant's book tracks.
  const tripMonthTotals: Array<{ tripMonth: string; amount: number }> = [];
  if (dateFrom && dateTo) {
    const byMonth = new Map<string, number>();
    for (const [tripId, group] of netByTripAllTime) {
      const trip = tripContextById.get(tripId);
      if (!trip?.departureDate) continue;
      if (trip.departureDate < dateFrom || trip.departureDate > dateTo) continue;
      const net = group.amount;
      const month = trip.departureDate.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + net);
    }
    for (const [tripMonth, amount] of Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      tripMonthTotals.push({ tripMonth, amount: Math.round(amount) });
    }
  }

  return {
    supplier,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    openingBalance: Math.round(openingBalance),
    closingBalance: Math.round(closingBalance),
    fuelNet: Math.round(fuelNet),
    otherDebits: Math.round(otherDebits),
    otherCredits: Math.round(otherCredits),
    rows,
    postingRows,
    totalAmount: Math.round(fuelNet),
    departureTotalAmount,
    crossingMonthAmount,
    totalLiters,
    unassignedTrips,
    tripMonthTotals,
  };
}

/**
 * XLSX builder for the fuel statement. Layout mirrors the supplier's own book
 * (BẢNG KÊ XĂNG DẦU), and is ordered for reconciliation:
 *
 *   opening balance → the two bases side by side (departure vs posting) and the
 *   gap between them → per-trip lines on the DEPARTURE basis (the supplier's
 *   own basis) with a THÀNH TIỀN column → trips that never reached this ledger
 *   → closing balance.
 *
 * The departure basis leads because that is what the supplier invoices on;
 * September 2026 showed 251.9tr on it against a posted 265.6tr, the difference
 * being fuel drawn one month and locked the next.
 */
export async function exportSupplierFuelStatementXlsx(
  data: SupplierFuelStatement,
  dateStr: string,
  writable: Writable,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bảng kê xăng dầu');
  sheet.views = [{ showGridLines: true }];

  const borderStyle = {
    top: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
  };
  const green = 'FF00702F';
  const fmtInt = '#,##0';
  const fmtPrice = '#,##0.##';

  sheet.columns = [
    { width: 12 }, { width: 13 }, { width: 15 }, { width: 18 }, { width: 14 },
    { width: 34 }, { width: 10 }, { width: 13 }, { width: 16 }, { width: 26 },
  ];

  const LAST_COL = 10; // A..J

  // Title (row 1)
  sheet.mergeCells(`A1:${String.fromCharCode(64 + LAST_COL)}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = `BẢNG KÊ XĂNG DẦU — ${data.supplier.name}`.toUpperCase();
  titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 34;

  // Meta rows
  sheet.mergeCells(`A2:${String.fromCharCode(64 + LAST_COL)}2`);
  sheet.getCell('A2').value =
    `Kỳ đối chiếu: ${data.dateFrom ?? 'đầu'} → ${data.dateTo ?? 'nay'}   ·   Ngày xuất: ${dateStr}`;
  sheet.getCell('A2').font = { name: 'Segoe UI', size: 10, color: { argb: 'FF4B5563' } };

  // Opening balance
  sheet.getCell('A3').value = 'NỢ ĐẦU KỲ:';
  sheet.getCell('A3').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF374151' } };
  sheet.mergeCells('A3:D3');
  sheet.getCell('E3').value = data.openingBalance;
  sheet.getCell('E3').numFmt = fmtInt;
  sheet.getCell('E3').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF374151' } };
  sheet.getRow(3).height = 20;

  // ── Reconciliation block ────────────────────────────────────────────────
  // Placed ABOVE the trip table on purpose. The whole question when comparing
  // against the supplier's book is "which of these two numbers do I match?",
  // and the answer is the departure one. Previously this only appeared at the
  // bottom, under a heading about the posting basis, so it was never found.
  const basisRow = (row: number, label: string, value: number, bold: boolean, argb: string) => {
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`A${row}`).font = { name: 'Segoe UI', size: 10, bold, color: { argb } };
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.mergeCells(`A${row}:D${row}`);
    sheet.getCell(`E${row}`).value = value;
    sheet.getCell(`E${row}`).numFmt = fmtInt;
    sheet.getCell(`E${row}`).font = { name: 'Segoe UI', size: 10, bold, color: { argb } };
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(row).height = 18;
  };
  basisRow(5, 'Tổng theo NGÀY CHUYẾN (khớp sổ hãng dầu):', data.departureTotalAmount, true, 'FF166534');
  basisRow(6, 'Tổng theo NGÀY GHI SỔ (khớp sổ kế toán):', data.fuelNet, false, 'FF374151');
  basisRow(
    7,
    'Chênh lệch do chuyến lấy nhiên liệu tháng này, ghi sổ tháng sau:',
    data.crossingMonthAmount,
    false,
    'FFB45309',
  );
  sheet.getCell('A8').value =
    'Bảng chi tiết bên dưới gom theo NGÀY CHUYẾN — cùng cách hãng dầu tính. Cột NGÀY GHI SỔ cho biết chuyến nào đã ghi sổ sang tháng khác.';
  sheet.getCell('A8').font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF6B7280' } };
  sheet.mergeCells('A8:H8');

  const SECTION_ROW = 10;
  const HEADER_ROW = 11;

  // Section header
  sheet.mergeCells(`A${SECTION_ROW}:${String.fromCharCode(64 + LAST_COL)}${SECTION_ROW}`);
  const sectionCell = sheet.getCell(`A${SECTION_ROW}`);
  sectionCell.value = 'CHI TIẾT THEO CHUYẾN — ròng sau hoàn tác';
  sectionCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  sectionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } };
  sectionCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(SECTION_ROW).height = 24;

  // Table header
  const headers = [
    'NGÀY CHUYẾN', 'NGÀY GHI SỔ', 'MÃ CHUYẾN', 'ĐẦU KÉO', 'TUYẾN',
    'SỐ LÍT', 'ĐƠN GIÁ (Đ/LÍT)', 'THÀNH TIỀN (Đ)', 'GHI CHÚ',
  ];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(HEADER_ROW, i + 1);
    cell.value = h;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF374151' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.alignment = { vertical: 'middle', horizontal: i >= 5 && i <= 7 ? 'right' : 'left', wrapText: true };
    cell.border = borderStyle;
  });
  sheet.getRow(HEADER_ROW).height = 26;

  // Data rows — `rows` is the DEPARTURE basis (see getSupplierFuelStatement).
  const FIRST_DATA_ROW = HEADER_ROW + 1;
  let lastRow = HEADER_ROW;
  if (data.rows.length === 0) {
    sheet.mergeCells(`A${FIRST_DATA_ROW}:${String.fromCharCode(64 + LAST_COL)}${FIRST_DATA_ROW}`);
    sheet.getCell(`A${FIRST_DATA_ROW}`).value = 'Không có phát sinh xăng dầu trong kỳ.';
    sheet.getCell(`A${FIRST_DATA_ROW}`).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF6B7280' } };
    sheet.getCell(`A${FIRST_DATA_ROW}`).border = borderStyle;
    lastRow = FIRST_DATA_ROW;
  } else {
    data.rows.forEach((row, i) => {
      const rowIdx = FIRST_DATA_ROW + i;
      const crossesMonth = !!row.departureDate && !!row.firstPostedAt
        && row.departureDate.slice(0, 7) !== row.firstPostedAt.slice(0, 7);
      const note = [
        crossesMonth ? 'lệch tháng so với ngày ghi sổ' : null,
        row.hadReversal ? 'có hoàn tác, đã ròng' : null,
      ].filter(Boolean).join(' · ');
      const values: Array<string | number | null> = [
        row.departureDate ?? '—', row.firstPostedAt, row.tripCode ?? '—',
        row.licensePlate ?? '—', row.routeName ?? '—',
        row.liters, row.unitPrice, row.amount, note || null,
      ];
      values.forEach((v, c) => {
        const cell = sheet.getCell(rowIdx, c + 1);
        cell.value = v ?? null;
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF111827' } };
        cell.border = borderStyle;
        if (c === 5) cell.numFmt = fmtInt;
        if (c === 6) cell.numFmt = fmtPrice;
        if (c === 7) {
          cell.numFmt = fmtInt;
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: row.amount < 0 ? 'FF16A34A' : 'FF111827' } };
        }
        if (c >= 5 && c <= 7) cell.alignment = { vertical: 'middle', horizontal: 'right' };
      });
    });
    lastRow = HEADER_ROW + data.rows.length;
  }

  // Totals row — the table above is departure-basis, so this total must be too.
  const totalRow = lastRow + 1;
  sheet.mergeCells(`A${totalRow}:E${totalRow}`);
  const totalLabel = sheet.getCell(`A${totalRow}`);
  totalLabel.value = 'TỔNG THEO NGÀY CHUYẾN';
  totalLabel.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: green } };
  totalLabel.alignment = { vertical: 'middle', horizontal: 'right' };
  const litersCell = sheet.getCell(`F${totalRow}`);
  litersCell.value = data.totalLiters;
  litersCell.numFmt = fmtInt;
  litersCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: green } };
  litersCell.alignment = { horizontal: 'right' };
  const amountCell = sheet.getCell(`H${totalRow}`);
  amountCell.value = data.departureTotalAmount;
  amountCell.numFmt = fmtInt;
  amountCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: green } };
  amountCell.alignment = { horizontal: 'right' };
  for (let c = 1; c <= LAST_COL; c++) sheet.getCell(totalRow, c).border = borderStyle;
  sheet.getRow(totalRow).height = 22;

  let current = totalRow + 2;

  // ── Trips that never reached this ledger ────────────────────────────────
  // A trip with fuel but no supplier posts no FUEL_EXPENSE row, so it is
  // missing from the statement AND from the payable total. Listing it here is
  // the only way the accountant learns the delivery is unaccounted for.
  if (data.unassignedTrips.length > 0) {
    sheet.mergeCells(`A${current}:${String.fromCharCode(64 + LAST_COL)}${current}`);
    const warnHeader = sheet.getCell(`A${current}`);
    warnHeader.value = 'CÁC CHUYẾN CHƯA GÁN NHÀ CUNG CẤP — không có trong bảng kê này';
    warnHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF991B1B' } };
    warnHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    sheet.getRow(current).height = 22;
    current++;
    for (const t of data.unassignedTrips) {
      sheet.mergeCells(`A${current}:D${current}`);
      sheet.getCell(`A${current}`).value = `${t.tripCode ?? '—'} · ${t.departureDate ?? '—'}`;
      sheet.getCell(`A${current}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF374151' } };
      sheet.mergeCells(`E${current}:F${current}`);
      sheet.getCell(`E${current}`).value = t.licensePlate ?? '—';
      sheet.getCell(`E${current}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF374151' } };
      const litCell = sheet.getCell(`G${current}`);
      litCell.value = t.liters;
      litCell.numFmt = fmtInt;
      litCell.alignment = { horizontal: 'right' };
      const costCell = sheet.getCell(`H${current}`);
      costCell.value = t.totalFuelCost;
      costCell.numFmt = fmtInt;
      costCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF991B1B' } };
      costCell.alignment = { horizontal: 'right' };
      current++;
    }
    sheet.getCell(`A${current}`).value =
      'Các chuyến trên đã lấy nhiên liệu nhưng chưa gán nhà cung cấp nên chưa được ghi vào công nợ. Vui lòng gán NCC và khoá lại chuyến.';
    sheet.getCell(`A${current}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF991B1B' } };
    sheet.mergeCells(`A${current}:${String.fromCharCode(64 + LAST_COL)}${current}`);
    current += 2;
  }

  // Trip-month reconciliation block
  if (data.tripMonthTotals.length > 0) {
    sheet.mergeCells(`A${current}:I${current}`);
    const monthHeader = sheet.getCell(`A${current}`);
    monthHeader.value = 'ĐỐI CHIẾU THEO THÁNG CHUYẾN (mọi ngày đăng — đối chiếu hoá đơn hãng dầu)';
    monthHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: green } };
    monthHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
    sheet.getRow(current).height = 22;
    current++;
    for (const m of data.tripMonthTotals) {
      sheet.mergeCells(`A${current}:G${current}`);
      sheet.getCell(`A${current}`).value = `Chuyến tháng ${m.tripMonth}`;
      sheet.getCell(`A${current}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF374151' } };
      const monthCell = sheet.getCell(`H${current}`);
      monthCell.value = m.amount;
      monthCell.numFmt = fmtInt;
      monthCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF111827' } };
      monthCell.alignment = { horizontal: 'right' };
      current++;
    }
    current++;
  }

  // Payments / other entries
  const otherNet = data.otherDebits - data.otherCredits;
  if (otherNet !== 0) {
    sheet.mergeCells(`A${current}:G${current}`);
    sheet.getCell(`A${current}`).value = 'Đã thanh toán & khoản khác trong kỳ (−):';
    sheet.getCell(`A${current}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF374151' } };
    const otherCell = sheet.getCell(`H${current}`);
    otherCell.value = otherNet;
    otherCell.numFmt = fmtInt;
    otherCell.alignment = { horizontal: 'right' };
    current++;
  }

  // Closing balance
  current++;
  sheet.mergeCells(`A${current}:G${current}`);
  const closingLabel = sheet.getCell(`A${current}`);
  closingLabel.value = 'CÒN NỢ CUỐI KỲ (= Nợ đầu kỳ + phát sinh − thanh toán):';
  closingLabel.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFDC2626' } };
  closingLabel.alignment = { vertical: 'middle', horizontal: 'right' };
  const closingCell = sheet.getCell(`H${current}`);
  closingCell.value = data.closingBalance;
  closingCell.numFmt = fmtInt;
  closingCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFDC2626' } };
  closingCell.alignment = { horizontal: 'right' };
  sheet.getRow(current).height = 24;

  await workbook.xlsx.write(writable);
}

export async function getCarrierPayableStatement(
  carrierId: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<SupplierStatementData> {
  const [carrier] = await db.select({
    id: s.customers.id,
    name: s.customers.name,
    phone: s.customers.phone,
    contactPerson: s.customers.contactInfo,
  }).from(s.customers).where(eq(s.customers.id, carrierId)).limit(1);

  if (!carrier) throw new ApiError(404, 'Không tìm thấy nhà vận chuyển');

  const historicalRows = await LedgerService.getEntriesByEntity('CUSTOMER', carrierId);
  const currentRows = await LedgerService.getEntriesByEntity('CARRIER', carrierId);

  // Carrier costs used to post to the CUSTOMER ledger; they now live on an
  // isolated CARRIER projection. A trip carrying a cost on BOTH ledgers (posted
  // before the split, then re-posted after) would otherwise render twice here —
  // one trip showing as two identical "Cước thuê ngoài" lines with the same
  // amount. The CARRIER row is the authoritative one, so drop the CUSTOMER copy
  // for every trip the CARRIER ledger already knows about. CUSTOMER rows for
  // trips with no CARRIER counterpart are genuinely historical and stay.
  const isCarrierRow = (row: LedgerRow) =>
    row.txnType === TxnType.EXTERNAL_CARRIER_COST
    || (
      row.txnType === TxnType.UNLOCK_REVERSAL
      && row.note?.startsWith('Cước thuê ngoài')
    );
  const tripsOnCarrierLedger = new Set(
    currentRows
      .filter(isCarrierRow)
      .map(row => row.txnId)
      .filter((id): id is number => id != null),
  );
  const historicalRowsDeduped = historicalRows.filter(
    row => !(isCarrierRow(row) && row.txnId != null && tripsOnCarrierLedger.has(row.txnId)),
  );

  let ledgerRows: EnrichedLedgerRow[] = [...historicalRowsDeduped, ...currentRows]
    .filter(row =>
      isCarrierRow(row)
      || row.txnType === TxnType.VENDOR_PAYMENT
    );

  const tripIds = Array.from(new Set(
    ledgerRows
      .filter(row => row.txnType === TxnType.EXTERNAL_CARRIER_COST && row.txnId)
      .map(row => row.txnId as number),
  ));
  const tripById = new Map<number, { tripCode: string | null; routeName: string | null }>();
  if (tripIds.length > 0) {
    const tripRows = await db.select({
      id: s.trips.id,
      tripCode: s.trips.tripCode,
      routeName: s.routes.name,
    }).from(s.trips)
      .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
      .where(inArray(s.trips.id, tripIds));
    for (const trip of tripRows) tripById.set(trip.id, trip);
  }

  ledgerRows = withPayableProjectionBalances(ledgerRows).map(row => {
    const trip = row.txnId ? tripById.get(row.txnId) : undefined;
    return {
      ...row,
      tripId: trip ? row.txnId : null,
      tripCode: trip?.tripCode ?? null,
      routeName: trip?.routeName ?? null,
    };
  });

  const periodSummary = computePeriodSummary(ledgerRows, dateFrom, dateTo, 'VENDOR');
  const allRows = ledgerRows;
  if (dateFrom || dateTo) {
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const toTs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null;
    ledgerRows = ledgerRows.filter(row => {
      const timestamp = new Date(row.timestamp).getTime();
      return (fromTs === null || timestamp >= fromTs) && (toTs === null || timestamp <= toTs);
    });
  }

  const { aging } = computeFifoAging(
    allRows.map(row => ({
      timestamp: row.timestamp.toISOString(),
      debit: row.credit ?? '0',
      credit: row.debit ?? '0',
    })),
    new Date(),
  );
  const totalOutstanding = aging.current + aging.d30 + aging.d60 + aging.over90;

  return {
    supplier: carrier,
    // Display rows only — totalOutstanding/agingBuckets/periodSummary are
    // computed from the uncollapsed rows (r1 rule).
    ledgerRows: collapseEditCyclePairs(ledgerRows),
    totalOutstanding,
    agingBuckets: [
      { range: '0-30 ngày', amount: aging.current },
      { range: '31-60 ngày', amount: aging.d30 },
      { range: '61-90 ngày', amount: aging.d60 },
      { range: 'Trên 90 ngày', amount: aging.over90 },
    ],
    ...(periodSummary ? { periodSummary } : null),
  };
}

export async function exportSupplierStatementXlsx(
  data: SupplierStatementData,
  dateStr: string,
  writable: Writable,
): Promise<void> {
  return buildStatementXlsx({
    heading: 'Sao kê công nợ nhà cung cấp',
    sheetName: 'Sao kê công nợ NCC',
    entityLabel: 'Nhà cung cấp',
    entityName: data.supplier.name,
    contactLines: [
      `Liên hệ: ${data.supplier.phone || '—'}`,
      `Người liên hệ: ${data.supplier.contactPerson || '—'}`,
    ],
    txnLabels: VENDOR_TXN_LABELS,
    ledgerRows: data.ledgerRows,
    totalOutstanding: data.totalOutstanding,
    agingBuckets: data.agingBuckets,
  }, dateStr, writable);
}

export function exportSupplierStatementHtml(
  data: SupplierStatementData,
  dateStr: string,
): string {
  return buildStatementHtml({
    heading: 'Sao kê công nợ nhà cung cấp',
    entityLabel: 'Nhà cung cấp',
    entityName: data.supplier.name,
    contactLines: [
      `Liên hệ: ${data.supplier.phone || '—'}`,
      `Người liên hệ: ${data.supplier.contactPerson || '—'}`,
    ],
    txnLabels: VENDOR_TXN_LABELS,
    ledgerRows: data.ledgerRows,
    totalOutstanding: data.totalOutstanding,
    agingBuckets: data.agingBuckets,
  }, dateStr);
}

/**
 * NEPO-47 — Fast 'SỔ CHI TIẾT CÔNG NỢ' workbook (customer statement export):
 * đúng mẫu Fast — letterhead công ty (tên + địa chỉ từ company info, ẩn khi
 * chưa cấu hình), khối giữa căn giữa: tiêu đề + dòng tài khoản 131111 +
 * KHÁCH HÀNG (MST) + TỪ/ĐẾN NGÀY, SỐ DƯ ĐẦU KỲ 2 ô Nợ|Có (fill EAEFF8,
 * viền chỉ trên E:G), header 2 tầng nền 244677 chữ trắng: STT | CHỨNG TỪ
 * (NGÀY | SỐ) | DIỄN GIẢI | TK Đ.ỨNG | SỐ PHÁT SINH (NỢ | CÓ) — mỗi chứng từ
 * một STT, nhiều dòng nghiệp vụ dưới một STT, NGÀY là date thật định dạng
 * 'dd-mm' — rồi TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ (công thức =SUM/=MAX, fill +
 * viền đủ 7 cột) và khối ký tên NGƯỜI LẬP BIỂU / KẾ TOÁN TRƯỞNG. Vouchers
 * derive từ chính statementLines/totals của response (buildFastStatement) —
 * file luôn khớp màn hình.
 */
export async function buildFastStatementXlsx(config: StatementExportConfig, writable: Writable): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(config.sheetName || config.heading);
  sheet.views = [{ showGridLines: true }];
  workbook.calcProperties.fullCalcOnLoad = true;

  const borderStyle = {
    top: { style: 'thin' as const, color: { argb: 'FFAFBDC5' } },
    left: { style: 'thin' as const, color: { argb: 'FFAFBDC5' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFAFBDC5' } },
    right: { style: 'thin' as const, color: { argb: 'FFAFBDC5' } },
  };
  const bandFill = 'FFEAEFF8';
  const zebraFill = 'FFF8F9FB';

  // Style one row at an explicit index; borders default on (data/grid rows),
  // letterhead/centered block lines use mergedLine (no borders) instead.
  const setCells = (
    r: number,
    cells: Array<{ col: number; value: string | number | Date | null | { formula: string; result: number }; numFmt?: boolean; fmt?: string; align?: 'left' | 'right' | 'center'; bold?: boolean; size?: number; fill?: string }>,
    height?: number,
  ) => {
    for (const { col, value, numFmt, fmt, align, bold, size, fill } of cells) {
      const cell = sheet.getCell(r, col);
      if (value !== null) cell.value = value;
      if (numFmt) cell.numFmt = '#,##0';
      if (fmt) cell.numFmt = fmt;
      cell.alignment = { vertical: 'middle', horizontal: align ?? 'left' };
      cell.font = { name: 'Arial', size: size ?? 10, bold: bold ?? false, color: { argb: 'FF1F2937' } };
      if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      cell.border = borderStyle;
    }
    if (height !== undefined) sheet.getRow(r).height = height;
  };

  let currentOffset = 1;
  // Full-width merged line (cols 1–7) — letterhead + centered block, borderless.
  const mergedLine = (value: string, opts: { bold?: boolean; size?: number; height?: number; align?: 'left' | 'right' | 'center' } = {}) => {
    const r = currentOffset++;
    sheet.mergeCells(r, 1, r, 7);
    const cell = sheet.getCell(r, 1);
    cell.value = value;
    cell.alignment = { vertical: 'middle', horizontal: opts.align ?? 'center' };
    cell.font = { name: 'Arial', size: opts.size ?? 10, bold: opts.bold ?? false, color: { argb: 'FF1F2937' } };
    sheet.getRow(r).height = opts.height ?? 16;
  };

  const dash = (iso: string | undefined | null) => {
    const s = iso ?? '';
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : (s || '……');
  };

  // ── Letterhead công ty (mẫu Fast) — chỉ khi company info có dữ liệu ──────
  const fast = config.fast;
  if (fast?.companyName) mergedLine(fast.companyName, { bold: true, align: 'left', height: 14 });
  if (fast?.companyAddress) mergedLine(fast.companyAddress, { size: 9, align: 'left', height: 13 });
  currentOffset++; // blank spacer row

  // ── Khối giữa: tiêu đề / tài khoản / khách hàng / kỳ ─────────────────────
  mergedLine(config.heading, { bold: true, size: 15, height: 27 });
  mergedLine(fast?.accountLine ?? '', { bold: true });
  const codeSuffix = fast?.customerCode ? ` (${fast.customerCode})` : '';
  mergedLine(`KHÁCH HÀNG: ${config.entityName}${codeSuffix}`, { bold: true });
  mergedLine(`TỪ NGÀY: ${dash(fast?.period.dateFrom)} ĐẾN NGÀY: ${dash(fast?.period.dateTo)}`, { bold: true });

  const fastData = buildFastStatement(config.statementLines!, config.statementTotals!);

  // ── SỐ DƯ ĐẦU KỲ — 2 ô Nợ | Có (label + tiền ở cột E:G, A:D trống) ───────
  const openingRow = currentOffset++;
  setCells(openingRow, [
    { col: 5, value: 'SỐ DƯ ĐẦU KỲ:', align: 'right', bold: true, fill: bandFill },
    { col: 6, value: fastData.opening.debit, numFmt: true, align: 'right', bold: true, fill: bandFill },
    { col: 7, value: fastData.opening.credit, numFmt: true, align: 'right', bold: true, fill: bandFill },
  ], 19.5);

  // ── Header 2 tầng: STT | CHỨNG TỪ (NGÀY | SỐ) | DIỄN GIẢI | TK Đ.ỨNG | SỐ PHÁT SINH (NỢ | CÓ)
  const headerRow = currentOffset++;
  const subRow = currentOffset++;
  sheet.mergeCells(headerRow, 1, subRow, 1); // STT
  sheet.mergeCells(headerRow, 2, headerRow, 3); // CHỨNG TỪ spans NGÀY|SỐ
  sheet.mergeCells(headerRow, 4, subRow, 4); // DIỄN GIẢI
  sheet.mergeCells(headerRow, 5, subRow, 5); // TK Đ.ỨNG
  sheet.mergeCells(headerRow, 6, headerRow, 7); // SỐ PHÁT SINH spans NỢ|CÓ
  const headerCell = (r: number, col: number, value: string) => {
    const cell = sheet.getCell(r, col);
    cell.value = value;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = borderStyle;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF244677' } };
  };
  headerCell(headerRow, 1, 'STT');
  headerCell(headerRow, 2, 'CHỨNG TỪ');
  headerCell(subRow, 2, 'NGÀY');
  headerCell(subRow, 3, 'SỐ');
  headerCell(headerRow, 4, 'DIỄN GIẢI');
  headerCell(headerRow, 5, 'TK Đ.ỨNG');
  headerCell(headerRow, 6, 'SỐ PHÁT SINH');
  headerCell(subRow, 6, 'NỢ');
  headerCell(subRow, 7, 'CÓ');
  // Merged slave cells also carry the navy fill + grid border.
  for (const r of [headerRow, subRow]) {
    for (let c = 1; c <= 7; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = borderStyle;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF244677' } };
    }
  }
  sheet.getRow(headerRow).height = 19.5;
  sheet.getRow(subRow).height = 19.5;
  const firstDataRow = currentOffset;
  let lastDataRow = firstDataRow - 1;

  // ── Chứng từ: mỗi chứng từ một STT, các dòng nghiệp vụ dưới 1 STT ────────
  for (const voucher of fastData.vouchers) {
    voucher.lines.forEach((line, lineIdx) => {
      const r = currentOffset++;
      lastDataRow = r;
      const first = lineIdx === 0;
      const zebra = (r - firstDataRow) % 2 === 1 ? zebraFill : 'FFFFFFFF';
      setCells(r, [
        { col: 1, value: first ? voucher.stt : null, align: 'center', fill: zebra },
        { col: 2, value: first && voucher.docDate ? new Date(`${voucher.docDate}T00:00:00Z`) : null, fmt: first && voucher.docDate ? 'dd/MM/yyyy' : undefined, align: 'center', fill: zebra },
        { col: 3, value: first ? (voucher.docNo ?? '—') : null, align: 'center', fill: zebra },
        { col: 4, value: line.description, align: 'left', fill: zebra },
        { col: 5, value: line.contraAccount ?? 0, align: 'center', fill: zebra },
        { col: 6, value: line.debit ?? 0, numFmt: true, align: 'right', fill: zebra },
        { col: 7, value: line.credit ?? 0, numFmt: true, align: 'right', fill: zebra },
      ], 18);
    });
  }
  if (fastData.vouchers.length === 0) {
    const r = currentOffset++;
    sheet.mergeCells(r, 1, r, 7);
    setCells(r, Array.from({ length: 7 }, (_, i) => ({ col: i + 1, value: i === 0 ? 'Không có giao dịch trong kỳ' : null, align: 'center' as const, fill: 'FFFFFFFF' })), 18);
  }

  // ── TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ — công thức sống, fill/viền đủ 7 cột ──
  const hasData = lastDataRow >= firstDataRow;
  const totalRow = currentOffset++;
  const closingRow = currentOffset++;
  setCells(totalRow, [
    { col: 1, value: null, fill: bandFill },
    { col: 2, value: null, fill: bandFill },
    { col: 3, value: null, fill: bandFill },
    { col: 4, value: null, fill: bandFill },
    { col: 5, value: 'TỔNG PHÁT SINH:', align: 'right', bold: true, fill: bandFill },
    { col: 6, value: hasData ? { formula: `SUM(F${firstDataRow}:F${lastDataRow})`, result: fastData.totals.debitTotal } : 0, numFmt: true, align: 'right', bold: true, fill: bandFill },
    { col: 7, value: hasData ? { formula: `SUM(G${firstDataRow}:G${lastDataRow})`, result: fastData.totals.creditTotal } : 0, numFmt: true, align: 'right', bold: true, fill: bandFill },
  ], 19.5);
  setCells(closingRow, [
    { col: 1, value: null, fill: bandFill },
    { col: 2, value: null, fill: bandFill },
    { col: 3, value: null, fill: bandFill },
    { col: 4, value: null, fill: bandFill },
    { col: 5, value: 'SỐ DƯ CUỐI KỲ:', align: 'right', bold: true, fill: bandFill },
    { col: 6, value: { formula: `MAX(0,(F${openingRow}+F${totalRow})-(G${openingRow}+G${totalRow}))`, result: fastData.closing.debit }, numFmt: true, align: 'right', bold: true, fill: bandFill },
    { col: 7, value: { formula: `MAX(0,(G${openingRow}+G${totalRow})-(F${openingRow}+F${totalRow}))`, result: fastData.closing.credit }, numFmt: true, align: 'right', bold: true, fill: bandFill },
  ], 19.5);

  // ── Khối ký tên: Ngày … tháng … năm … + NGƯỜI LẬP BIỂU / KẾ TOÁN TRƯỞNG ──
  currentOffset++; // blank spacer row
  const signDateRow = currentOffset++;
  sheet.mergeCells(signDateRow, 6, signDateRow, 7);
  setCells(signDateRow, [{ col: 6, value: 'Ngày ..... tháng ..... năm .........', align: 'center' }], 16);
  const signTitleRow = currentOffset++;
  sheet.mergeCells(signTitleRow, 2, signTitleRow, 3);
  sheet.mergeCells(signTitleRow, 6, signTitleRow, 7);
  setCells(signTitleRow, [
    { col: 2, value: 'NGƯỜI LẬP BIỂU', align: 'center', bold: true },
    { col: 6, value: 'KẾ TOÁN TRƯỞNG', align: 'center', bold: true },
  ], 16);
  const signSubRow = currentOffset++;
  sheet.mergeCells(signSubRow, 2, signSubRow, 3);
  sheet.mergeCells(signSubRow, 6, signSubRow, 7);
  setCells(signSubRow, [
    { col: 2, value: '(Ký, họ tên)', align: 'center', size: 9 },
    { col: 6, value: '(Ký, họ tên)', align: 'center', size: 9 },
  ], 14);

  sheet.getColumn(1).width = 6.4;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = Math.max(13.2, ...fastData.vouchers.map((v) => (v.docNo?.length ?? 0) + 3));
  sheet.getColumn(4).width = 46.4;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 15.8;
  sheet.getColumn(7).width = 15.8;

  await workbook.xlsx.write(writable);
}

async function buildStatementXlsx(config: StatementExportConfig, dateStr: string, writable: Writable): Promise<void> {
  // NEPO-47: customer statements render the Fast 'SỔ CHI TIẾT CÔNG NỢ' book —
  // dedicated builder, the shared aging/flat-ledger scaffold does not apply.
  if (config.statementLines && config.statementTotals) {
    return buildFastStatementXlsx(config, writable);
  }
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(config.sheetName);

  // Enable grid lines
  sheet.views = [{ showGridLines: true }];

  // Border style
  const borderStyle = {
    top: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
  };

  // Header/Title Row (Row 2)
  sheet.mergeCells('A2:H2');
  const titleCell = sheet.getCell('A2');
  titleCell.value = config.heading.toUpperCase();
  titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00702F' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 36;

  // Partner Info (Row 4)
  sheet.getCell('A4').value = `${config.entityLabel}:`;
  sheet.getCell('A4').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF374151' } };
  sheet.getCell('B4').value = config.entityName;
  sheet.getCell('B4').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF111827' } };
  sheet.mergeCells('B4:H4');
  sheet.getRow(4).height = 20;

  // Contact Info (Row 5+)
  let currentOffset = 5;
  config.contactLines.forEach((line) => {
    sheet.getCell(`A${currentOffset}`).value = line;
    sheet.getCell(`A${currentOffset}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF4B5563' } };
    sheet.mergeCells(`A${currentOffset}:H${currentOffset}`);
    sheet.getRow(currentOffset).height = 18;
    currentOffset++;
  });

  // Export date
  sheet.getCell(`A${currentOffset}`).value = `Ngày xuất: ${dateStr}`;
  sheet.getCell(`A${currentOffset}`).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF6B7280' } };
  sheet.mergeCells(`A${currentOffset}:H${currentOffset}`);
  sheet.getRow(currentOffset).height = 18;
  currentOffset++;

  // Total Outstanding Row
  const outstandingRow = currentOffset;
  sheet.getCell(`A${outstandingRow}`).value = 'TỔNG CỘNG NỢ HIỆN TẠI:';
  sheet.getCell(`A${outstandingRow}`).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFDC2626' } };
  sheet.mergeCells(`A${outstandingRow}:D${outstandingRow}`);

  sheet.getCell(`E${outstandingRow}`).value = config.totalOutstanding;
  sheet.getCell(`E${outstandingRow}`).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFDC2626' } };
  sheet.getCell(`E${outstandingRow}`).numFmt = '#,##0" đ"';
  sheet.mergeCells(`E${outstandingRow}:H${outstandingRow}`);
  sheet.getRow(outstandingRow).height = 22;
  currentOffset++;

  // Space
  currentOffset++;

  // Aging header row
  const agingHeaderRow = currentOffset;
  sheet.mergeCells(`A${agingHeaderRow}:H${agingHeaderRow}`);
  const agingHeaderCell = sheet.getCell(`A${agingHeaderRow}`);
  agingHeaderCell.value = 'PHÂN TÍCH TUỔI NỢ';
  agingHeaderCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF00702F' } };
  agingHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
  agingHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(agingHeaderRow).height = 24;
  currentOffset++;

  // Aging columns: horizontal grid
  const agingLabelRow = currentOffset;
  const agingValueRow = agingLabelRow + 1;

  config.agingBuckets.forEach((b, i) => {
    const colIdx = i + 1; // A, B, C, D
    const labelCell = sheet.getCell(agingLabelRow, colIdx);
    labelCell.value = b.range;
    labelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF374151' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
    labelCell.border = borderStyle;

    const valCell = sheet.getCell(agingValueRow, colIdx);
    valCell.value = b.amount;
    valCell.font = { name: 'Segoe UI', size: 10, color: b.amount > 0 ? { argb: 'FFDC2626' } : { argb: 'FF9CA3AF' } };
    valCell.numFmt = '#,##0';
    valCell.alignment = { vertical: 'middle', horizontal: 'center' };
    valCell.border = borderStyle;
  });

  // Aging Total Column (Columns 5 to 8 merged)
  const totalLabelCell = sheet.getCell(agingLabelRow, 5);
  totalLabelCell.value = 'Tổng cộng';
  totalLabelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00702F' } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.mergeCells(agingLabelRow, 5, agingLabelRow, 8);
  for (let c = 5; c <= 8; c++) {
    sheet.getCell(agingLabelRow, c).border = borderStyle;
  }

  const totalValueCell = sheet.getCell(agingValueRow, 5);
  totalValueCell.value = config.totalOutstanding;
  totalValueCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF00702F' } };
  totalValueCell.numFmt = '#,##0';
  totalValueCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.mergeCells(agingValueRow, 5, agingValueRow, 8);
  for (let c = 5; c <= 8; c++) {
    sheet.getCell(agingValueRow, c).border = borderStyle;
  }

  sheet.getRow(agingLabelRow).height = 20;
  sheet.getRow(agingValueRow).height = 20;
  currentOffset += 2;

  // Space
  currentOffset++;

  // Transaction Detail Header (Row 13+)
  const transHeaderRow = currentOffset;
  sheet.mergeCells(`A${transHeaderRow}:H${transHeaderRow}`);
  const transHeaderCell = sheet.getCell(`A${transHeaderRow}`);
  transHeaderCell.value = 'CHI TIẾT CÁC GIAO DỊCH';
  transHeaderCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  transHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00702F' } };
  transHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(transHeaderRow).height = 24;
  currentOffset++;

  // Table header row
  const tableHeaderRow = currentOffset;
  const headers = ['Ngày', 'Tuyến đường', 'Số Container', 'Loại giao dịch', 'Nợ (VND)', 'Có (VND)', 'Số dư (VND)', 'Ghi chú'];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(tableHeaderRow, i + 1);
    cell.value = h;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF374151' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: i === 0 ? 'center' : (i >= 4 && i <= 6 ? 'right' : 'left'),
    };
    cell.border = borderStyle;
  });
  sheet.getRow(tableHeaderRow).height = 22;
  currentOffset++;

  // Populate data rows
  config.ledgerRows.forEach((row, i: number) => {
    const r = tableHeaderRow + 1 + i;
    const debit = parseFloat(row.debit || '0');
    const credit = parseFloat(row.credit || '0');
    const balance = parseFloat(row.balance || '0');

    const dateCell = sheet.getCell(r, 1);
    dateCell.value = row.timestamp ? new Date(row.timestamp).toISOString().slice(0, 10) : '';
    dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const routeCell = sheet.getCell(r, 2);
    routeCell.value = row.routeName || '—';
    routeCell.alignment = { vertical: 'middle', horizontal: 'left' };

    const contCell = sheet.getCell(r, 3);
    contCell.value = row.containerNumbers && row.containerNumbers.length > 0
      ? row.containerNumbers.join(', ')
      : '—';
    contCell.alignment = { vertical: 'middle', horizontal: 'left' };

    const typeCell = sheet.getCell(r, 4);
    typeCell.value = config.txnLabels[row.txnType] || 'Khác';
    typeCell.alignment = { vertical: 'middle', horizontal: 'left' };

    const debitCell = sheet.getCell(r, 5);
    debitCell.value = debit || '';
    debitCell.numFmt = '#,##0';
    debitCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const creditCell = sheet.getCell(r, 6);
    creditCell.value = credit || '';
    creditCell.numFmt = '#,##0';
    creditCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const balCell = sheet.getCell(r, 7);
    balCell.value = balance;
    balCell.numFmt = '#,##0';
    balCell.alignment = { vertical: 'middle', horizontal: 'right' };
    balCell.font = { name: 'Segoe UI', size: 10, bold: true, color: balance > 0 ? { argb: 'FFDC2626' } : { argb: 'FF10B981' } };

    const noteCell = sheet.getCell(r, 8);
    noteCell.value = row.note || '';
    noteCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // Zebra striping and standard styling
    const zebraColor = i % 2 === 0 ? 'FFFFFFFF' : 'FFF9FBF9';
    for (let c = 1; c <= 8; c++) {
      const cell = sheet.getCell(r, c);
      if (c !== 7) {
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1F2937' } };
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraColor } };
      cell.border = borderStyle;
    }

    sheet.getRow(r).height = 20;
  });

  // Set column widths
  sheet.getColumn(1).width = 14; // Ngày (a bit wider — header label "Ngày" + ISO dates need breathing room)
  sheet.getColumn(2).width = 28; // Tuyến đường
  sheet.getColumn(3).width = 22; // Số Container
  sheet.getColumn(4).width = 22; // Loại giao dịch
  sheet.getColumn(5).width = 16; // Nợ
  sheet.getColumn(6).width = 16; // Có
  sheet.getColumn(7).width = 18; // Số dư
  sheet.getColumn(8).width = 35; // Ghi chú

  await workbook.xlsx.write(writable);
}

function buildStatementHtml(config: StatementExportConfig, dateStr: string): string {
  // NEPO-47: customer statements render the Fast 'SỔ CHI TIẾT CÔNG NỢ' page —
  // dedicated builder (no aging/flat-ledger scaffold).
  if (config.statementLines && config.statementTotals) {
    return buildFastStatementHtml(config);
  }
  const detailTable = `<table>
  <thead><tr><th>Ngày</th><th>Tuyến</th><th>Số Cont</th><th>Loại GD</th><th class="num">Nợ</th><th class="num">Có</th><th class="num">Số dư</th><th>Ghi chú</th></tr></thead>
  <tbody>${config.ledgerRows.map((row) => {
    const debit = parseFloat(row.debit || '0');
    const credit = parseFloat(row.credit || '0');
    const balance = parseFloat(row.balance || '0');
    const date = row.timestamp ? new Date(row.timestamp).toISOString().slice(0, 10) : '';
    const routeName = row.routeName || '—';
    const containerNumbers = row.containerNumbers && row.containerNumbers.length > 0
      ? row.containerNumbers.join(', ')
      : '—';
    return `<tr>
      <td>${date}</td>
      <td>${escapeHtml(routeName)}</td>
      <td>${escapeHtml(containerNumbers)}</td>
      <td>${escapeHtml(config.txnLabels[row.txnType] || 'Khác')}</td>
      <td class="num">${debit ? debit.toLocaleString('vi-VN') : ''}</td>
      <td class="num">${credit ? credit.toLocaleString('vi-VN') : ''}</td>
      <td class="num">${balance.toLocaleString('vi-VN')}</td>
      <td>${escapeHtml(row.note || '')}</td>
    </tr>`;
  }).join('')}</tbody>
</table>`;

  const agingRows = config.agingBuckets.map(b =>
    `<tr><td>${b.range}</td><td class="num">${b.amount.toLocaleString('vi-VN')} ₫</td></tr>`
  ).join('');

  const contactHtml = config.contactLines.map(l => escapeHtml(l)).join('<br>\n  ');

  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<title>${escapeHtml(config.heading)} — ${escapeHtml(config.entityName)}</title>
<style>
  ${SHARED_CSS}
</style>
</head><body>
<h1>${escapeHtml(config.heading)}</h1>
<div class="meta">
  ${config.entityLabel}: <strong>${escapeHtml(config.entityName)}</strong><br>
  ${contactHtml}<br>
  Ngày xuất: ${dateStr}
</div>
<div class="total">Tổng nợ: ${config.totalOutstanding.toLocaleString('vi-VN')} ₫</div>
<table class="aging">${agingRows}</table>
${detailTable}
</body></html>`;
}

/**
 * NEPO-47 — Fast 'SỔ CHI TIẾT CÔNG NỢ' print page: đúng mẫu Fast — letterhead
 * công ty (ẩn khi chưa cấu hình), khối giữa căn giữa (tiêu đề + dòng tài
 * khoản 131111 + KHÁCH HÀNG (MST) + TỪ/ĐẾN NGÀY), SỐ DƯ ĐẦU KỲ 2 ô Nợ|Có
 * phía trên bảng (fill EAEFF8, hiển thị cả số 0), bảng nền 244677: STT |
 * CHỨNG TỪ (NGÀY | SỐ) | DIỄN GIẢI | TK Đ.ỨNG | SỐ PHÁT SINH (NỢ | CÓ) với
 * mỗi chứng từ một STT (nhiều dòng nghiệp vụ dưới một STT, ngày dd-mm),
 * TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ (fill đủ 7 cột), khối ký tên NGƯỜI LẬP
 * BIỂU / KẾ TOÁN TRƯỞNG. Tiền hiển thị '#,##0' không ₫, số 0 phía tiền còn
 * ô trống. Tự mang <style> riêng — SHARED_CSS phục vụ các bản export khác.
 */
export function buildFastStatementHtml(config: StatementExportConfig): string {
  const fastData = buildFastStatement(config.statementLines!, config.statementTotals!);
  const amount = (v: number) => v.toLocaleString('vi-VN');
  const blank = (v: number) => (v ? amount(v) : '');
  const dm = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}` : iso);
  const dash = (iso: string | undefined) => {
    const s = iso ?? '';
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)}` : (s || '……');
  };

  const fast = config.fast;
  const letterhead = [
    fast?.companyName ? `<div class="lh-name">${escapeHtml(fast.companyName)}</div>` : '',
    fast?.companyAddress ? `<div class="lh-addr">${escapeHtml(fast.companyAddress)}</div>` : '',
  ].join('\n  ');

  const voucherRows: string[] = [];
  let dataRowIdx = 0;
  for (const voucher of fastData.vouchers) {
    voucher.lines.forEach((line, lineIdx) => {
      const first = lineIdx === 0;
      const z = dataRowIdx % 2 === 1 ? ' class="z"' : '';
      dataRowIdx++;
      voucherRows.push(`<tr${z}>
      <td class="c">${first ? voucher.stt : ''}</td>
      <td class="c">${first && voucher.docDate ? escapeHtml(dm(voucher.docDate)) : ''}</td>
      <td class="c">${first ? escapeHtml(voucher.docNo ?? '—') : ''}</td>
      <td>${escapeHtml(line.description)}</td>
      <td class="c">${escapeHtml(line.contraAccount ?? '')}</td>
      <td class="num">${blank(line.debit)}</td>
      <td class="num">${blank(line.credit)}</td>
    </tr>`);
    });
  }

  const codeSuffix = fast?.customerCode ? ` (${escapeHtml(fast.customerCode)})` : '';
  const period = fast?.period;

  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<title>${escapeHtml(config.heading)} — ${escapeHtml(config.entityName)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1f2937; max-width: 980px; margin: 24px auto; padding: 0 16px; }
  .lh-name { font-weight: 700; font-size: 13px; }
  .lh-addr { font-size: 12px; color: #475569; }
  .rpt-head { text-align: center; margin: 10px 0 8px; line-height: 1.7; }
  .rpt-head .title { font-size: 20px; font-weight: 700; letter-spacing: 0.02em; }
  .rpt-head .meta { font-size: 13px; font-weight: 700; }
  .opening { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin: 8px 0; font-weight: 700; }
  .opening .label { background: #EAEFF8; border: 1px solid #AFBDC5; padding: 2px 10px; white-space: nowrap; }
  .opening .amt { min-width: 110px; text-align: right; background: #EAEFF8; border: 1px solid #AFBDC5; padding: 2px 10px; font-variant-numeric: tabular-nums; }
  table.soke2 { border-collapse: collapse; width: 100%; }
  .soke2 th, .soke2 td { border: 1px solid #AFBDC5; padding: 4px 8px; font-size: 12px; vertical-align: middle; }
  .soke2 thead th { background: #244677; color: #fff; font-weight: 700; text-align: center; white-space: nowrap; }
  .soke2 tbody tr.z td { background: #F8F9FB; }
  .soke2 tfoot td { background: #EAEFF8; font-weight: 700; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .c { text-align: center; }
  .lbl { text-align: right; white-space: nowrap; }
  .sign { margin-top: 20px; }
  .sign-date { width: 50%; margin-left: auto; text-align: center; color: #475569; }
  .sign-row { display: flex; justify-content: space-between; margin-top: 14px; font-weight: 700; text-align: center; }
  .sign-row span { display: block; margin-top: 2px; font-weight: 400; font-size: 11px; color: #475569; }
  @media print { body { margin: 0; } .sign-row { page-break-inside: avoid; } }
</style>
</head><body>
  ${letterhead}
<div class="rpt-head">
  <div class="title">${escapeHtml(config.heading)}</div>
  <div class="meta">${escapeHtml(fast?.accountLine ?? '')}</div>
  <div class="meta">KHÁCH HÀNG: ${escapeHtml(config.entityName)}${codeSuffix}</div>
  <div class="meta">TỪ NGÀY: ${escapeHtml(dash(period?.dateFrom))} ĐẾN NGÀY: ${escapeHtml(dash(period?.dateTo))}</div>
</div>
<div class="opening">
  <span class="label">SỐ DƯ ĐẦU KỲ:</span>
  <span class="amt num">${amount(fastData.opening.debit)}</span>
  <span class="amt num">${amount(fastData.opening.credit)}</span>
</div>
<table class="soke2">
  <thead>
    <tr><th rowspan="2">STT</th><th colspan="2">CHỨNG TỪ</th><th rowspan="2">DIỄN GIẢI</th><th rowspan="2">TK Đ.ỨNG</th><th colspan="2">SỐ PHÁT SINH</th></tr>
    <tr><th>NGÀY</th><th>SỐ</th><th class="num">NỢ</th><th class="num">CÓ</th></tr>
  </thead>
  <tbody>
    ${voucherRows.join('\n    ')}
    ${fastData.vouchers.length === 0 ? '<tr><td colspan="7" class="c">Không có giao dịch trong kỳ</td></tr>' : ''}
  </tbody>
  <tfoot>
    <tr><td colspan="4"></td><td class="lbl">TỔNG PHÁT SINH:</td><td class="num">${amount(fastData.totals.debitTotal)}</td><td class="num">${amount(fastData.totals.creditTotal)}</td></tr>
    <tr><td colspan="4"></td><td class="lbl">SỐ DƯ CUỐI KỲ:</td><td class="num">${amount(fastData.closing.debit)}</td><td class="num">${amount(fastData.closing.credit)}</td></tr>
  </tfoot>
</table>
<div class="sign">
  <div class="sign-date">Ngày ..... tháng ..... năm .........</div>
  <div class="sign-row">
    <div>NGƯỜI LẬP BIỂU<span>(Ký, họ tên)</span></div>
    <div>KẾ TOÁN TRƯỞNG<span>(Ký, họ tên)</span></div>
  </div>
</div>
</body></html>`;
}

// escapeHtml imported from lib/format

export async function exportReceivablesAgingXlsx(data: CustomerAgingListItem[], dateStr: string, writable: Writable): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Công nợ phải thu');

  // Enable grid lines
  sheet.views = [{ showGridLines: true }];

  // Border style
  const borderStyle = {
    top: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
  };

  // Header/Title Row (Row 2)
  sheet.mergeCells('A2:H2');
  const titleCell = sheet.getCell('A2');
  titleCell.value = 'BÁO CÁO CÔNG NỢ PHẢI THU';
  titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00702F' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 36;

  // Export date (Row 4)
  sheet.getCell('A4').value = `Ngày xuất: ${dateStr}`;
  sheet.getCell('A4').font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF6B7280' } };
  sheet.mergeCells('A4:H4');
  sheet.getRow(4).height = 20;

  let currentOffset = 6;

  // Table header row
  const tableHeaderRow = currentOffset;
  const headers = ['Khách hàng', 'Tổng nợ (VND)', 'Trong hạn (VND)', '31-60 ngày (VND)', '61-90 ngày (VND)', 'Trên 90 ngày (VND)', 'Phải trả l.kết (VND)', 'Nợ ròng (VND)'];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(tableHeaderRow, i + 1);
    cell.value = h;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF374151' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: i === 0 ? 'left' : 'right',
    };
    cell.border = borderStyle;
  });
  sheet.getRow(tableHeaderRow).height = 24;
  currentOffset++;

  let sumTotal = 0;
  let sumCurrent = 0;
  let sumD30 = 0;
  let sumD60 = 0;
  let sumOver90 = 0;
  let sumApBalance = 0;
  let sumNetBalance = 0;

  // Populate data rows
  data.forEach((row, i: number) => {
    const r = tableHeaderRow + 1 + i;
    
    const customerNameCell = sheet.getCell(r, 1);
    customerNameCell.value = row.customerName;
    customerNameCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF111827' } };
    customerNameCell.alignment = { vertical: 'middle', horizontal: 'left' };
    customerNameCell.border = borderStyle;

    const totalCell = sheet.getCell(r, 2);
    totalCell.value = row.totalOutstanding || 0;
    totalCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF111827' } };
    totalCell.numFmt = '#,##0';
    totalCell.alignment = { vertical: 'middle', horizontal: 'right' };
    totalCell.border = borderStyle;

    const currentCell = sheet.getCell(r, 3);
    currentCell.value = row.aging.current || 0;
    currentCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF4B5563' } };
    currentCell.numFmt = '#,##0';
    currentCell.alignment = { vertical: 'middle', horizontal: 'right' };
    currentCell.border = borderStyle;

    const d30Cell = sheet.getCell(r, 4);
    d30Cell.value = row.aging.d30 || 0;
    d30Cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF4B5563' } };
    d30Cell.numFmt = '#,##0';
    d30Cell.alignment = { vertical: 'middle', horizontal: 'right' };
    d30Cell.border = borderStyle;

    const d60Cell = sheet.getCell(r, 5);
    d60Cell.value = row.aging.d60 || 0;
    d60Cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF4B5563' } };
    d60Cell.numFmt = '#,##0';
    d60Cell.alignment = { vertical: 'middle', horizontal: 'right' };
    d60Cell.border = borderStyle;

    const over90Cell = sheet.getCell(r, 6);
    over90Cell.value = row.aging.over90 || 0;
    over90Cell.font = { name: 'Segoe UI', size: 10, color: row.aging.over90 > 0 ? { argb: 'FFDC2626' } : { argb: 'FF4B5563' } };
    over90Cell.numFmt = '#,##0';
    over90Cell.alignment = { vertical: 'middle', horizontal: 'right' };
    over90Cell.border = borderStyle;

    const apBalanceCell = sheet.getCell(r, 7);
    apBalanceCell.value = row.linkedSupplierApBalance || 0;
    apBalanceCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF4B5563' } };
    apBalanceCell.numFmt = '#,##0';
    apBalanceCell.alignment = { vertical: 'middle', horizontal: 'right' };
    apBalanceCell.border = borderStyle;

    const netBalanceCell = sheet.getCell(r, 8);
    netBalanceCell.value = row.netBalance || 0;
    netBalanceCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF00702F' } };
    netBalanceCell.numFmt = '#,##0';
    netBalanceCell.alignment = { vertical: 'middle', horizontal: 'right' };
    netBalanceCell.border = borderStyle;

    sheet.getRow(r).height = 20;

    sumTotal += row.totalOutstanding || 0;
    sumCurrent += row.aging.current || 0;
    sumD30 += row.aging.d30 || 0;
    sumD60 += row.aging.d60 || 0;
    sumOver90 += row.aging.over90 || 0;
    sumApBalance += row.linkedSupplierApBalance || 0;
    sumNetBalance += row.netBalance || 0;

    currentOffset++;
  });

  // Total row
  const totalRowIdx = currentOffset + 1;
  const labelCell = sheet.getCell(totalRowIdx, 1);
  labelCell.value = 'TỔNG CỘNG';
  labelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
  labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
  labelCell.border = borderStyle;

  const totalCols = [
    { col: 2, val: sumTotal },
    { col: 3, val: sumCurrent },
    { col: 4, val: sumD30 },
    { col: 5, val: sumD60 },
    { col: 6, val: sumOver90, isRed: true },
    { col: 7, val: sumApBalance },
    { col: 8, val: sumNetBalance, isBold: true }
  ];

  totalCols.forEach(tc => {
    const cell = sheet.getCell(totalRowIdx, tc.col);
    cell.value = tc.val;
    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: tc.isRed ? { argb: 'FFDC2626' } : { argb: 'FF111827' }
    };
    cell.numFmt = '#,##0';
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
    cell.border = borderStyle;
  });

  sheet.getRow(totalRowIdx).height = 22;

  // Set widths
  sheet.columns.forEach((col, i) => {
    let maxLen = headers[i] ? headers[i].length : 0;
    sheet.getColumn(i + 1).eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value || '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.max(maxLen + 4, 12);
  });

  await workbook.xlsx.write(writable);
}

// escapeHtml imported from lib/format
