import { test } from 'node:test';
import assert from 'node:assert';
import { updateTripFiguresSchema } from './index';
import { FuelMode, LoadingType } from '../constants';

const validLegs = [
  { sequence: 1, origin: 'A', destination: 'B', km: 100, loadingType: LoadingType.HANG },
];

const validBase = {
  legs: validLegs,
  fuelMode: FuelMode.AUTO,
};

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
