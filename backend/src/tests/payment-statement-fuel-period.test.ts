import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TxnType } from '@tingting/shared';
import { isFuelOutOfPeriod } from '../services/billingDocument.service';

/**
 * A supplier payment statement is labelled with a date range, so the fuel lines
 * inside it have to belong to that range. The ledger books fuel when the trip
 * is locked, which routinely lands in a later month than the trip ran — that
 * put 50 September trips into an "01/10–31/10" statement (kanban 081026232510).
 *
 * Fuel is billed when it is drawn, so the trip's departure date decides the
 * period. Non-fuel accruals keep the posting-date filter, and nothing is ever
 * dropped for want of detail data.
 */
const fuel = (departureDate: string | null) => ({
  txnType: TxnType.FUEL_EXPENSE as string,
  fuelDetails: departureDate ? { departureDate } : null,
});

describe('isFuelOutOfPeriod', () => {
  it('excludes a September trip that happened to post in October', () => {
    assert.equal(isFuelOutOfPeriod(fuel('2026-09-28'), '2026-10-01', '2026-10-31'), true);
  });

  it('keeps an October trip inside the October statement', () => {
    assert.equal(isFuelOutOfPeriod(fuel('2026-10-05'), '2026-10-01', '2026-10-31'), false);
  });

  it('excludes a trip that departs after the period closes', () => {
    assert.equal(isFuelOutOfPeriod(fuel('2026-11-02'), '2026-10-01', '2026-10-31'), true);
  });

  it('treats the range bounds as inclusive', () => {
    assert.equal(isFuelOutOfPeriod(fuel('2026-10-01'), '2026-10-01', '2026-10-31'), false);
    assert.equal(isFuelOutOfPeriod(fuel('2026-10-31'), '2026-10-01', '2026-10-31'), false);
  });

  it('never drops a line because its trip could not be resolved', () => {
    // Unresolvable trip: the posting-date filter already admitted it, and a
    // statement must not silently lose a payable on missing detail data.
    assert.equal(isFuelOutOfPeriod(fuel(null), '2026-10-01', '2026-10-31'), false);
    assert.equal(
      isFuelOutOfPeriod({ txnType: TxnType.FUEL_EXPENSE as string }, '2026-10-01', '2026-10-31'),
      false,
    );
  });

  it('leaves non-fuel accruals on the posting-date filter', () => {
    assert.equal(
      isFuelOutOfPeriod(
        { txnType: TxnType.VENDOR_EXPENSE as string, fuelDetails: { departureDate: '2026-09-01' } },
        '2026-10-01',
        '2026-10-31',
      ),
      false,
    );
  });
});