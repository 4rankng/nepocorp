import { describe, expect, it } from 'vitest';
import { fromVietnamIso, toVietnamIso } from './date-time';

describe('vehicle schedule Vietnam date/time conversion', () => {
  it('stores a Vietnam datetime-local value as the matching UTC instant', () => {
    expect(toVietnamIso('2026-07-28T08:00')).toBe('2026-07-28T01:00:00.000Z');
  });

  it('restores a UTC instant as a Vietnam datetime-local value', () => {
    expect(fromVietnamIso('2026-07-28T01:05:00.000Z')).toBe('2026-07-28T08:05');
  });

  it('rejects malformed or impossible local values', () => {
    expect(() => toVietnamIso('2026-02-30T08:00')).toThrow('Thời gian không hợp lệ');
    expect(() => toVietnamIso('')).toThrow('Thời gian không hợp lệ');
  });
});
