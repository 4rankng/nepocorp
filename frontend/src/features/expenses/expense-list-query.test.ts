import { describe, expect, it } from 'vitest';
import { buildExpenseListSearchParams } from './expense-list-query';

describe('buildExpenseListSearchParams', () => {
  it('uses the expense API date-boundary parameter names', () => {
    const query = buildExpenseListSearchParams({
      page: 1,
      pageSize: 20,
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });

    expect(query.get('fromDate')).toBe('2026-07-01');
    expect(query.get('toDate')).toBe('2026-07-31');
    expect(query.has('dateFrom')).toBe(false);
    expect(query.has('dateTo')).toBe(false);
  });
});
