import { describe, expect, it } from 'vitest';
import { getCalendarMonthRange } from './calendar-month';

describe('getCalendarMonthRange', () => {
  it('does not include the previous payroll-cycle month', () => {
    expect(getCalendarMonthRange(2026, 8)).toEqual({
      start: '2026-08-01',
      end: '2026-08-31',
    });
  });

  it('uses the correct final day in leap February and across a year boundary', () => {
    expect(getCalendarMonthRange(2028, 2)).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    expect(getCalendarMonthRange(2026, 12)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
});
