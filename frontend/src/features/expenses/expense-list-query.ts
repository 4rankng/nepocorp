export interface ExpenseListQuery {
  page: number;
  pageSize: number;
  supplierId?: number;
  categoryId?: number;
  truckId?: number;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * The expense API names its date boundary parameters `fromDate` and `toDate`.
 * Keep that transport detail in one place so a page-level calendar selection
 * cannot silently become an unfiltered list.
 */
export function buildExpenseListSearchParams(params: ExpenseListQuery): URLSearchParams {
  const qs = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.supplierId) qs.set('supplierId', String(params.supplierId));
  if (params.categoryId) qs.set('categoryId', String(params.categoryId));
  if (params.truckId) qs.set('truckId', String(params.truckId));
  if (params.dateFrom) qs.set('fromDate', params.dateFrom);
  if (params.dateTo) qs.set('toDate', params.dateTo);
  return qs;
}
