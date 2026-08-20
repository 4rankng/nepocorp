export interface CalendarMonthRange {
  start: string;
  end: string;
}

/**
 * Return the inclusive Gregorian-calendar bounds for the month selected in
 * the global navigator. Operational and expense views use this rather than a
 * salary cycle, which can legitimately begin in the previous month.
 */
export function getCalendarMonthRange(year: number, month: number): CalendarMonthRange {
  const lastDay = new Date(year, month, 0).getDate();
  const monthPart = String(month).padStart(2, '0');
  return {
    start: `${year}-${monthPart}-01`,
    end: `${year}-${monthPart}-${String(lastDay).padStart(2, '0')}`,
  };
}
