import { test } from 'node:test';
import assert from 'node:assert';
import { createTripSchema, updateTripFiguresSchema } from './index';
import { FuelMode, LoadingType } from '../constants';

// Regression guard for the reported unit-price drift ("entered 23,530, it
// became 23,528"). A manually-entered fuel unit price must survive the full
// input → Zod → String() → numeric(10,0) → reload → Number() round-trip
// EXACTLY. VND is integer end-to-end and no layer is permitted to round or
// transform it. If any of these fail, a hidden transform has crept in.
//
// The save path is, by construction:
//   Zod `positiveNumeric` = Number(val)  (shared/src/schemas/index.ts)
//   backend write         = String(val)  (trip-mutations.service.ts)
//   DB column             = numeric(10,0) (integer, db/schema.ts)
//   reload                = Number(val)  (useTripFormDispatch / fuel-voucher)
// None of these can change 23,530 into 23,528 — this test pins that invariant.

const validLegs = [
  { sequence: 1, origin: 'A', destination: 'B', km: 100, loadingType: LoadingType.HANG },
];
const base = { legs: validLegs, fuelMode: FuelMode.AUTO };

// Awkward but REALISTIC prices: the two the user cited, the config default,
// plus upper boundaries. Every value here must survive the round-trip exactly.
const AWKWARD = [23530, 23528, 27650, 100000, 99999];

for (const price of AWKWARD) {
  test(`updateTripFiguresSchema preserves fuelActualUnitPrice=${price} (number input)`, () => {
    const r = updateTripFiguresSchema.safeParse({ ...base, fuelActualUnitPrice: price });
    assert.strictEqual(r.success, true);
    if (r.success) assert.strictEqual(r.data.fuelActualUnitPrice, price);
  });

  test(`updateTripFiguresSchema preserves fuelActualUnitPrice="${price}" (string input)`, () => {
    const r = updateTripFiguresSchema.safeParse({ ...base, fuelActualUnitPrice: String(price) });
    assert.strictEqual(r.success, true);
    if (r.success) assert.strictEqual(r.data.fuelActualUnitPrice, price);
  });
}

// A liters value typed into the price column is now rejected at save time
// (kanban 091026135130: a 225 L pump-out stored at 225₫/L). The coercion
// invariant above is unaffected — this is a business-plausibility floor, not a
// transformation, so every legitimate price still round-trips unchanged.
for (const badPrice of [225, 1, 999]) {
  test(`updateTripFiguresSchema rejects implausible fuelActualUnitPrice=${badPrice}`, () => {
    const r = updateTripFiguresSchema.safeParse({ ...base, fuelActualUnitPrice: badPrice });
    assert.strictEqual(r.success, false, 'liters-like price must be rejected');
  });
}

test('createTripSchema accepts a per-trip actual pump price', () => {
  // EXTERNAL carrier avoids the OWN truckId/driverId requirement so the parse
  // succeeds and we can assert the price field alone.
  const r = createTripSchema.safeParse({
    customerId: 1,
    routeId: 1,
    cargoTypeId: 1,
    containerTypeId: 1,
    departureDate: '2026-01-01',
    carrierType: 'EXTERNAL',
    externalCarrierId: 2,
    externalPlateNumber: '15C-12345',
    fuelActualUnitPrice: 23530,
  });
  assert.strictEqual(r.success, true);
  if (r.success) assert.strictEqual(r.data.fuelActualUnitPrice, 23530);
});

test('full VND round-trip input → String() → Number() is lossless', () => {
  // Mirrors the backend write (String(...)) + reload (Number(...)) path.
  for (const price of AWKWARD) {
    assert.strictEqual(Number(String(price)), price);
  }
});

test('blank fuelActualUnitPrice (null/undefined) is accepted → config fallback', () => {
  assert.strictEqual(
    updateTripFiguresSchema.safeParse({ ...base, fuelActualUnitPrice: null }).success,
    true,
  );
  assert.strictEqual(
    updateTripFiguresSchema.safeParse({ ...base }).success,
    true,
  );
});
