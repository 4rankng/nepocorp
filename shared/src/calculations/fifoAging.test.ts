import { test, describe } from 'node:test';
import assert from 'node:assert';
import { bucketOpenInvoices, computeFifoAging, maxOpenInvoiceAgeDays } from './fifoAging.ts';
import type { FifoAgingInput } from './fifoAging.ts';

// Helper: create a date N days before the reference date
function daysAgo(days: number, ref: Date): string {
  return new Date(ref.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('computeFifoAging refs — the per-type payables split (kanban 101026203120)', () => {
  const ref = new Date('2026-06-01T00:00:00Z');

  test('each open invoice keeps the ref of the debit that produced it', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(45, ref), debit: '500000', credit: '0', ref: 'VENDOR_EXPENSE' },
      { timestamp: daysAgo(10, ref), debit: '300000', credit: '0', ref: 'FUEL_EXPENSE' },
    ];
    const { openInvoices } = computeFifoAging(entries, ref);

    assert.deepStrictEqual(openInvoices.map(i => i.ref), ['VENDOR_EXPENSE', 'FUEL_EXPENSE']);
  });

  test('a credit reduces the open invoice it is allocated to, keeping that invoice ref', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(45, ref), debit: '500000', credit: '0', ref: 'VENDOR_EXPENSE' },
      { timestamp: daysAgo(5, ref), debit: '0', credit: '500000', ref: 'ADJUSTMENT' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, ref);

    // The ADJUSTMENT paid the expense off: nothing open, nothing aged.
    assert.strictEqual(openInvoices[0].open, 0);
    assert.strictEqual(aging.current + aging.d30 + aging.d60 + aging.over90, 0);
  });

  test('omits ref entirely when the caller supplies none (existing callers unchanged)', () => {
    const { openInvoices } = computeFifoAging([{ timestamp: daysAgo(3, ref), debit: '1000', credit: '0' }], ref);
    assert.deepStrictEqual(openInvoices, [{ ts: daysAgo(3, ref), open: 1000 }]);
  });
});

describe('bucketOpenInvoices / maxOpenInvoiceAgeDays', () => {
  const ref = new Date('2026-06-01T00:00:00Z');

  test('buckets by age with the same boundaries as computeFifoAging', () => {
    const buckets = bucketOpenInvoices([
      { ts: daysAgo(10, ref), open: 1_000 },
      { ts: daysAgo(45, ref), open: 2_000 },
      { ts: daysAgo(75, ref), open: 3_000 },
      { ts: daysAgo(120, ref), open: 4_000 },
      { ts: daysAgo(45, ref), open: 0 },
    ], ref);

    assert.deepStrictEqual(buckets, { current: 1_000, d30: 2_000, d60: 3_000, over90: 4_000 });
  });

  test('reports the oldest still-open age and ignores settled invoices', () => {
    assert.strictEqual(maxOpenInvoiceAgeDays([
      { ts: daysAgo(45, ref), open: 0 },
      { ts: daysAgo(20, ref), open: 500 },
    ], ref), 20);
    assert.strictEqual(maxOpenInvoiceAgeDays([], ref), 0);
  });
});

describe('computeFifoAging', () => {
  const ref = new Date('2026-06-01T00:00:00Z');

  test('simple single debit aging into correct bucket', () => {
    // One unpaid invoice from 15 days ago → current bucket
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(15, ref), debit: '1000000', credit: '0' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, ref);

    assert.strictEqual(aging.current, 1000000);
    assert.strictEqual(aging.d30, 0);
    assert.strictEqual(aging.d60, 0);
    assert.strictEqual(aging.over90, 0);
    assert.strictEqual(openInvoices.length, 1);
    assert.strictEqual(openInvoices[0].open, 1000000);
  });

  test('multiple debits with credits applied FIFO', () => {
    // Two invoices: 500k at 45 days, 300k at 10 days
    // One payment of 400k → applied to oldest first (45-day invoice reduced to 100k)
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(45, ref), debit: '500000', credit: '0' },
      { timestamp: daysAgo(10, ref), debit: '300000', credit: '0' },
      { timestamp: daysAgo(5, ref), debit: '0', credit: '400000' },
    ];
    const { aging } = computeFifoAging(entries, ref);

    // 45-day invoice: 500k - 400k (FIFO applied) = 100k remaining → d30 bucket
    assert.strictEqual(aging.d30, 100000);
    // 10-day invoice: 300k untouched → current bucket
    assert.strictEqual(aging.current, 300000);
    assert.strictEqual(aging.d60, 0);
    assert.strictEqual(aging.over90, 0);
  });

  test('unapplied credit carry-forward', () => {
    // Credit comes before any debit → should carry forward
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(5, ref), debit: '0', credit: '200000' },
      { timestamp: daysAgo(3, ref), debit: '500000', credit: '0' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, ref);

    // 200k credit applied to 500k debit → 300k remaining in current bucket
    assert.strictEqual(aging.current, 300000);
    assert.strictEqual(openInvoices.length, 1);
    assert.strictEqual(openInvoices[0].open, 300000);
  });

  test('edge case: zero amounts', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(10, ref), debit: '0', credit: '0' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, ref);

    assert.strictEqual(aging.current, 0);
    assert.strictEqual(aging.d30, 0);
    assert.strictEqual(aging.d60, 0);
    assert.strictEqual(aging.over90, 0);
    assert.strictEqual(openInvoices.length, 0);
  });

  test('edge case: all debits fully paid (zero balances)', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(20, ref), debit: '500000', credit: '0' },
      { timestamp: daysAgo(10, ref), debit: '0', credit: '500000' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, ref);

    assert.strictEqual(aging.current, 0);
    assert.strictEqual(aging.d30, 0);
    assert.strictEqual(aging.d60, 0);
    assert.strictEqual(aging.over90, 0);
    // Invoice exists but open is 0, so filtered from aging
    assert.strictEqual(openInvoices.length, 1);
    assert.strictEqual(openInvoices[0].open, 0);
  });

  test('edge case: credit exceeds debits (negative balance clamped)', () => {
    // 300k debit, 500k credit → remaining credit carries forward, no open invoices
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(20, ref), debit: '300000', credit: '0' },
      { timestamp: daysAgo(5, ref), debit: '0', credit: '500000' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, ref);

    // The 300k invoice is fully paid by the 500k credit
    assert.strictEqual(aging.current, 0);
    assert.strictEqual(openInvoices.length, 1);
    assert.strictEqual(openInvoices[0].open, 0);
  });

  test('bucket boundaries: 30/60/90 days', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(15, ref), debit: '100000', credit: '0' },   // current (≤30)
      { timestamp: daysAgo(45, ref), debit: '200000', credit: '0' },   // d30 (>30, ≤60)
      { timestamp: daysAgo(75, ref), debit: '300000', credit: '0' },   // d60 (>60, ≤90)
      { timestamp: daysAgo(120, ref), debit: '400000', credit: '0' },  // over90 (>90)
    ];
    const { aging } = computeFifoAging(entries, ref);

    assert.strictEqual(aging.current, 100000);
    assert.strictEqual(aging.d30, 200000);
    assert.strictEqual(aging.d60, 300000);
    assert.strictEqual(aging.over90, 400000);
  });

  test('bucket boundary exactly 30 days → current bucket', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(30, ref), debit: '100000', credit: '0' },
    ];
    const { aging } = computeFifoAging(entries, ref);
    assert.strictEqual(aging.current, 100000);
    assert.strictEqual(aging.d30, 0);
  });

  test('bucket boundary exactly 60 days → d30 bucket', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(60, ref), debit: '100000', credit: '0' },
    ];
    const { aging } = computeFifoAging(entries, ref);
    assert.strictEqual(aging.d30, 100000);
    assert.strictEqual(aging.d60, 0);
  });

  test('bucket boundary exactly 90 days → d60 bucket', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(90, ref), debit: '100000', credit: '0' },
    ];
    const { aging } = computeFifoAging(entries, ref);
    assert.strictEqual(aging.d60, 100000);
    assert.strictEqual(aging.over90, 0);
  });

  test('bucket boundary 91 days → over90 bucket', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(91, ref), debit: '100000', credit: '0' },
    ];
    const { aging } = computeFifoAging(entries, ref);
    assert.strictEqual(aging.over90, 100000);
  });

  test('missing timestamps fall back to reference date', () => {
    // Entry with null timestamp should land in current bucket (age = 0 days)
    const entries: FifoAgingInput[] = [
      { timestamp: null, debit: '500000', credit: '0' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, ref);

    assert.strictEqual(aging.current, 500000);
    assert.strictEqual(openInvoices.length, 1);
    // The ts should be the reference date's ISO string
    assert.strictEqual(openInvoices[0].ts, ref.toISOString());
  });

  test('entries sorted chronologically regardless of input order', () => {
    // Input order: out of chronological order, function should sort by timestamp
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(10, ref), debit: '0', credit: '200000' },
      { timestamp: daysAgo(45, ref), debit: '500000', credit: '0' },
      { timestamp: daysAgo(5, ref), debit: '300000', credit: '0' },
    ];
    const { aging } = computeFifoAging(entries, ref);

    // Sorted: day 45 debit 500k, day 10 credit 200k, day 5 debit 300k
    // 500k debit (45 days ago) → 200k credit (10 days ago) applied → 300k open at age 45 → d30 bucket
    // 300k debit (5 days ago) → untouched → current bucket
    assert.strictEqual(aging.d30, 300000);
    assert.strictEqual(aging.current, 300000);
  });

  test('numeric debit/credit values (not strings)', () => {
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(15, ref), debit: 1000000, credit: 0 },
    ];
    const { aging } = computeFifoAging(entries, ref);
    assert.strictEqual(aging.current, 1000000);
  });

  test('empty entries array returns zero aging', () => {
    const { aging, openInvoices } = computeFifoAging([], ref);
    assert.strictEqual(aging.current, 0);
    assert.strictEqual(aging.d30, 0);
    assert.strictEqual(aging.d60, 0);
    assert.strictEqual(aging.over90, 0);
    assert.strictEqual(openInvoices.length, 0);
  });

  test('partial payment splits single invoice correctly', () => {
    // Single 1M invoice at 45 days, 400k payment, 600k remaining
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(45, ref), debit: '1000000', credit: '0' },
      { timestamp: daysAgo(5, ref), debit: '0', credit: '400000' },
    ];
    const { aging, openInvoices } = computeFifoAging(entries, ref);

    assert.strictEqual(aging.d30, 600000);
    assert.strictEqual(openInvoices.length, 1);
    assert.strictEqual(openInvoices[0].open, 600000);
  });

  test('unapplied credit applied to later debits', () => {
    // 200k credit first (no debits to apply to), then 500k debit
    // 200k credit carries forward and is applied to the 500k debit
    const entries: FifoAgingInput[] = [
      { timestamp: daysAgo(20, ref), debit: '0', credit: '200000' },
      { timestamp: daysAgo(10, ref), debit: '500000', credit: '0' },
      { timestamp: daysAgo(5, ref), debit: '0', credit: '100000' },
    ];
    const { aging } = computeFifoAging(entries, ref);

    // 200k unapplied credit + 500k debit → 300k remaining, then 100k credit applied → 200k
    assert.strictEqual(aging.current, 200000);
  });
});
