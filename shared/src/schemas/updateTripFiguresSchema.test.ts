import { test } from 'node:test';
import assert from 'node:assert';
import { updateTripFiguresSchema } from './index';
import { FuelMode, LoadingType } from '../constants';

const validLegs = [
  { sequence: 1, origin: 'A', destination: 'B', km: 100, loading_type: LoadingType.HANG },
];

const validBase = {
  legs: validLegs,
  fuel_mode: FuelMode.AUTO,
};

test('rejects fuelSupplementLiters > 0 with empty reason', () => {
  const data = {
    ...validBase,
    fuel_supplement_liters: 5,
    fuel_supplement_reason: '',
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const reasonIssue = result.error.issues.find(i => i.path.includes('fuel_supplement_reason'));
    assert.ok(reasonIssue, 'should have an issue on fuel_supplement_reason');
    assert.ok(reasonIssue!.message.includes('bổ sung'), `message should mention supplement: ${reasonIssue!.message}`);
  }
});

test('rejects fuelSupplementLiters > 0 with missing reason', () => {
  const data = {
    ...validBase,
    fuel_supplement_liters: 3,
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, false);
  if (!result.success) {
    const reasonIssue = result.error.issues.find(i => i.path.includes('fuel_supplement_reason'));
    assert.ok(reasonIssue, 'should have an issue on fuel_supplement_reason');
  }
});

test('accepts fuelSupplementLiters > 0 with provided reason', () => {
  const data = {
    ...validBase,
    fuel_supplement_liters: 5,
    fuel_supplement_reason: 'Chạy máy lạnh kéo dài',
  };

  const result = updateTripFiguresSchema.safeParse(data);
  assert.strictEqual(result.success, true);
});

test('accepts fuelSupplementLiters = 0 without reason', () => {
  const data = {
    ...validBase,
    fuel_supplement_liters: 0,
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
