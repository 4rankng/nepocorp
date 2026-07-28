import { test } from 'node:test';
import assert from 'node:assert';
import {
  bulkUpdateTripFiguresSchema,
  createTripSchema,
  reassignTripSchema,
  updateTripFiguresSchema,
} from './index';
import { FuelMode, LoadingType } from '../constants';

const validLegs = [
  { sequence: 1, origin: 'A', destination: 'B', km: 100, loadingType: LoadingType.HANG },
];

const validBase = {
  legs: validLegs,
  fuelMode: FuelMode.AUTO,
};

const validExternalCreate = {
  customerId: 1,
  routeId: 1,
  cargoTypeId: 1,
  departureDate: '2026-07-28',
  containerTypeId: 1,
  carrierType: 'EXTERNAL' as const,
  externalCarrierId: 2,
};

test('external trip creation requires a non-empty plate number', () => {
  const missing = createTripSchema.safeParse(validExternalCreate);
  assert.strictEqual(missing.success, false);
  if (!missing.success) {
    assert.ok(missing.error.issues.some(issue => issue.path.includes('externalPlateNumber')));
  }

  const blank = createTripSchema.safeParse({
    ...validExternalCreate,
    externalPlateNumber: '   ',
  });
  assert.strictEqual(blank.success, false);
  if (!blank.success) {
    assert.ok(blank.error.issues.some(issue => issue.path.includes('externalPlateNumber')));
  }
});

test('external trip creation accepts an empty driver name and phone when the plate is present', () => {
  const result = createTripSchema.safeParse({
    ...validExternalCreate,
    externalPlateNumber: '15C-12345',
  });

  assert.strictEqual(result.success, true);
});

test('external trip updates require a plate but keep driver name and phone optional', () => {
  const missingPlate = updateTripFiguresSchema.safeParse({
    ...validBase,
    carrierType: 'EXTERNAL',
    externalPlateNumber: null,
  });
  assert.strictEqual(missingPlate.success, false);
  if (!missingPlate.success) {
    assert.ok(missingPlate.error.issues.some(issue => issue.path.includes('externalPlateNumber')));
  }

  const withoutDriverContact = updateTripFiguresSchema.safeParse({
    ...validBase,
    carrierType: 'EXTERNAL',
    externalPlateNumber: '15C-12345',
  });
  assert.strictEqual(withoutDriverContact.success, true);
});

test('external trip updates reject company fuel suppliers and allocations', () => {
  for (const fuelFields of [
    { fuelSupplierId: 10 },
    {
      fuelAllocations: [
        { supplierId: 10, liters: 50, paymentMethod: 'CREDIT' as const },
      ],
    },
  ]) {
    const result = updateTripFiguresSchema.safeParse({
      ...validBase,
      carrierType: 'EXTERNAL',
      externalPlateNumber: '15C-12345',
      ...fuelFields,
    });
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some(issue =>
        issue.path.includes('fuelSupplierId') || issue.path.includes('fuelAllocations')
      ));
    }
  }
});

test('external trip reassignment validates plate type, length and presence', () => {
  for (const externalPlateNumber of [undefined, null, '   ', 123, '1'.repeat(21)]) {
    const result = reassignTripSchema.safeParse({
      carrierType: 'EXTERNAL',
      externalPlateNumber,
    });
    assert.strictEqual(result.success, false);
  }

  assert.strictEqual(reassignTripSchema.safeParse({
    carrierType: 'EXTERNAL',
    externalPlateNumber: '15C-12345',
  }).success, true);
});

test('rejects fuelSupplementLiters > 0 with empty reason', () => {
  const data = {
    ...validBase,
    fuelSupplementLiters: 5,
    fuelSupplementReason: '',
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const reasonIssue = result.error.issues.find(i => i.path.includes('fuelSupplementReason'));
    assert.ok(reasonIssue, 'should have an issue on fuelSupplementReason');
    assert.ok(reasonIssue!.message.includes('bổ sung'), `message should mention supplement: ${reasonIssue!.message}`);
  }
});

test('rejects fuelSupplementLiters > 0 with missing reason', () => {
  const data = {
    ...validBase,
    fuelSupplementLiters: 3,
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const reasonIssue = result.error.issues.find(i => i.path.includes('fuelSupplementReason'));
    assert.ok(reasonIssue, 'should have an issue on fuelSupplementReason');
  }
});

test('accepts fuelSupplementLiters > 0 with provided reason', () => {
  const data = {
    ...validBase,
    fuelSupplementLiters: 5,
    fuelSupplementReason: 'Chạy máy lạnh kéo dài',
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, true);
});

test('accepts fuelSupplementLiters = 0 without reason', () => {
  const data = {
    ...validBase,
    fuelSupplementLiters: 0,
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, true);
});

test('accepts fuelSupplementLiters undefined without reason', () => {
  const data = {
    ...validBase,
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, true);
});

test('accepts split fuel allocations with credit and outside cash station rows', () => {
  const result = updateTripFiguresSchema.safeParse({
    ...validBase,
    fuelAllocations: [
      { supplierId: 10, liters: 200, paymentMethod: 'CREDIT' },
      { supplierId: 11, liters: 40, paymentMethod: 'CREDIT' },
      { supplierId: null, liters: 10, paymentMethod: 'CASH' },
    ],
  });
  assert.strictEqual(result.success, true);
});

test('rejects a credit fuel row without a supplier', () => {
  const result = updateTripFiguresSchema.safeParse({
    ...validBase,
    fuelAllocations: [
      { supplierId: null, liters: 50, paymentMethod: 'CREDIT' },
    ],
  });
  assert.strictEqual(result.success, false);
});

test('rejects duplicate fuel allocation counterparties', () => {
  const result = updateTripFiguresSchema.safeParse({
    ...validBase,
    fuelAllocations: [
      { supplierId: 10, liters: 100, paymentMethod: 'CREDIT' },
      { supplierId: 10, liters: 150, paymentMethod: 'CREDIT' },
    ],
  });
  assert.strictEqual(result.success, false);
});

test('rejects fuel allocation liters beyond hundredth precision', () => {
  const result = updateTripFiguresSchema.safeParse({
    ...validBase,
    fuelAllocations: [
      { supplierId: 10, liters: 12.345, paymentMethod: 'CREDIT' },
    ],
  });
  assert.strictEqual(result.success, false);
});

test('accepts null values for external carrier fields', () => {
  const data = {
    ...validBase,
    externalCarrierId: null,
    externalFreightCost: null,
    externalPlateNumber: null,
    externalDriverName: null,
    externalDriverPhone: null,
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, true);
});

test('bulkUpdateTripFiguresSchema accepts per-row malformed figures for row-level handling', () => {
  const result = bulkUpdateTripFiguresSchema.safeParse({
    updates: [
      { tripId: 1, mode: 'actuals', figures: { legs: [], fuelMode: 'AUTO' } },
      { tripId: 2, mode: 'pre-departure', figures: validBase },
    ],
  });

  assert.strictEqual(result.success, true);
});

test('bulkUpdateTripFiguresSchema rejects empty batches', () => {
  const result = bulkUpdateTripFiguresSchema.safeParse({ updates: [] });
  assert.strictEqual(result.success, false);
});
