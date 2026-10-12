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

  /**
   * "Loại chi phí" filter (kanban 091026010120). The list is server-paginated,
   * so the type has to ride the query string as `vehicleComponent` — including
   * the 'COMPANY' sentinel the API reads as "no vehicle attached".
   */
  it('sends the Loại chi phí selection as the vehicleComponent parameter', () => {
    for (const vehicleComponent of ['COMPANY', 'TRUCK', 'TRAILER'] as const) {
      const query = buildExpenseListSearchParams({ page: 1, pageSize: 20, vehicleComponent });
      expect(query.get('vehicleComponent')).toBe(vehicleComponent);
    }
  });

  it('omits vehicleComponent once the Loại chi phí filter is cleared', () => {
    const query = buildExpenseListSearchParams({ page: 1, pageSize: 20, vehicleComponent: undefined });
    expect(query.has('vehicleComponent')).toBe(false);
  });
});
