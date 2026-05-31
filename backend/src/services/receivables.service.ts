/**
 * Receivables service — FIFO aging, overdue resolution.
 * Extracted from reporting.service.ts to isolate the receivables domain.
 */
import { db } from '../db';
import * as s from '../db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Aggregate customer outstanding balances bucketed by aging.
 * Uses FIFO allocation — payments are applied against the oldest open debits first —
 * so bucket totals reconcile to total outstanding.
 * Handles prepayments by carrying forward unapplied credits against future debits.
 */
export async function getReceivablesSummary() {
  // Fetch all CUSTOMER ledger entries, oldest first (for FIFO)
  const ledgerRows = await db.select({
    entityId: s.ledger.entityId,
    debit: s.ledger.debit,
    credit: s.ledger.credit,
    timestamp: s.ledger.timestamp,
  }).from(s.ledger)
    .where(eq(s.ledger.entityType, 'CUSTOMER'))
    .orderBy(sql`${s.ledger.id} ASC`);

  // Group by customer
  const byCustomer = new Map<number, Array<{ debit: number; credit: number; timestamp: Date | null }>>();
  for (const row of ledgerRows) {
    const entries = byCustomer.get(row.entityId) || [];
    entries.push({
      debit: parseFloat(row.debit || '0'),
      credit: parseFloat(row.credit || '0'),
      timestamp: row.timestamp,
    });
    byCustomer.set(row.entityId, entries);
  }

  const now = Date.now();
  const DAY_MS = 86400000;

  // Aging buckets: { range, label, count of customers, total amount }
  const buckets = [
    { range: '0-30',  label: 'Trong hạn',      count: 0, amount: 0 },
    { range: '31-60', label: '31-60 ngày',      count: 0, amount: 0 },
    { range: '61-90', label: '61-90 ngày',      count: 0, amount: 0 },
    { range: '90+',   label: 'Trên 90 ngày',     count: 0, amount: 0 },
  ];

  let totalOutstanding = 0;
  let totalCustomers = 0;

  for (const [, entries] of byCustomer) {
    // FIFO: walk chronological entries, maintain open invoices list.
    // Track unapplied credits (prepayments) to offset against future debits.
    const openInvoices: Array<{ epochMs: number; open: number }> = [];
    let unappliedCredit = 0;

    for (const entry of entries) {
      if (entry.debit > 0 && entry.timestamp) {
        let debitRemaining = entry.debit;
        // Offset against any carried-forward prepayment first
        if (unappliedCredit > 0) {
          const apply = Math.min(unappliedCredit, debitRemaining);
          unappliedCredit -= apply;
          debitRemaining -= apply;
        }
        if (debitRemaining > 0) {
          openInvoices.push({
            epochMs: entry.timestamp.getTime(),
            open: debitRemaining,
          });
        }
      }
      if (entry.credit > 0) {
        // Apply payment FIFO against oldest open invoices
        let remaining = entry.credit;
        for (const inv of openInvoices) {
          if (remaining <= 0) break;
          if (inv.open <= 0) continue;
          const apply = Math.min(inv.open, remaining);
          inv.open -= apply;
          remaining -= apply;
        }
        // Carry forward any unapplied credit (e.g. prepayments)
        if (remaining > 0) {
          unappliedCredit += remaining;
        }
      }
    }

    // Compute outstanding and bucket
    let customerOutstanding = 0;
    let customerMaxDays = 0;

    for (const inv of openInvoices) {
      if (inv.open <= 0) continue;
      customerOutstanding += inv.open;
      const ageInDays = Math.floor((now - inv.epochMs) / DAY_MS);
      if (ageInDays > customerMaxDays) customerMaxDays = ageInDays;

      if (ageInDays <= 30) {
        buckets[0].amount += inv.open;
      } else if (ageInDays <= 60) {
        buckets[1].amount += inv.open;
      } else if (ageInDays <= 90) {
        buckets[2].amount += inv.open;
      } else {
        buckets[3].amount += inv.open;
      }
    }

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

/**
 * Deepened query to fetch the top overdue customer directly from the database.
 * Avoids loading the entire ledger history into memory.
 */
export async function getTopOverdueCustomer(): Promise<{ name: string; balance: number; days: number } | null> {
  // 1. Get current balance for each customer (newest ledger entry)
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

  // 2. Get the oldest debit transaction date for each debtor
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

  // 3. Fetch customer names
  const customers = await db.select({ id: s.customers.id, name: s.customers.name })
    .from(s.customers)
    .where(sql`${s.customers.id} IN (${sql.join(debtorIds.map(id => sql`${id}`), sql`, `)})`);

  const nameById = new Map(customers.map(c => [c.id, c.name]));

  // 4. Find the customer with the highest outstanding balance
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

