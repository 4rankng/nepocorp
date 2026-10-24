import { useQuery } from '@tanstack/react-query';
import type { ExpenseWithRefs, PaginatedResponse } from '@tingting/shared';
import { api } from '../../lib/api';
import { FINANCIAL } from '@tingting/shared';
import { hasColumnData } from '../../design-system';
import { buildExpenseListSearchParams, type ExpenseListQuery } from './expense-list-query';
import { qk } from '../../api/keys';

/**
 * Full-filtered-data aggregation for /expenses (NEPO-17).
 *
 * The KPI cards used to reduce `expenseData.items` — the CURRENT PAGE only —
 * so with more than one page of data "Tổng chi phí / Chưa thanh toán / Đã
 * thanh toán" were silently wrong (audit 24/10, DeepSeek consult: bug số
 * liệu). The API exposes no totals metadata and the contract must not change,
 * so the totals walk every filtered page once per filter combination
 * (pageSize=100, bounded like the CSV/print export) and stays keyed on the
 * FILTERS ONLY — never on `page` — so paging cannot change the KPIs.
 */

/** Exports and the KPI walk share the same bounded request budget. */
export const EXPENSE_WALK_TIMEOUT_MS = 30_000;
const WALK_PAGE_SIZE = 100;
/** Hard cap: 500 pages × 100 rows. A malformed total must not loop forever. */
const MAX_WALK_PAGES = 500;

export function buildExpenseWalkQuery(query: ExpenseListQuery): string {
  return buildExpenseListSearchParams({ ...query, page: 1, pageSize: WALK_PAGE_SIZE }).toString();
}

/**
 * Reject rather than hang forever — shared by the export buttons and the KPI
 * walk (kanban 101026003010: an unsettled request left the page disabled).
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} quá ${Math.round(ms / 1000)} giây — vui lòng thử lại.`)), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Every expense matching the filters, not just the visible page. */
export async function fetchAllFilteredExpenses(query: ExpenseListQuery): Promise<ExpenseWithRefs[]> {
  const first = await withTimeout(
    api.get<PaginatedResponse<ExpenseWithRefs>>(`${FINANCIAL.EXPENSES}?${buildExpenseWalkQuery(query)}`),
    EXPENSE_WALK_TIMEOUT_MS,
    'Tải danh sách chi phí',
  );
  // `pageSize` must stay positive: a malformed response would make
  // `Array.from({ length: Infinity })` allocate forever and freeze the tab.
  const pageSize = first.pageSize > 0 ? first.pageSize : WALK_PAGE_SIZE;
  const pageCount = Math.ceil((first.total || 0) / pageSize);
  const remaining = await withTimeout(
    Promise.all(
      Array.from({ length: Math.max(0, Math.min(pageCount, MAX_WALK_PAGES) - 1) }, (_, index) =>
        api.get<PaginatedResponse<ExpenseWithRefs>>(
          `${FINANCIAL.EXPENSES}?${buildExpenseListSearchParams({ ...query, page: index + 2, pageSize: WALK_PAGE_SIZE })}`,
        )),
    ),
    EXPENSE_WALK_TIMEOUT_MS,
    'Tải danh sách chi phí',
  );
  return [first, ...remaining].flatMap(response => response.items);
}

export interface ExpenseSummary {
  totalAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  paidAmount: number;
  /** Xe column has ≥1 real plate in the filtered set (NEPO-17 AC3). */
  hasVehicleData: boolean;
  /** Thành phần column has ≥1 real component in the filtered set. */
  hasComponentData: boolean;
}

const expenseComponentLabel = (component: ExpenseWithRefs['vehicleComponent']): string =>
  component === 'TRAILER' ? 'Rơ-moóc' : component === 'TRUCK' ? 'Đầu kéo' : '—';

const expenseVehicleValue = (e: ExpenseWithRefs): string =>
  (e.vehicleComponent === 'TRAILER' ? e.trailer?.licensePlate : e.truck?.licensePlate) ?? '—';

export function summarizeExpenses(items: ExpenseWithRefs[]): ExpenseSummary {
  const summary: ExpenseSummary = {
    totalAmount: 0, unpaidCount: 0, unpaidAmount: 0, paidCount: 0, paidAmount: 0,
    // Column visibility rides on the same walk so the KPIs and the columns
    // always describe the same dataset; the placeholder mapping mirrors the
    // table's cell renderer ('—' fallbacks) via the shared AutoHideColumn
    // predicate.
    hasVehicleData: hasColumnData(items.map(expenseVehicleValue)),
    hasComponentData: hasColumnData(items.map(e => expenseComponentLabel(e.vehicleComponent))),
  };
  for (const e of items) {
    const amount = parseFloat(String(e.amount)) || 0;
    summary.totalAmount += amount;
    if (e.paymentStatus === 'UNPAID') {
      summary.unpaidCount += 1;
      summary.unpaidAmount += amount;
    } else if (e.paymentStatus === 'PAID') {
      summary.paidCount += 1;
      summary.paidAmount += amount;
    }
  }
  return summary;
}

export function useExpensesSummary(query: ExpenseListQuery) {
  return useQuery({
    // Keyed on filters ONLY — no `page` — so changing page never refetches
    // (and can never change) the KPI figures.
    queryKey: qk.financial.expenseSummary({
      supplierId: query.supplierId ?? null,
      categoryId: query.categoryId ?? null,
      truckId: query.truckId ?? null,
      vehicleComponent: query.vehicleComponent ?? null,
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
    }),
    queryFn: async () => summarizeExpenses(await fetchAllFilteredExpenses(query)),
    staleTime: 30 * 1000,
  });
}
