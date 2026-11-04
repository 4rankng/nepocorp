/**
 * Branch cover for the pure gate that skips the unlock/lock ledger pair on
 * COMPLETED-trip saves (NEPO-43). The helper receives the same side objects
 * postTripUnlock (side A) and postTripLock (side B) would consume.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ledgerInputsChanged, allocationLedgerKey } from '../services/trip-ledger-inputs';
import type { LedgerInputSide, LedgerAllocationInput, LedgerFeeInput } from '../services/trip-ledger-inputs';

const side = (over: Partial<LedgerInputSide> = {}): LedgerInputSide => ({
  customerId: 7,
  driverId: 3,
  revenue: '6480000',
  driverSalary: '2000000',
  carrierType: 'OWN',
  externalCarrierId: null,
  externalFreightCost: null,
  fuelSupplierId: 11,
  fuelPriceApplied: '1000',
  fuelActualUnitPrice: null,
  totalFuelCost: '250000',
  ...over,
});

const allocation = (over: Partial<LedgerAllocationInput> = {}): LedgerAllocationInput => ({
  supplierId: 11,
  liters: '250.00',
  unitPrice: null,
  paymentMethod: 'CREDIT',
  ...over,
});

const fee = (over: Partial<LedgerFeeInput> = {}): LedgerFeeInput => ({
  id: 42,
  buyAmount: '100000',
  sellAmount: '150000',
  settlementMethod: 'CASH',
  supplierId: 11,
  forwarderId: null,
  approvalStatus: 'APPROVED',
  ...over,
});

describe('ledgerInputsChanged', () => {
  it('returns false for identical inputs, including string/number scale differences', () => {
    assert.equal(ledgerInputsChanged(side(), side(), [allocation()], [allocation()], []), false);
  });

  it('treats numeric-column strings equal regardless of scale formatting', () => {
    assert.equal(ledgerInputsChanged(
      side({ revenue: '6480000' }),
      side({ revenue: '6480000.00' }),
      [allocation({ liters: '250' })],
      [allocation({ liters: '250.00' })],
      [],
    ), false);
  });

  it('flags every numeric field change', () => {
    const cases: Array<Partial<LedgerInputSide>> = [
      { revenue: '7000000' },
      { driverSalary: '2100000' },
      { externalFreightCost: '500000' },
      { fuelPriceApplied: '1100' },
      { fuelActualUnitPrice: '990' },
      { totalFuelCost: '260000' },
    ];
    for (const over of cases) {
      assert.equal(ledgerInputsChanged(side(), side(over), [allocation()], [allocation()], []), true, JSON.stringify(over));
    }
  });

  it('flags identity field changes', () => {
    const cases: Array<Partial<LedgerInputSide>> = [
      { customerId: 8 },
      { driverId: null },
      { carrierType: 'EXTERNAL' },
      { externalCarrierId: 5 },
      { fuelSupplierId: 12 },
    ];
    for (const over of cases) {
      assert.equal(ledgerInputsChanged(side(), side(over), [allocation()], [allocation()], []), true, JSON.stringify(over));
    }
  });

  it('treats null and 0 numeric values as equal (posting guards fold both to zero)', () => {
    assert.equal(ledgerInputsChanged(
      side({ externalFreightCost: null }),
      side({ externalFreightCost: '0' }),
      [allocation()],
      [allocation()],
      [],
    ), false);
  });

  it('flags fuel allocation changes on every compared component', () => {
    assert.equal(ledgerInputsChanged(side(), side(), [allocation()], [allocation({ supplierId: 12 })], []), true);
    assert.equal(ledgerInputsChanged(side(), side(), [allocation()], [allocation({ liters: '260.00' })], []), true);
    assert.equal(ledgerInputsChanged(side(), side(), [allocation()], [allocation({ unitPrice: '1000' })], []), true);
    assert.equal(ledgerInputsChanged(side(), side(), [allocation()], [allocation({ paymentMethod: 'CASH' })], []), true);
    assert.equal(ledgerInputsChanged(side(), side(), [allocation()], [], []), true);
  });

  it('ignores allocation row order but not duplicated rows', () => {
    assert.equal(ledgerInputsChanged(
      side(),
      side(),
      [allocation({ supplierId: 11 }), allocation({ supplierId: 12 })],
      [allocation({ supplierId: 12 }), allocation({ supplierId: 11 })],
      [],
    ), false);
    assert.equal(ledgerInputsChanged(
      side(),
      side(),
      [allocation()],
      [allocation(), allocation()],
      [],
    ), true);
  });

  it('does not let the shared fee list flip the verdict (fees cancel across the pair)', () => {
    const fees = [fee(), fee({ id: 43, sellAmount: '0' })];
    assert.equal(ledgerInputsChanged(side(), side(), [allocation()], [allocation()], fees), false);
  });

  it('allocationLedgerKey folds null/0 unitPrice and numeric scales', () => {
    assert.equal(allocationLedgerKey(allocation()), allocationLedgerKey(allocation({ liters: '250.00', unitPrice: null })));
    assert.notEqual(allocationLedgerKey(allocation()), allocationLedgerKey(allocation({ unitPrice: '1000' })));
  });
});
