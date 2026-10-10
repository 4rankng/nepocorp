import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { TxnType } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { LedgerService } from '../services/ledger.service';
import { disconnectRedis, invalidateReportCaches } from '../lib/redis';
import { getPayablesSummary } from '../services/aging.service';

/**
 * A payables category chip must report the NET position of that category, from
 * the same FIFO allocation the whole-supplier view uses.
 *
 * The chip used to run its own ledger query filtered by transaction type. An
 * expense edit writes ADJUSTMENT (debit) + VENDOR_EXPENSE (credit) and a delete
 * writes ADJUSTMENT — neither carries the expense's own type — so a cancelled
 * 25.000 ₫ expense kept the chip at 65.000 ₫ while the supplier detail showed
 * 40.000 ₫ (kanban 101026203120, which reported a 30.000 ₫ service fee shown on
 * the chip and 0 ₫ on the detail).
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

async function fixtureSupplier(label: string): Promise<number> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [row] = await db.insert(s.suppliers)
    .values({ name: `QA payables ${label} ${suffix}`, status: 'ACTIVE' })
    .returning();
  createdSupplierIds.push(row.id);
  return row.id;
}

async function fixtureCategory(): Promise<number> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [row] = await db.insert(s.expenseCategories)
    .values({ name: `QA payables category ${suffix}`, isRenewable: false, status: 'ACTIVE' })
    .returning();
  createdCategoryIds.push(row.id);
  return row.id;
}

/**
 * Post one ledger row the way the expense service does: a VENDOR_EXPENSE credit
 * for an UNPAID expense, an ADJUSTMENT debit when it is edited or deleted. The
 * expense row itself is created so the fixture mirrors production data.
 */
async function postExpensePair(
  supplierId: number,
  categoryId: number,
  amount: number,
  cancelled: boolean,
): Promise<void> {
  const [expense] = await db.insert(s.expenses).values({
    expenseDate: '2026-10-10',
    supplierId,
    categoryId,
    amount: String(amount),
    paymentStatus: 'UNPAID',
    note: 'QA payables category fixture',
  }).returning();

  await db.transaction(tx => LedgerService.postEntry(tx, {
    txnType: TxnType.VENDOR_EXPENSE,
    txnId: expense.id,
    entityType: 'VENDOR',
    entityId: supplierId,
    debit: 0,
    credit: amount,
    note: 'QA fixture expense',
  }));

  if (cancelled) {
    await db.transaction(tx => LedgerService.postEntry(tx, {
      txnType: TxnType.ADJUSTMENT,
      txnId: expense.id,
      entityType: 'VENDOR',
      entityId: supplierId,
      debit: amount,
      credit: 0,
      note: 'QA fixture cancellation',
    }));
  }
}

describe('payables category chips report the net position (kanban 101026203120)', () => {
  test('a cancelled expense drops out of its category chip and out of the total', async () => {
    const beforeAll = await getPayablesSummary();
    const beforeAncillary = await getPayablesSummary({ category: 'ancillary' });

    const supplierId = await fixtureSupplier('net');
    const categoryId = await fixtureCategory();
    await postExpensePair(supplierId, categoryId, 40_000, false);   // stays payable
    await postExpensePair(supplierId, categoryId, 25_000, true);    // cancelled by ADJUSTMENT
    await invalidateReportCaches();

    const afterAll = await getPayablesSummary();
    const afterAncillary = await getPayablesSummary({ category: 'ancillary' });

    const chipRow = afterAncillary.items.find(item => item.supplier.id === supplierId);
    assert.ok(chipRow, 'the supplier still owes 40.000 ₫ of service fees');
    assert.strictEqual(chipRow.totalOutstanding, 40_000, 'the chip must be NET — 40.000 ₫, not the gross 65.000 ₫');

    // The chip's buckets describe the chip's own money.
    const { current, d30, d60, over90 } = chipRow.aging;
    assert.strictEqual(current + d30 + d60 + over90, chipRow.totalOutstanding);

    // The whole-supplier view and the chip agree on the fixture's money.
    const allRow = afterAll.items.find(item => item.supplier.id === supplierId);
    assert.strictEqual(allRow?.totalOutstanding, 40_000, 'the unfiltered row nets the same 40.000 ₫');

    // Deltas are immune to whatever else the shared dev DB holds.
    assert.strictEqual(afterAncillary.totalOutstanding - beforeAncillary.totalOutstanding, 40_000);
    assert.strictEqual(afterAll.totalOutstanding - beforeAll.totalOutstanding, 40_000);

    // The chip count on the unfiltered response describes the same projection.
    assert.strictEqual(
      (afterAll.categoryCounts?.ancillary ?? 0) - (beforeAll.categoryCounts?.ancillary ?? 0),
      1,
      'the unfiltered response counts the supplier the chip lists',
    );
    assert.strictEqual(
      afterAncillary.totalSuppliers - beforeAncillary.totalSuppliers,
      1,
    );
  });

  test('a supplier whose only expense was cancelled is absent from the chip but keeps its zero net', async () => {
    const beforeAncillary = await getPayablesSummary({ category: 'ancillary' });

    const supplierId = await fixtureSupplier('cancelled-only');
    const categoryId = await fixtureCategory();
    await postExpensePair(supplierId, categoryId, 30_000, true);
    await invalidateReportCaches();

    const afterAncillary = await getPayablesSummary({ category: 'ancillary' });
    assert.strictEqual(
      afterAncillary.items.find(item => item.supplier.id === supplierId),
      undefined,
      'the cancelled-only supplier carries no payable, so no chip lists it',
    );
    assert.strictEqual(afterAncillary.totalOutstanding - beforeAncillary.totalOutstanding, 0);
  });
});
