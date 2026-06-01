import { db } from '../db';
import * as s from '../db/schema';
import { eq, sql, asc, inArray } from 'drizzle-orm';
import { computeFifoAging } from '@nepocorp/shared';

type LedgerEntry = { debit: string | null; credit: string | null; timestamp: Date | null };

async function fetchCustomerLedgerGrouped(): Promise<Map<number, LedgerEntry[]>> {
  const ledgerRows = await db.select({
    entityId: s.ledger.entityId,
    debit: s.ledger.debit,
    credit: s.ledger.credit,
    timestamp: s.ledger.timestamp,
  }).from(s.ledger)
    .where(eq(s.ledger.entityType, 'CUSTOMER'))
    .orderBy(sql`${s.ledger.id} ASC`);

  const byCustomer = new Map<number, LedgerEntry[]>();
  for (const row of ledgerRows) {
    const entries = byCustomer.get(row.entityId) || [];
    entries.push({ debit: row.debit, credit: row.credit, timestamp: row.timestamp });
    byCustomer.set(row.entityId, entries);
  }
  return byCustomer;
}

function computeCustomerAging(entries: LedgerEntry[], now: Date) {
  return computeFifoAging(
    entries.map(e => ({
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp as string | null,
      debit: e.debit ?? '0',
      credit: e.credit ?? '0',
    })),
    now,
  );
}

export async function getReceivablesSummary() {
  const byCustomer = await fetchCustomerLedgerGrouped();

  const now = new Date();
  const DAY_MS = 86400000;

  const buckets = [
    { range: '0-30',  label: 'Trong hạn',      count: 0, amount: 0 },
    { range: '31-60', label: '31-60 ngày',      count: 0, amount: 0 },
    { range: '61-90', label: '61-90 ngày',      count: 0, amount: 0 },
    { range: '90+',   label: 'Trên 90 ngày',     count: 0, amount: 0 },
  ];

  let totalOutstanding = 0;
  let totalCustomers = 0;

  for (const [, entries] of byCustomer) {
    const { aging, openInvoices } = computeCustomerAging(entries, now);

    const customerOutstanding = aging.current + aging.d30 + aging.d60 + aging.over90;
    let customerMaxDays = 0;
    for (const inv of openInvoices) {
      if (inv.open <= 0) continue;
      const ageInDays = Math.floor((now.getTime() - new Date(inv.ts).getTime()) / DAY_MS);
      if (ageInDays > customerMaxDays) customerMaxDays = ageInDays;
    }

    buckets[0].amount += aging.current;
    buckets[1].amount += aging.d30;
    buckets[2].amount += aging.d60;
    buckets[3].amount += aging.over90;

    if (customerOutstanding > 0) {
      totalCustomers++;
      totalOutstanding += customerOutstanding;

      if (customerMaxDays > 90) {
        buckets[3].count++;
      } else if (customerMaxDays > 60) {
        buckets[2].count++;
      } else if (customerMaxDays > 30) {
        buckets[1].count++;
      } else {
        buckets[0].count++;
      }
    }
  }

  return {
    buckets,
    totalOutstanding,
    totalCustomers,
    overdueCustomers: totalCustomers - buckets[0].count,
  };
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
  const byCustomer = await fetchCustomerLedgerGrouped();

  const customerIds = [...byCustomer.keys()];
  const customers = customerIds.length > 0
    ? await db.select({ id: s.customers.id, name: s.customers.name, contactInfo: s.customers.contactInfo })
        .from(s.customers)
        .where(inArray(s.customers.id, customerIds))
    : [];
  const nameMap = new Map(customers.map(c => [c.id, c.name]));
  const contactMap = new Map(customers.map(c => [c.id, c.contactInfo]));

  const now = new Date();
  const result = [];

  for (const [customerId, entries] of byCustomer) {
    const { aging, openInvoices } = computeCustomerAging(entries, now);

    const totalOutstanding = aging.current + aging.d30 + aging.d60 + aging.over90;
    const maxOverdueDays = openInvoices.length > 0
      ? Math.max(...openInvoices.filter(inv => inv.open > 0).map(inv => Math.floor((now.getTime() - new Date(inv.ts).getTime()) / 86400000)), 0)
      : 0;

    if (totalOutstanding > 0) {
      result.push({
        customerId,
        customerName: nameMap.get(customerId) || `Khách hàng #${customerId}`,
        contactInfo: contactMap.get(customerId) || null,
        totalOutstanding,
        aging,
        maxOverdueDays,
      });
    }
  }

  result.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  return { customers: result };
}
