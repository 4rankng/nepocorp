import { describe, it, expect } from 'vitest';
import { AGING_BUCKET_LABELS, computeAgingTotals } from './payableListUtils';
import { AGING_RANGES } from './payableDetailUtils';
import type { PayableSummary, Supplier } from '@tingting/shared';

function supplier(id: number, name: string): Supplier {
  return {
    id, name, shortName: null, contactPerson: null, phone: null, taxCode: null,
    note: null, status: 'ACTIVE', linkedCustomerId: null, isFuelSupplier: false,
    createdAt: '', updatedAt: '', deletedAt: null,
  };
}

function row(
  id: number,
  totalOutstanding: number,
  aging: { current: number; d30: number; d60: number; over90: number },
): PayableSummary {
  return { supplier: supplier(id, `NCC ${id}`), totalOutstanding, aging, maxOverdueDays: 5, kind: 'vendor' };
}

/**
 * Regression: kanban 091026010100 — the aging buckets and the hero total must
 * describe the same money on every render. The old sum skipped any bucket
 * whose value was <= 0, so a supplier carrying a credit in one bucket and a
 * debit in another made the four buckets add up to less than the card total.
 */
describe('computeAgingTotals invariants', () => {
  it('sums every bucket value so the buckets add up to the reported total', () => {
    const payables: PayableSummary[] = [
      row(1, 30_000_000, { current: 40_000_000, d30: 0, d60: 0, over90: -10_000_000 }),
      row(2, 20_000_000, { current: 20_000_000, d30: 0, d60: 0, over90: 0 }),
    ];

    const totals = computeAgingTotals(payables, '50000000', 2, 1);

    const bucketSum = totals.current + totals.d30 + totals.d60 + totals.over90;
    expect(bucketSum).toBe(totals.total);
    // The negative bucket must be carried, not silently dropped.
    expect(totals.over90).toBe(-10_000_000);
    expect(totals.current).toBe(60_000_000);
  });

  it('keeps counts on positive buckets only (a credit is not an active bucket)', () => {
    const payables: PayableSummary[] = [
      row(1, 30_000_000, { current: 40_000_000, d30: 0, d60: 0, over90: -10_000_000 }),
    ];

    const totals = computeAgingTotals(payables, '30000000', 1, 0);

    expect(totals.currentCount).toBe(1);
    expect(totals.over90Count).toBe(0);
  });

  it('takes the total from the server aggregate, not from row sums', () => {
    const totals = computeAgingTotals([row(1, 30_000_000, { current: 30_000_000, d30: 0, d60: 0, over90: 0 })], '50000000', 1, 0);
    expect(totals.total).toBe(50_000_000);
  });

  it('falls back to zero when the API has not answered yet', () => {
    const totals = computeAgingTotals([], undefined, 0, 0);
    expect(totals.total).toBe(0);
  });

});

/**
 * Regression: kanban 101026102020 — one bucket was spelled two ways on one
 * screen: the aging cards said "0–30 ngày" (en dash) beside table columns that
 * said "0-30 ngày" (hyphen), and "Trên 90 ngày" sat next to ">90 ngày".
 */
describe('AGING_BUCKET_LABELS', () => {
  it('names every bucket with an en dash, and the last one with the word "Trên"', () => {
    expect([...AGING_BUCKET_LABELS]).toEqual([
      '0–30 ngày',
      '31–60 ngày',
      '61–90 ngày',
      'Trên 90 ngày',
    ]);
    for (const label of AGING_BUCKET_LABELS) {
      expect(label).not.toContain('-'); // ASCII hyphen-minus never spells a range here
      expect(label).not.toContain('>');
    }
    expect(AGING_BUCKET_LABELS.slice(0, 3).every(l => l.includes('–'))).toBe(true);
  });

  it('is the same list the detail page renders, uppercased', () => {
    expect(AGING_RANGES.map(r => r.label)).toEqual(AGING_BUCKET_LABELS.map(l => l.toUpperCase()));
  });
});
