import { describe, expect, it } from 'vitest';
import { isToday } from './utils';

describe('isToday', () => {
  const today = new Date('2026-07-28T10:00:00.000Z');

  it('matches the transport business date without shifting ISO date-only values', () => {
    expect(isToday('2026-07-28', today)).toBe(true);
    expect(isToday('2026-07-28T00:00:00.000Z', today)).toBe(true);
  });

  it('leaves past and future transport plans unhighlighted', () => {
    expect(isToday('2026-07-27', today)).toBe(false);
    expect(isToday('2026-07-29', today)).toBe(false);
  });

  it('uses the Vietnam business date when the device date has already advanced', () => {
    const afterMidnightInSingapore = new Date('2026-07-28T16:30:00.000Z');

    expect(isToday('2026-07-28', afterMidnightInSingapore)).toBe(true);
    expect(isToday('2026-07-29', afterMidnightInSingapore)).toBe(false);
  });

  it('rejects missing or invalid dates', () => {
    expect(isToday('', today)).toBe(false);
    expect(isToday('not-a-date', today)).toBe(false);
  });
});
