import { db } from '../db';
import * as s from '../db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { computeFifoAging } from '@nepocorp/shared';
import type { PayableSummary } from '@nepocorp/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

type LedgerEntry = { debit: string | null; credit: string | null; timestamp: Date | null };

interface AgingConfig {
  entityType: 'CUSTOMER' | 'VENDOR';
  /** Whether to invert debit/credit before FIFO computation (true for VENDOR) */
  invertSigns: boolean;
}

interface EntityAgingResult {
  entityId: number;
  aging: { current: number; d30: number; d60: number; over90: number };
  openInvoices: Array<{ ts: string; open: number }>;
  totalOutstanding: number;
  maxOverdueDays: number;
}

// ─── Core computation ────────────────────────────────────────────────────────

async function fetchLedgerGrouped(config: AgingConfig): Promise<Map<number, LedgerEntry[]>> {
  const ledgerRows = await db.select({
    entityId: s.ledger.entityId,
    debit: s.ledger.debit,
    credit: s.ledger.credit,
    timestamp: s.ledger.timestamp,
  }).from(s.ledger)
    .where(eq(s.ledger.entityType, config.entityType))
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

// ─── Accounts Receivable (Customer aging) ────────────────────────────────────

export async function getReceivablesSummary() {
  const grouped = await fetchLedgerGrouped({ entityType: 'CUSTOMER', invertSigns: false });
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

export async function getCustomerAgingList() {
  const grouped = await fetchLedgerGrouped({ entityType: 'CUSTOMER', invertSigns: false });
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

  const mapped = results.map(r => ({
    customerId: r.entityId,
    customerName: nameMap.get(r.entityId) || `Khách hàng #${r.entityId}`,
    contactInfo: contactMap.get(r.entityId) || null,
    linkedSupplierId: linkedSupplierMap.get(r.entityId) ?? null,
    totalOutstanding: r.totalOutstanding,
    aging: r.aging,
    maxOverdueDays: r.maxOverdueDays,
  }));

  mapped.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  return { customers: mapped };
}

// ─── Accounts Payable (Vendor aging) ─────────────────────────────────────────

export async function getPayablesSummary() {
  const grouped = await fetchLedgerGrouped({ entityType: 'VENDOR', invertSigns: true });
  const results = computeEntityResults(grouped, { entityType: 'VENDOR', invertSigns: true });

  const vendorIds = results.map(r => r.entityId);
  const suppliers = vendorIds.length > 0
    ? await db.select().from(s.suppliers)
        .where(sql`${s.suppliers.id} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})`)
    : [];
  const supplierById = new Map(suppliers.map(sup => [sup.id, sup]));

  let totalOutstanding = 0;
  let overdueSuppliers = 0;

  const items: PayableSummary[] = [];
  for (const r of results) {
    const supplier = supplierById.get(r.entityId);
    if (!supplier) continue;

    totalOutstanding += r.totalOutstanding;
    if (r.maxOverdueDays > 30) overdueSuppliers++;

    items.push({
      supplier: supplier as any,
      totalOutstanding: r.totalOutstanding,
      aging: r.aging,
      maxOverdueDays: r.maxOverdueDays,
    });
  }

  return { items, totalOutstanding, totalSuppliers: items.length, overdueSuppliers };
}
