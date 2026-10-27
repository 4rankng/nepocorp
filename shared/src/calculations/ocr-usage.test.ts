import { test, describe } from 'node:test';
import assert from 'node:assert';
import { computeOcrUsageStatus, ocrUsagePeriodKey } from './ocr-usage.ts';

describe('computeOcrUsageStatus', () => {
  const settings = { monthlyAllowance: 10000, overagePricePerCall: 200 };

  test('below allowance: everything left is remaining, no overage', () => {
    const s = computeOcrUsageStatus(settings, 1234, '2026-10');
    assert.strictEqual(s.used, 1234);
    assert.strictEqual(s.remaining, 8766);
    assert.strictEqual(s.overageCount, 0);
    assert.strictEqual(s.overageCost, 0);
  });

  test('exactly at allowance: remaining 0, overage still 0', () => {
    const s = computeOcrUsageStatus(settings, 10000, '2026-10');
    assert.strictEqual(s.remaining, 0);
    assert.strictEqual(s.overageCount, 0);
    assert.strictEqual(s.overageCost, 0);
  });

  test('over allowance: every extra request is counted and costed', () => {
    const s = computeOcrUsageStatus(settings, 10050, '2026-10');
    assert.strictEqual(s.remaining, 0);
    assert.strictEqual(s.overageCount, 50);
    assert.strictEqual(s.overageCost, 50 * 200);
  });

  test('settings are live values, not the defaults — other figures work', () => {
    const s = computeOcrUsageStatus({ monthlyAllowance: 5, overagePricePerCall: 12000 }, 8, '2026-11');
    assert.strictEqual(s.remaining, 0);
    assert.strictEqual(s.overageCount, 3);
    assert.strictEqual(s.overageCost, 36000);
  });

  test('zero allowance: every request is overage', () => {
    const s = computeOcrUsageStatus({ monthlyAllowance: 0, overagePricePerCall: 200 }, 7, '2026-10');
    assert.strictEqual(s.overageCount, 7);
    assert.strictEqual(s.overageCost, 1400);
  });

  test('negative/fractional used is floored at 0 (defensive)', () => {
    const s = computeOcrUsageStatus(settings, -3, '2026-10');
    assert.strictEqual(s.used, 0);
    assert.strictEqual(s.remaining, 10000);
  });
});

describe('ocrUsagePeriodKey', () => {
  test('formats YYYY-MM zero-padded, local time', () => {
    assert.strictEqual(ocrUsagePeriodKey(new Date(2026, 0, 9)), '2026-01');
    assert.strictEqual(ocrUsagePeriodKey(new Date(2026, 10, 28)), '2026-11');
  });

  test('changes across a month boundary — the implicit reset', () => {
    assert.notStrictEqual(
      ocrUsagePeriodKey(new Date(2026, 9, 31, 23, 59)),
      ocrUsagePeriodKey(new Date(2026, 10, 1, 0, 0)),
    );
  });
});
