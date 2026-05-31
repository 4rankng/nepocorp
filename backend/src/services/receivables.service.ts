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

type LedgerRow = { entityType: string; entityId: number; debit: string | null; balance: string; createdAt: Date | null };

/**
 * Find the top overdue customer from a set of ledger rows.
 * Returns null if no customer has an outstanding balance.
 */
export async function resolveTopOverdue(ledgerRows: LedgerRow[]) {
  const lastByCustomer = new Map<number, { balance: number; date: string }>();
  const oldestUnpaidByCustomer = new Map<number, string>();
  for (const row of ledgerRows) {
    const entityId = row.entityId;
    const balance = parseFloat(row.balance || '0');
    const date = row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : '';
    const prev = lastByCustomer.get(entityId);
    if (!prev || date > prev.date) lastByCustomer.set(entityId, { balance, date });
    const debit = parseFloat(row.debit || '0');
    if (debit > 0 && date) {
      const oldest = oldestUnpaidByCustomer.get(entityId);
      if (!oldest || date < oldest) oldestUnpaidByCustomer.set(entityId, date);
    }
  }

  let topOverdueCustomer: { name: string; balance: number; days: number } | null = null;
  if (lastByCustomer.size > 0) {
    const debtorIds = [...lastByCustomer.entries()].filter(([, v]) => v.balance > 0).map(([id]) => id);
    if (debtorIds.length > 0) {
      const customers = await db.select({ id: s.customers.id, name: s.customers.name })
        .from(s.customers).where(sql`${s.customers.id} IN (${sql.join(debtorIds.map(id => sql`${id}`), sql`, `)})`);
      const nameById = new Map(customers.map(c => [c.id, c.name]));
      for (const [id, { balance }] of lastByCustomer) {
        if (balance <= 0) continue;
        if (!topOverdueCustomer || balance > topOverdueCustomer.balance) {
          const oldestDate = oldestUnpaidByCustomer.get(id);
          const days = oldestDate ? Math.max(0, Math.floor((Date.now() - new Date(oldestDate).getTime()) / 86400000)) : 0;
          topOverdueCustomer = { name: nameById.get(id) || 'Khách hàng không xác định', balance, days };
        }
      }
    }
  }
  return topOverdueCustomer;
}
