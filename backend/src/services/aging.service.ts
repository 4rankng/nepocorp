import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, sql, inArray, like } from 'drizzle-orm';
import { computeFifoAging, TxnType } from '@tingting/shared';
import type { PayableSummary, PayablesCategory, Supplier } from '@tingting/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

type LedgerEntry = { debit: string | null; credit: string | null; timestamp: Date | null };

interface AgingConfig {
  entityType: 'CUSTOMER' | 'VENDOR';
  /** Whether to invert debit/credit before FIFO computation (true for VENDOR) */
  invertSigns: boolean;
}

interface FetchOptions {
  /** Point-in-time snapshot: only include entries up to this date (inclusive) */
  asOfDate?: string;
  /** Restrict to a single entity — avoids fetching all entities when only one is needed */
  entityId?: number;
  /** Restrict to a known set of entities — useful after catalog/search prefiltering */
  entityIds?: number[];
  /** Restrict to a subset of transaction types (e.g. fuel-only payables). */
  txnTypes?: TxnType[];
}

interface EntityAgingResult {
  entityId: number;
  aging: { current: number; d30: number; d60: number; over90: number };
  openInvoices: Array<{ ts: string; open: number }>;
  totalOutstanding: number;
  maxOverdueDays: number;
}

interface AgingPageOptions {
  page?: number;
  limit?: number;
}

export interface CustomerAgingListItem {
  customerId: number;
  customerName: string;
  contactInfo: string | null;
  linkedSupplierId: number | null;
  linkedSupplierApBalance: number;
  netBalance: number;
  totalOutstanding: number;
  aging: { current: number; d30: number; d60: number; over90: number };
  maxOverdueDays: number;
}

export interface CustomerAgingListResult {
  customers: CustomerAgingListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Core computation ────────────────────────────────────────────────────────

async function fetchLedgerGrouped(
  config: AgingConfig,
  opts: FetchOptions = {},
): Promise<Map<number, LedgerEntry[]>> {
  if (opts.entityIds && opts.entityIds.length === 0) return new Map();

  const conditions = [eq(s.ledger.entityType, config.entityType)];
  if (opts.entityId !== undefined) conditions.push(eq(s.ledger.entityId, opts.entityId));
  if (opts.entityIds && opts.entityIds.length > 0) conditions.push(inArray(s.ledger.entityId, opts.entityIds));
  if (opts.asOfDate) conditions.push(sql`${s.ledger.timestamp} <= ${opts.asOfDate}::timestamptz`);
  if (opts.txnTypes && opts.txnTypes.length > 0) {
    conditions.push(inArray(s.ledger.txnType, opts.txnTypes));
  }

  const ledgerRows = await db.select({
    entityId: s.ledger.entityId,
    debit: s.ledger.debit,
    credit: s.ledger.credit,
    timestamp: s.ledger.timestamp,
  }).from(s.ledger)
    .where(and(...conditions))
    .orderBy(sql`${s.ledger.id} ASC`);

  const grouped = new Map<number, LedgerEntry[]>();
  for (const row of ledgerRows) {
    const entries = grouped.get(row.entityId) || [];
    entries.push({ debit: row.debit, credit: row.credit, timestamp: row.timestamp });
    grouped.set(row.entityId, entries);
  }
  return grouped;
}

function computeAging(entries: LedgerEntry[], now: Date, invertSigns: boolean) {
  return computeFifoAging(
    entries.map(e => ({
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : (e.timestamp as string | null),
      debit: invertSigns ? (e.credit ?? '0') : (e.debit ?? '0'),
      credit: invertSigns ? (e.debit ?? '0') : (e.credit ?? '0'),
    })),
    now,
  );
}

function computeEntityResults(
  grouped: Map<number, LedgerEntry[]>,
  config: AgingConfig,
): EntityAgingResult[] {
  const now = new Date();
  const results: EntityAgingResult[] = [];

  for (const [entityId, entries] of grouped) {
    const { aging, openInvoices } = computeAging(entries, now, config.invertSigns);
    const totalOutstanding = aging.current + aging.d30 + aging.d60 + aging.over90;

    let maxOverdueDays = 0;
    for (const inv of openInvoices) {
      if (inv.open <= 0) continue;
      const ageDays = Math.floor((now.getTime() - new Date(inv.ts).getTime()) / 86400000);
      if (ageDays > maxOverdueDays) maxOverdueDays = ageDays;
    }

    if (totalOutstanding > 0) {
      results.push({ entityId, aging, openInvoices, totalOutstanding, maxOverdueDays });
    }
  }

  return results;
}

export function paginateAgingRows<T>(
  rows: T[],
  opts: AgingPageOptions = {},
): { rows: T[]; page: number; limit: number; total: number; totalPages: number } {
  const page = Math.max(1, Math.floor(opts.page || 1));
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit || 500)));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    rows: rows.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages,
  };
}

async function findCustomerIdsForAgingSearch(search: string): Promise<Set<number>> {
  const escaped = search.replace(/[%_]/g, '\\$&');
  const pattern = `%${escaped}%`;
  const ids = new Set<number>();

  // Name + contact match — case-insensitive
  const byName = await db.select({ id: s.customers.id }).from(s.customers)
    .where(sql`lower(${s.customers.name}) like lower(${pattern}) OR lower(coalesce(${s.customers.contactInfo}, '')) like lower(${pattern})`);
  byName.forEach(r => ids.add(r.id));

  // Container match via trip_containers
  const byContainer = await db
    .select({ customerId: s.trips.customerId })
    .from(s.tripContainers)
    .innerJoin(s.trips, eq(s.tripContainers.tripId, s.trips.id))
    .where(like(s.tripContainers.containerNumber, pattern));
  byContainer.forEach(r => ids.add(r.customerId));

  // Container match via trip_expenses.container_number
  const byFeeContainer = await db
    .select({ customerId: s.trips.customerId })
    .from(s.tripExpenses)
    .innerJoin(s.trips, eq(s.tripExpenses.tripId, s.trips.id))
    .where(like(s.tripExpenses.containerNumber, pattern));
  byFeeContainer.forEach(r => ids.add(r.customerId));

  return ids;
}

// ─── Accounts Receivable (Customer aging) ────────────────────────────────────

export async function getReceivablesSummary(opts: { asOfDate?: string } = {}) {
  const grouped = await fetchLedgerGrouped({ entityType: 'CUSTOMER', invertSigns: false }, opts);
  const results = computeEntityResults(grouped, { entityType: 'CUSTOMER', invertSigns: false });

  const buckets = [
    { range: '0-30', label: 'Trong hạn', count: 0, amount: 0 },
    { range: '31-60', label: '31-60 ngày', count: 0, amount: 0 },
    { range: '61-90', label: '61-90 ngày', count: 0, amount: 0 },
    { range: '90+', label: 'Trên 90 ngày', count: 0, amount: 0 },
  ];

  let totalOutstanding = 0;
  let totalCustomers = 0;

  for (const r of results) {
    buckets[0].amount += r.aging.current;
    buckets[1].amount += r.aging.d30;
    buckets[2].amount += r.aging.d60;
    buckets[3].amount += r.aging.over90;

    totalCustomers++;
    totalOutstanding += r.totalOutstanding;

    if (r.maxOverdueDays > 90) buckets[3].count++;
    else if (r.maxOverdueDays > 60) buckets[2].count++;
    else if (r.maxOverdueDays > 30) buckets[1].count++;
    else buckets[0].count++;
  }

  return { buckets, totalOutstanding, totalCustomers, overdueCustomers: totalCustomers - buckets[0].count };
}

export async function getTopOverdueCustomer(): Promise<{ name: string; balance: number; days: number } | null> {
  const balanceRows = await db.execute(sql`
    SELECT DISTINCT ON (entity_id) entity_id as "entityId", balance, timestamp
    FROM ledger
    WHERE entity_type = 'CUSTOMER'
    ORDER BY entity_id, id DESC
  `) as unknown as Array<{ entityId: number; balance: string; timestamp: string | null }>;

  const activeDebtors = balanceRows
    .map(r => ({ entityId: r.entityId, balance: parseFloat(r.balance || '0') }))
    .filter(r => r.balance > 0);

  if (activeDebtors.length === 0) return null;

  const debtorIds = activeDebtors.map(d => d.entityId);

  const oldestDebitRows = await db.execute(sql`
    SELECT DISTINCT ON (entity_id) entity_id as "entityId", timestamp
    FROM ledger
    WHERE entity_type = 'CUSTOMER'
      AND debit::numeric > 0
      AND entity_id IN (${sql.join(debtorIds.map(id => sql`${id}`), sql`, `)})
    ORDER BY entity_id, id ASC
  `) as unknown as Array<{ entityId: number; timestamp: string | null }>;

  const oldestDebitsMap = new Map(
    oldestDebitRows.map(r => [r.entityId, r.timestamp ? new Date(r.timestamp) : null])
  );

  const customers = await db.select({ id: s.customers.id, name: s.customers.name })
    .from(s.customers)
    .where(sql`${s.customers.id} IN (${sql.join(debtorIds.map(id => sql`${id}`), sql`, `)})`);

  const nameById = new Map(customers.map(c => [c.id, c.name]));

  let topOverdue: { name: string; balance: number; days: number } | null = null;
  const now = Date.now();

  for (const debtor of activeDebtors) {
    if (!topOverdue || debtor.balance > topOverdue.balance) {
      const oldestDate = oldestDebitsMap.get(debtor.entityId);
      const days = oldestDate ? Math.max(0, Math.floor((now - oldestDate.getTime()) / 86400000)) : 0;
      topOverdue = {
        name: nameById.get(debtor.entityId) || 'Khách hàng không xác định',
        balance: debtor.balance,
        days,
      };
    }
  }

  return topOverdue;
}

export async function getCustomerAgingList(opts: { search?: string; asOfDate?: string; page?: number; limit?: number } = {}): Promise<CustomerAgingListResult> {
  // Container-number / name search: if provided, narrow customer IDs to those
  // whose customer name OR linked trips' containers (trip_containers or
  // trip_expenses.container_number) match the query. Matches the test guide's
  // expectation that "/debt" supports lookup by container.
  const trimmedSearch = opts.search?.trim();
  const searchedCustomerIds = trimmedSearch ? await findCustomerIdsForAgingSearch(trimmedSearch) : undefined;
  const grouped = await fetchLedgerGrouped(
    { entityType: 'CUSTOMER', invertSigns: false },
    { asOfDate: opts.asOfDate, entityIds: searchedCustomerIds ? [...searchedCustomerIds] : undefined },
  );
  const results = computeEntityResults(grouped, { entityType: 'CUSTOMER', invertSigns: false });

  const customerIds = results.map(r => r.entityId);
  const customers = customerIds.length > 0
    ? await db.select({ id: s.customers.id, name: s.customers.name, contactInfo: s.customers.contactInfo, linkedSupplierId: s.customers.linkedSupplierId })
        .from(s.customers)
        .where(inArray(s.customers.id, customerIds))
    : [];
  const nameMap = new Map(customers.map(c => [c.id, c.name]));
  const contactMap = new Map(customers.map(c => [c.id, c.contactInfo]));
  const linkedSupplierMap = new Map(customers.map(c => [c.id, c.linkedSupplierId]));

  // For dual-role partners (customer with linked supplier), look up the linked
  // supplier's outstanding AP so the list page can show a Net column.
  const linkedSupplierIds = [...new Set(customers.map(c => c.linkedSupplierId).filter((v): v is number => v != null))];
  const apByVendor = new Map<number, number>();
  if (linkedSupplierIds.length > 0) {
    const apGrouped = await fetchLedgerGrouped(
      { entityType: 'VENDOR', invertSigns: true },
      { asOfDate: opts.asOfDate, entityIds: linkedSupplierIds },
    );
    const apResults = computeEntityResults(apGrouped, { entityType: 'VENDOR', invertSigns: true });
    for (const r of apResults) {
      apByVendor.set(r.entityId, r.totalOutstanding);
    }
  }

  const mapped: CustomerAgingListItem[] = results.map(r => {
    const linkedSupplierId = linkedSupplierMap.get(r.entityId) ?? null;
    const linkedSupplierApBalance = linkedSupplierId != null ? (apByVendor.get(linkedSupplierId) ?? 0) : 0;
    return {
      customerId: r.entityId,
      customerName: nameMap.get(r.entityId) || `Khách hàng #${r.entityId}`,
      contactInfo: contactMap.get(r.entityId) || null,
      linkedSupplierId,
      linkedSupplierApBalance,
      netBalance: r.totalOutstanding - linkedSupplierApBalance,
      totalOutstanding: r.totalOutstanding,
      aging: r.aging,
      maxOverdueDays: r.maxOverdueDays,
    };
  });

  mapped.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  const page = paginateAgingRows(mapped, opts);
  return {
    customers: page.rows,
    page: page.page,
    limit: page.limit,
    total: page.total,
    totalPages: page.totalPages,
  };
}

// ─── Accounts Payable (Vendor aging) ─────────────────────────────────────────

export async function getPayablesSummary(opts: { asOfDate?: string; category?: PayablesCategory } = {}) {
  // Category → ledger scoping. `undefined` preserves the legacy behavior of
  // aggregating every VENDOR row regardless of txnType.
  type Scope = { entityType: 'CUSTOMER' | 'VENDOR'; txnTypes?: TxnType[]; invertSigns: boolean; kind: 'vendor' | 'carrier' };
  const scope: Scope = (() => {
    switch (opts.category) {
      case 'fuel':
        return { entityType: 'VENDOR', txnTypes: [TxnType.FUEL_EXPENSE], invertSigns: true, kind: 'vendor' as const };
      case 'ancillary':
        return { entityType: 'VENDOR', txnTypes: [TxnType.VENDOR_EXPENSE], invertSigns: true, kind: 'vendor' as const };
      case 'commission':
        return { entityType: 'VENDOR', txnTypes: [TxnType.COMMISSION], invertSigns: true, kind: 'vendor' as const };
      case 'carrier':
        // Carriers live in the `customers` catalog (D-F). They are credited
        // cước via EXTERNAL_CARRIER_COST on their CUSTOMER ledger; invertSigns
        // mirrors the vendor (credit-positive) convention so aging math lines up.
        return { entityType: 'CUSTOMER', txnTypes: [TxnType.EXTERNAL_CARRIER_COST], invertSigns: true, kind: 'carrier' as const };
      default:
        return { entityType: 'VENDOR', invertSigns: true, kind: 'vendor' as const };
    }
  })();

  const grouped = await fetchLedgerGrouped(
    { entityType: scope.entityType, invertSigns: scope.invertSigns },
    { asOfDate: opts.asOfDate, txnTypes: scope.txnTypes },
  );
  const results = computeEntityResults(grouped, { entityType: scope.entityType, invertSigns: scope.invertSigns });

  let totalOutstanding = 0;
  let overdueSuppliers = 0;

  const items: PayableSummary[] = [];

  if (scope.kind === 'carrier') {
    // Carrier branch: resolve names/phone from `customers` (NOT suppliers).
    //
    // Carrier settlements are NOT auto-recorded against EXTERNAL_CARRIER_COST —
    // trip-lock only posts the credit side. So `outstanding` here reflects
    // trip-lock credits until an ADJUSTMENT (or vendor-payment-style entry)
    // offsets them. Honest by design: this is what we currently owe carriers
    // based on locked trips.
    const carrierIds = results.map(r => r.entityId);
    const carriers = carrierIds.length > 0
      ? await db.select({
          id: s.customers.id,
          name: s.customers.name,
          phone: s.customers.phone,
          contactInfo: s.customers.contactInfo,
        }).from(s.customers).where(inArray(s.customers.id, carrierIds))
      : [];
    const carrierById = new Map(carriers.map(c => [c.id, c]));

    for (const r of results) {
      const carrier = carrierById.get(r.entityId);
      if (!carrier) continue;
      totalOutstanding += r.totalOutstanding;
      if (r.maxOverdueDays > 30) overdueSuppliers++;
      // Build a Supplier-shaped object so the frontend can render uniformly.
      // Fields not present on customers are nulled to satisfy the type.
      const supplierLike = {
        id: carrier.id,
        name: carrier.name,
        contactPerson: null,
        phone: carrier.phone ?? null,
        taxCode: null,
        note: carrier.contactInfo ?? null,
        status: 'ACTIVE',
        linkedCustomerId: null,
        isFuelSupplier: false,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
      } as unknown as Supplier;
      items.push({
        supplier: supplierLike,
        totalOutstanding: r.totalOutstanding,
        aging: r.aging,
        maxOverdueDays: r.maxOverdueDays,
        kind: 'carrier',
      });
    }
  } else {
    const vendorIds = results.map(r => r.entityId);
    const suppliers = vendorIds.length > 0
      ? await db.select().from(s.suppliers)
          .where(sql`${s.suppliers.id} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const supplierById = new Map(suppliers.map(sup => [sup.id, sup]));

    for (const r of results) {
      const supplier = supplierById.get(r.entityId);
      if (!supplier) continue;
      totalOutstanding += r.totalOutstanding;
      if (r.maxOverdueDays > 30) overdueSuppliers++;
      items.push({
        supplier: supplier as unknown as Supplier,
        totalOutstanding: r.totalOutstanding,
        aging: r.aging,
        maxOverdueDays: r.maxOverdueDays,
        kind: 'vendor',
      });
    }
  }

  return { items, totalOutstanding, totalSuppliers: items.length, overdueSuppliers };
}
