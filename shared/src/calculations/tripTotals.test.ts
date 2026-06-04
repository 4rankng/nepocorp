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
  tollsAddition: 1740000,
  tollsStations: 2,
  tollPerStation: 55000,
  hasReturnCargo: true,
  returnCargoBonus: 300000,
  revenue: 4000000,
  driverSalary: 800000,
  twoPointDeliveryBonus: 0,
  vehicleShiftAllowance: 0,
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

test('0 legs (empty legs array)', () => {
  const input = {
    ...defaultBaseInput,
    legs: [],
    fuelPerTripSupplement: 0,
  };

  const result = computeTripTotals(input);

  // No legs → 0 leg liters, no per-trip supplement → only user supplement
  assert.strictEqual(result.totalFuelLiters, 0);
  assert.strictEqual(result.legCalculations.length, 0);
  assert.strictEqual(result.totalFuelCost, 0);
  // roadAllowance unchanged by legs
  assert.strictEqual(result.totalRoadAllowance, 1640000);
  assert.strictEqual(result.grossProfit, 4000000 - 0 - 1640000 - 800000);
});

test('0 revenue produces negative grossProfit (full cost)', () => {
  const input = {
    ...defaultBaseInput,
    revenue: 0,
  };

  const result = computeTripTotals(input);

  assert.strictEqual(result.totalFuelLiters, 84.6);
  assert.strictEqual(result.totalFuelCost, 1692000);
  assert.strictEqual(result.totalRoadAllowance, 1640000);
  assert.strictEqual(result.totalCost, 4132000);
  // grossProfit = 0 - 4132000 = -4132000
  assert.strictEqual(result.grossProfit, -4132000);
});

test('round2dp x.xx5 boundary within computeTripTotals', () => {
  // Use km that produces x.xx5 boundary: 11.5 km * 43.0 / 100 = 4.945 → round2dp = 4.95
  const input = {
    ...defaultBaseInput,
    legs: [{ sequence: 1, km: 11.5, loadingType: 'HANG' as const }],
    fuelPerTripSupplement: 0,
    fuelSupplementLiters: 0,
    tollsDiscount: 0,
    tollsAddition: 0,
    tollsStations: 0,
    hasReturnCargo: false,
    driverSalary: 0,
    revenue: 0,
    roadAllowanceBase: 0,
  };

  const result = computeTripTotals(input);

  // 11.5 * 43 / 100 = 4.945 → round2dp = 4.95
  assert.strictEqual(result.legCalculations[0].calculatedLiters, 4.95);
  assert.strictEqual(result.totalFuelLiters, 4.95);
  // fuelCost = 4.95 * 20000 = 99000
  assert.strictEqual(result.totalFuelCost, 99000);
});

test('twoPointDeliveryBonus and vehicleShiftAllowance included in totalCost', () => {
  const input = {
    ...defaultBaseInput,
    twoPointDeliveryBonus: 200000,
    vehicleShiftAllowance: 350000,
  };

  const result = computeTripTotals(input);

  // totalCost = 1692000 (fuel) + 1640000 (road) + 800000 (salary) + 200000 + 350000 = 4682000
  assert.strictEqual(result.totalCost, 4682000);
  assert.strictEqual(result.grossProfit, 4000000 - 4682000);
});

// ── A4 extension tests ──────────────────────────────────────────────────────

const BASE_A4 = {
  legs: [{ sequence: 1, km: 100, loadingType: 'HANG' as const }],
  fuelMode: 'AUTO' as const,
  fuelLitersOverride: null,
  fuelSupplementLiters: 0,
  fuelLoadedNorm: 43,
  fuelEmptyNorm: 25,
  fuelPerTripSupplement: 3,
  fuelUnitPrice: 20000,
  isMountainRoute: false,
  mountainFixedAllowance: null,
  roadAllowanceBase: 500000,
  tollsDiscount: 0,
  tollsAddition: 0,
  tollsStations: 0,
  tollPerStation: 55000,
  hasReturnCargo: false,
  returnCargoBonus: 300000,
  revenue: 10800000,   // 10,000,000 ex-VAT at 8%
  driverSalary: 800000,
  twoPointDeliveryBonus: 0,
  vehicleShiftAllowance: 0,
  roadAllowanceOverride: null,
};

test('backward-compat: vatRate=0 (default) — freightExVat equals revenue', () => {
  const r = computeTripTotals(BASE_A4);
  assert.strictEqual(r.freightExVat, BASE_A4.revenue);
  assert.strictEqual(r.serviceMargin, 0);
  assert.strictEqual(r.externalMargin, 0);
  // existing AUTO fuel calculation: 100km HANG @ 43L/100 = 43L + 3 supplement = 46L
  assert.strictEqual(r.totalFuelLiters, 46);
  assert.strictEqual(r.totalFuelCost, 920000);
});

test('OWN trip with 8% VAT: freightExVat = revenue / 1.08', () => {
  const r = computeTripTotals({ ...BASE_A4, vatRate: 0.08 });
  assert.strictEqual(r.freightExVat, 10000000);  // 10800000 / 1.08
});

test('OWN trip with ancillary fees: serviceMargin included in grossProfit', () => {
  const r = computeTripTotals({
    ...BASE_A4,
    vatRate: 0.08,
    ancillaryFees: [
      { buyAmount: 540000, sellAmount: 540000, vatRate: 0.08 },   // at-cost: sell ex-VAT 500000, buy incl-VAT 540000 → margin -40000
      { buyAmount: 540000, sellAmount: 1080000, vatRate: 0.08 },  // markup: sell ex-VAT 1000000, buy incl-VAT 540000 → margin 460000
    ],
  });
  // Per spec §4.6.1 & §4.7: sell ex-VAT, buy incl-VAT (asymmetric VAT)
  // buy incl-VAT: 540000 + 540000 = 1080000; sell ex-vat: 500000 + 1000000 = 1500000
  assert.strictEqual(r.totalServiceBuy, 1080000);
  assert.strictEqual(r.totalServiceSell, 1500000);
  assert.strictEqual(r.serviceMargin, 420000);  // 1500000 - 1080000
});

test('EXTERNAL trip: totalCost = externalFreightCost, margin computed ex-VAT', () => {
  const r = computeTripTotals({
    ...BASE_A4,
    vatRate: 0.08,
    carrierType: 'EXTERNAL',
    externalFreightCost: 5400000,  // 5000000 ex-VAT
    revenue: 10800000,             // 10000000 ex-VAT
  });
  assert.strictEqual(r.externalFreightExVat, 5000000);
  assert.strictEqual(r.externalMargin, 5000000);   // 10000000 - 5000000
  assert.strictEqual(r.totalCost, 5400000);        // incl-VAT stored for AP
  assert.strictEqual(r.grossProfit, 5000000);      // externalMargin + serviceMargin(0)
  assert.strictEqual(r.totalFuelCost, 920000);     // still computed but not in totalCost
});

test('EXTERNAL trip with service fees: grossProfit includes serviceMargin', () => {
  const r = computeTripTotals({
    ...BASE_A4,
    vatRate: 0.08,
    carrierType: 'EXTERNAL',
    externalFreightCost: 5400000,
    ancillaryFees: [{ buyAmount: 540000, sellAmount: 1080000, vatRate: 0.08 }],
  });
  // sell ex-VAT: 1000000, buy incl-VAT: 540000 → serviceMargin = 460000
  assert.strictEqual(r.serviceMargin, 460000);
  assert.strictEqual(r.grossProfit, 5460000);  // 5000000 + 460000
});

test('auto-calculated road allowance when tollsAddition is 0', () => {
  const r = computeTripTotals({
    ...BASE_A4,
    tollsAddition: 0,
    tollsDiscount: 100000,
    tollsStations: 2,
    tollPerStation: 50000,
    hasReturnCargo: true,
    returnCargoBonus: 300000,
  });
  // base = 500000, discount = 100000, addition = 0
  // stations cost = 2 * 50000 = 100000
  // return bonus = 300000
  // tongTienDiDuong = 500000 - 100000 + 300000 = 700000
  // totalRoadAllowance = tongTienDiDuong - discount = 700000 - 100000 = 600000
  assert.strictEqual(r.totalRoadAllowance, 600000);
});
