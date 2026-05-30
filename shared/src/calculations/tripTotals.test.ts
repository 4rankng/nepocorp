import { test } from 'node:test';
import assert from 'node:assert';
import { round2dp } from './round';
import { computeTripTotals, ComputeTripTotalsInput } from './tripTotals';

const defaultBaseInput: ComputeTripTotalsInput = {
  legs: [
    { sequence: 1, km: 120, loadingType: 'HANG' },
    { sequence: 2, km: 120, loadingType: 'VO' }
  ],
  fuelMode: 'AUTO',
  fuelLitersOverride: null,
  fuelSupplementLiters: 0,
  fuelLoadedNorm: 43.0,
  fuelEmptyNorm: 25.0,
  fuelPerTripSupplement: 3.0,
  fuelUnitPrice: 20000,
  isMountainRoute: false,
  mountainFixedAllowance: null,
  roadAllowanceBase: 1500000,
  tollsDiscount: 100000,
  tollsAddition: 50000,
  tollsStations: 2,
  tollPerStation: 55000,
  hasReturnCargo: true,
  returnCargoBonus: 300000,
  revenue: 4000000,
  driverSalary: 800000
};

test('round2dp boundary correctness', () => {
  // Test banker's rounding representation issues
  assert.strictEqual(round2dp(1.005), 1.01);
  assert.strictEqual(round2dp(1.004), 1.00);
  assert.strictEqual(round2dp(0), 0.0);
  assert.strictEqual(round2dp(-1.005), -1.01);
});

test('AUTO standard mode calculation', () => {
  const result = computeTripTotals(defaultBaseInput);

  // Leg 1: 120 * 43.0 / 100 = 51.6 L
  // Leg 2: 120 * 25.0 / 100 = 30.0 L
  // Sum = 81.6 L
  // Total = 81.6 + 3 (per-trip) + 0 (supplement) = 84.6 L
  assert.strictEqual(result.totalFuelLiters, 84.6);
  assert.strictEqual(result.legCalculations.length, 2);
  assert.strictEqual(result.legCalculations[0].calculatedLiters, 51.6);
  assert.strictEqual(result.legCalculations[1].calculatedLiters, 30.0);

  // fuelCost = 84.6 * 20000 = 1692000 VNĐ
  assert.strictEqual(result.totalFuelCost, 1692000);

  // roadAllowance = 1500000 - 100000 + 50000 - (2 * 55000) + 300000 = 1640000 VNĐ
  assert.strictEqual(result.totalRoadAllowance, 1640000);

  // totalCost = 1692000 + 1640000 + 800000 = 4132000 VNĐ
  assert.strictEqual(result.totalCost, 4132000);

  // grossProfit = 4000000 - 4132000 = -132000 VNĐ
  assert.strictEqual(result.grossProfit, -132000);
});

test('AUTO mountain mode allowance calculation', () => {
  const input = {
    ...defaultBaseInput,
    isMountainRoute: true,
    mountainFixedAllowance: 240
  };

  const result = computeTripTotals(input);

  // totalLiters = 240 + 0 (supplement) = 240 L (per-trip supplement NOT added)
  assert.strictEqual(result.totalFuelLiters, 240.0);
  assert.strictEqual(result.legCalculations[0].calculatedLiters, 0);
  assert.strictEqual(result.legCalculations[1].calculatedLiters, 0);
  assert.strictEqual(result.totalFuelCost, 240 * 20000);
});

test('AUTO mountain fallback calculation when allowance is null', () => {
  const input = {
    ...defaultBaseInput,
    isMountainRoute: true,
    mountainFixedAllowance: null
  };

  const result = computeTripTotals(input);

  // Falls back to standard per-leg AUTO
  assert.strictEqual(result.totalFuelLiters, 84.6);
  assert.strictEqual(result.legCalculations[0].calculatedLiters, 51.6);
});

test('FLAT_RATE mode calculation', () => {
  const input = {
    ...defaultBaseInput,
    fuelMode: 'FLAT_RATE' as const,
    fuelLitersOverride: 150
  };

  const result = computeTripTotals(input);

  // totalLiters = 150 + 0 = 150 L (per-trip supplement NOT added)
  assert.strictEqual(result.totalFuelLiters, 150.0);
  assert.strictEqual(result.legCalculations[0].calculatedLiters, 0);
});

test('FLAT_RATE mode takes precedence over mountain route', () => {
  const input = {
    ...defaultBaseInput,
    fuelMode: 'FLAT_RATE' as const,
    fuelLitersOverride: 150,
    isMountainRoute: true,
    mountainFixedAllowance: 240
  };

  const result = computeTripTotals(input);

  // totalLiters = 150 (FLAT_RATE wins over mountain 240)
  assert.strictEqual(result.totalFuelLiters, 150.0);
});

test('supplement added in all modes', () => {
  const input = {
    ...defaultBaseInput,
    fuelSupplementLiters: 15.5
  };

  const result = computeTripTotals(input);

  // AUTO standard: 84.6 + 15.5 = 100.1 L
  assert.strictEqual(result.totalFuelLiters, 100.1);
});

test('negative road allowance clamped to 0', () => {
  const input = {
    ...defaultBaseInput,
    tollsDiscount: 2000000 // excessive discount
  };

  const result = computeTripTotals(input);

  // 1500000 - 2000000 + 50000 - 110000 + 300000 = -260000 -> clamped to 0
  assert.strictEqual(result.totalRoadAllowance, 0);
});
