import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { tripExpenseSchema } from '@tingting/shared';

describe('forwarder expense validation', () => {
  test('accepts FORWARDER_ADVANCE when the route injects the authenticated forwarder id', () => {
    const parsed = tripExpenseSchema.safeParse({
      tripId: 1,
      expenseType: 'LIFTING',
      buyAmount: 1_500_000,
      sellAmount: 1_500_000,
      settlementMethod: 'FORWARDER_ADVANCE',
      forwarderId: 42,
      invoiceNumber: '1664',
      invoiceDate: '2026-06-28',
      tripContainerId: 7,
    });

    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.forwarderId, 42);
  });

  test('still rejects FORWARDER_ADVANCE without a forwarder counterparty', () => {
    const parsed = tripExpenseSchema.safeParse({
      tripId: 1,
      expenseType: 'LIFTING',
      buyAmount: 1_500_000,
      sellAmount: 1_500_000,
      settlementMethod: 'FORWARDER_ADVANCE',
    });

    assert.equal(parsed.success, false);
    if (parsed.success) return;
    assert.equal(parsed.error.issues[0]?.path.join('.'), 'forwarderId');
  });
});
