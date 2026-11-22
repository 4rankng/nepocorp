/**
 * NEPO-62 pure-unit covers for the lot cost register + monthly SOA:
 * USD→VND integer derivation (money law), the truck-transfer section's
 * operational-row guard (dầu / lương / vé cầu đường / cước thuê xe ngoài —
 * and ONLY for EXTERNAL-carrier trips in the hire case), fee-group
 * aggregation across linked trips, and the SOA month enumeration + query
 * schema. DB-backed paths (register read, SOA rollup) are covered by
 * integration usage — these pins are the deterministic invariants.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveCostAmountVnd,
  truckTransferRows,
} from '../services/shipment.service';
import { soaMonthList } from '../services/statement.service';
import { customerSoaQuerySchema, FeeGroup, FEE_GROUP_LABELS, TruckTransferCostKey } from '@tingting/shared';

describe('deriveCostAmountVnd (NEPO-62 money law)', () => {
  it('USD row derives the VND integer: round(fx × rate)', () => {
    assert.equal(deriveCostAmountVnd({ currency: 'USD', fxAmount: 1250.75, exchangeRate: 25345 }), '31700259');
    assert.equal(deriveCostAmountVnd({ currency: 'USD', fxAmount: 100, exchangeRate: 25000 }), '2500000');
  });

  it('VND row passes the integer amount through untouched', () => {
    assert.equal(deriveCostAmountVnd({ currency: 'VND', amount: 1234567 }), '1234567');
    assert.equal(deriveCostAmountVnd({ amount: 999 }), '999');
  });

  it('USD row without fx amount or rate is rejected', () => {
    assert.throws(() => deriveCostAmountVnd({ currency: 'USD', fxAmount: null, exchangeRate: 25345 }));
    assert.throws(() => deriveCostAmountVnd({ currency: 'USD', fxAmount: 100, exchangeRate: null }));
  });
});

describe('truckTransferRows (NEPO-62 chi phí chuyển xe)', () => {
  const trip = (over: {
    tripCode?: string | null;
    totalFuelCost?: string | null;
    driverSalary?: string | null;
    tollCost?: string | null;
    externalFreightCost?: string | null;
    carrierType?: string;
  }) => ({
    tripCode: over.tripCode ?? 'TRP-1',
    totalFuelCost: over.totalFuelCost ?? null,
    driverSalary: over.driverSalary ?? null,
    tollCost: over.tollCost ?? null,
    externalFreightCost: over.externalFreightCost ?? null,
    carrierType: over.carrierType ?? 'OWN',
  });

  it('aggregates each operational key across linked trips', () => {
    const { rows, total } = truckTransferRows([
      trip({ tripCode: 'TRP-1', totalFuelCost: '450000', driverSalary: '1200000', tollCost: '45000' }),
      trip({ tripCode: 'TRP-2', totalFuelCost: '550000', driverSalary: '1200000', tollCost: '45000' }),
    ]);
    assert.deepEqual(rows.map((row) => row.key), [
      TruckTransferCostKey.FUEL,
      TruckTransferCostKey.DRIVER_SALARY,
      TruckTransferCostKey.TOLLS,
    ]);
    assert.equal(rows.find((row) => row.key === TruckTransferCostKey.FUEL)?.amount, 1000000);
    assert.equal(rows.find((row) => row.key === TruckTransferCostKey.TOLLS)?.tripCode, 'TRP-1, TRP-2');
    assert.equal(total, 1000000 + 2400000 + 90000);
  });

  it('cước thuê xe ngoài only books on EXTERNAL-carrier trips', () => {
    const externalOnly = truckTransferRows([
      trip({ tripCode: 'TRP-1', externalFreightCost: '3000000', carrierType: 'OWN' }),
      trip({ tripCode: 'TRP-2', externalFreightCost: '2500000', carrierType: 'EXTERNAL' }),
    ]);
    assert.deepEqual(externalOnly.rows.map((row) => row.key), [TruckTransferCostKey.EXTERNAL_FREIGHT]);
    assert.equal(externalOnly.rows[0]?.amount, 2500000);
    assert.equal(externalOnly.rows[0]?.tripCode, 'TRP-2');
  });

  it('drops zero/absent figures — no empty rows', () => {
    const { rows, total } = truckTransferRows([
      trip({ tripCode: 'TRP-1', totalFuelCost: '0', driverSalary: null, tollCost: null }),
    ]);
    assert.equal(rows.length, 0);
    assert.equal(total, 0);
  });
});

describe('SOA month enumeration (NEPO-62 bảng công nợ tháng)', () => {
  it('lists every month of the window, inclusive', () => {
    assert.deepEqual(soaMonthList('2026-10-01', '2026-12-31'), ['2026-10', '2026-11', '2026-12']);
    assert.deepEqual(soaMonthList('2026-11-05', '2027-02-20'), ['2026-11', '2026-12', '2027-01', '2027-02']);
    assert.deepEqual(soaMonthList('2026-03-01', '2026-03-31'), ['2026-03']);
  });
});

describe('customerSoaQuerySchema', () => {
  it('accepts a sane from<=to window', () => {
    assert.ok(customerSoaQuerySchema.safeParse({ from: '2026-01-01', to: '2026-03-31' }).success);
  });
  it('rejects inverted or malformed windows', () => {
    assert.equal(customerSoaQuerySchema.safeParse({ from: '2026-03-01', to: '2026-01-01' }).success, false);
    assert.equal(customerSoaQuerySchema.safeParse({ from: '01/2026', to: '03/2026' }).success, false);
  });
});

describe('fee group label coverage', () => {
  it('every FeeGroup member has a Vietnamese label (MCT26026/TMT26004 row names)', () => {
    for (const group of Object.values(FeeGroup)) {
      assert.ok(
        FEE_GROUP_LABELS[group] && FEE_GROUP_LABELS[group].length > 0,
        `missing label for ${group}`,
      );
    }
  });
});
