import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { disconnectRedis, invalidateReportCaches } from '../lib/redis';
import { getPayablesSummary } from '../services/aging.service';
import { createExpense, deleteExpense } from '../services/expense.service';
import type { PayablesCategory } from '@tingting/shared';

/**
 * kanban 101026203120 — QA: a 30.000 ₫ service-fee (phí dịch vụ) payable
 * appeared under its category tab but disappeared on the 'Tất cả' tab.
 *
 * The data layer must never let that happen: the category tabs are projections
 * of the SAME FIFO allocation the unfiltered view reports, so every row a
 * category tab lists MUST appear on 'Tất cả' with at least that amount — and
 * the QA repro row (an UNPAID company expense posted the way the expense
 * service posts it) must show on BOTH its tab and 'Tất cả', then drop from both
 * when the expense is deleted.
 */

const createdSupplierIds: number[] = [];
const createdCategoryIds: number[] = [];

after(async () => {
  if (createdSupplierIds.length > 0) {
    await db.delete(s.ledger).where(and(
      eq(s.ledger.entityType, 'VENDOR'),
      inArray(s.ledger.entityId, createdSupplierIds),
    ));
    await db.delete(s.expenses).where(inArray(s.expenses.supplierId, createdSupplierIds));
    await db.delete(s.suppliers).where(inArray(s.suppliers.id, createdSupplierIds));
  }
  if (createdCategoryIds.length > 0) {
    await db.delete(s.expenseCategories).where(inArray(s.expenseCategories.id, createdCategoryIds));
  }
  await invalidateReportCaches();
  await disconnectRedis();
  await client.end();
});

async function fixtureSupplier(): Promise<number> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [row] = await db.insert(s.suppliers)
    .values({ name: `QA payables superset ${suffix}`, status: 'ACTIVE' })
    .returning();
  createdSupplierIds.push(row.id);
  return row.id;
}

async function fixtureCategory(): Promise<number> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [row] = await db.insert(s.expenseCategories)
    .values({ name: `QA payables superset category ${suffix}`, isRenewable: false, status: 'ACTIVE' })
    .returning();
  createdCategoryIds.push(row.id);
  return row.id;
}

const NON_CARRIER_CATEGORIES: PayablesCategory[] = ['fuel', 'ancillary', 'commission'];

describe("the payables 'Tất cả' tab is a superset of every category tab (kanban 101026203120)", () => {
  test("the 30.000 ₫ service-fee expense shows on 'Tất cả' and on its 'Phí dịch vụ' tab", async () => {
    const supplierId = await fixtureSupplier();
    const categoryId = await fixtureCategory();
    // The exact QA repro flow: an UNPAID company expense (chi phí công ty)
    // posted through the service the POST /api/expenses route calls.
    await db.transaction(tx => createExpense(tx, {
      expenseDate: '2026-10-12',
      supplierId,
      categoryId,
      amount: '30000',
      paymentStatus: 'UNPAID',
      note: 'QA 101026203120 reproduce',
    }));
    await invalidateReportCaches();

    const all = await getPayablesSummary();
    const ancillary = await getPayablesSummary({ category: 'ancillary' });

    const allRow = all.items.find(item => item.supplier.id === supplierId);
    const tabRow = ancillary.items.find(item => item.supplier.id === supplierId);
    assert.ok(allRow, "the 30.000 ₫ debt must appear on 'Tất cả'");
    assert.ok(tabRow, "the 30.000 ₫ debt must appear on its 'Phí dịch vụ' tab");
    assert.strictEqual(allRow.totalOutstanding, 30_000, "'Tất cả' reports the same 30.000 ₫ debt");
    assert.strictEqual(tabRow.totalOutstanding, 30_000, "the category tab reports the same 30.000 ₫ debt");

    // Deleting the expense reverses the payable — it must drop from BOTH tabs,
    // never from one of them.
    const [expense] = await db.select({ id: s.expenses.id })
      .from(s.expenses)
      .where(eq(s.expenses.supplierId, supplierId))
      .limit(1);
    await db.transaction(tx => deleteExpense(tx, expense.id));
    await invalidateReportCaches();

    const allAfter = await getPayablesSummary();
    const ancillaryAfter = await getPayablesSummary({ category: 'ancillary' });
    assert.ok(!allAfter.items.some(item => item.supplier.id === supplierId),
      "the deleted debt drops out of 'Tất cả'");
    assert.ok(!ancillaryAfter.items.some(item => item.supplier.id === supplierId),
      "the deleted debt drops out of the category tab too");
  });

  test('every row a category tab lists also appears on the all tab', async () => {
    const [all, fuel, ancillary, commission, carrier] = await Promise.all([
      getPayablesSummary(),
      getPayablesSummary({ category: 'fuel' }),
      getPayablesSummary({ category: 'ancillary' }),
      getPayablesSummary({ category: 'commission' }),
      getPayablesSummary({ category: 'carrier' }),
    ]);

    const byCategory = { fuel, ancillary, commission, carrier } as const;
    for (const category of NON_CARRIER_CATEGORIES) {
      for (const item of byCategory[category].items) {
        const match = all.items.find(row =>
          row.kind === item.kind && row.supplier.id === item.supplier.id);
        assert.ok(match,
          `supplier ${item.supplier.id} on the '${category}' tab must also appear on 'Tất cả'`);
        assert.ok(match.totalOutstanding >= item.totalOutstanding,
          `'Tất cả' must carry at least the '${category}' amount for supplier ${item.supplier.id}`);
      }
      assert.strictEqual(all.categoryCounts?.[category], byCategory[category].totalSuppliers,
        `the '${category}' chip count must match what the tab lists`);
    }
    for (const item of carrier.items) {
      const match = all.items.find(row =>
        row.kind === 'carrier' && row.supplier.id === item.supplier.id);
      assert.ok(match,
        `carrier ${item.supplier.id} on the 'carrier' tab must also appear on 'Tất cả'`);
      assert.ok(match.totalOutstanding >= item.totalOutstanding,
        `'Tất cả' must carry at least the carrier amount for carrier ${item.supplier.id}`);
    }
    assert.strictEqual(all.categoryCounts?.carrier, carrier.totalSuppliers,
      "the 'carrier' chip count must match what the tab lists");
  });
});
