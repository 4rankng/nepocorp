import { db } from '../db';
import * as s from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { computeFifoAging } from '@nepocorp/shared';
import type { PayableSummary } from '@nepocorp/shared';

export async function getPayablesSummary() {
  const ledgerRows = await db.select({
    entityId: s.ledger.entityId,
    debit: s.ledger.debit,
    credit: s.ledger.credit,
    timestamp: s.ledger.timestamp,
    balance: s.ledger.balance,
  }).from(s.ledger)
    .where(eq(s.ledger.entityType, 'VENDOR'))
    .orderBy(sql`${s.ledger.id} ASC`);

  const byVendor = new Map<number, Array<{ debit: number; credit: number; timestamp: Date | null }>>();
  const latestBalance = new Map<number, number>();

  for (const row of ledgerRows) {
    const entries = byVendor.get(row.entityId) || [];
    entries.push({
      debit: parseFloat(row.debit || '0'),
      credit: parseFloat(row.credit || '0'),
      timestamp: row.timestamp,
    });
    byVendor.set(row.entityId, entries);
    latestBalance.set(row.entityId, parseFloat(row.balance || '0'));
  }

  const vendorIds = Array.from(byVendor.keys());

  const suppliers = vendorIds.length > 0
    ? await db.select().from(s.suppliers)
        .where(sql`${s.suppliers.id} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  const supplierById = new Map(suppliers.map(sup => [sup.id, sup]));

  const now = new Date();
  const items: PayableSummary[] = [];
  let totalOutstanding = 0;
  let overdueSuppliers = 0;

  for (const [vendorId, entries] of byVendor) {
    const balance = latestBalance.get(vendorId) ?? 0;
    if (balance <= 0) continue;

    const supplier = supplierById.get(vendorId);
    if (!supplier) continue;

    const { aging, openInvoices } = computeFifoAging(
      entries.map(e => ({
        timestamp: e.timestamp ? e.timestamp.toISOString() : null,
        debit: String(e.credit),
        credit: String(e.debit),
      })),
      now,
    );

    let maxOverdueDays = 0;
    for (const inv of openInvoices) {
      if (inv.open <= 0) continue;
      const ageDays = Math.floor((now.getTime() - new Date(inv.ts).getTime()) / 86400000);
      if (ageDays > maxOverdueDays) maxOverdueDays = ageDays;
    }

    totalOutstanding += balance;
    if (maxOverdueDays > 30) overdueSuppliers++;

    items.push({
      supplier: supplier as any,
      totalOutstanding: balance,
      aging,
      maxOverdueDays,
    });
  }

  return {
    items,
    totalOutstanding,
    totalSuppliers: items.length,
    overdueSuppliers,
  };
}
