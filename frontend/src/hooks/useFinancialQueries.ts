import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialClient, type CustomerAging, type CustomerAgingResponse } from '../api/financialClient';
import { qk } from '../api/keys';
import type { CustomerStatement, PayablesCategory, SupplierStatement } from '@tingting/shared';

export type { CustomerAging };

export function useCustomerAging(search?: string) {
  return useQuery<CustomerAgingResponse>({
    queryKey: qk.financial.customerAging(search),
    queryFn: () => financialClient.getCustomerAging({ search }),
    staleTime: 2 * 60 * 1000,
    // The key carries the search text, so without this every keystroke blanked
    // `data` and the DebtListPage hero/aging cards re-rendered as 0 ₫ before
    // settling on the new totals (kanban 091026010100). Same remedy as
    // usePayablesSummary for the same symptom class.
    placeholderData: keepPreviousData,
  });
}

export function useCustomerStatement(
  id: string | undefined,
  range?: { dateFrom?: string; dateTo?: string },
  options?: { enabled?: boolean },
) {
  return useQuery<CustomerStatement>({
    queryKey: qk.financial.customerStatement(id, range),
    enabled: !!id && (options?.enabled ?? true),
    queryFn: () => financialClient.getCustomerStatement(Number(id), range),
    // Match the financial siblings. Without staleTime the statement was stale
    // immediately, so every remount/refocus refetched it — and the AR detail
    // page holds two of these queries at once (the profile view plus the
    // period-scoped ledger), which is what made the debt tabs flicker between
    // reloads (kanban 091026235510).
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useCustomerBalances() {
  return useQuery({
    queryKey: qk.financial.customerBalances,
    queryFn: () => financialClient.getEntityBalances('CUSTOMER'),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePayablesSummary(category?: PayablesCategory) {
  return useQuery({
    queryKey: qk.financial.payablesSummary(category),
    queryFn: () => financialClient.getPayablesSummary(category),
    // Match its financial siblings. Without this the summary was stale
    // immediately, so every remount/refocus refetched the aggregate — and the
    // page holds two of these queries at once (the active category plus the
    // unfiltered one carrying the per-category counts), which is what made the
    // chip row flicker between reloads (kanban 091026235510).
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/** Invalidate every cached payables-summary query, regardless of category. */
export function useInvalidatePayablesSummary() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qk.financial.payablesSummaryAll });
}

/** Records a manual commission payable owed to a supplier. */
export function usePostCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { supplierId: number; amount: number; tripId?: number; note?: string }) =>
      financialClient.postCommission(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.financial.payablesSummaryAll });
    },
  });
}

/**
 * Records a driver salary/cash payout (B1 — feedback202606 GAP 4). Posts a
 * DRIVER_PAYOUT debit on the DRIVER ledger, reducing the company's payable
 * balance for that driver. Invalidates salary-list + driver-salary queries so
 * the "Đã thanh toán" / payable figures refresh.
 */
export function usePostDriverPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      driverId: number;
      amount: number;
      method: 'CASH' | 'BANK';
      payoutDate: string;
      note?: string;
      receiptId?: string;
    }) => financialClient.postDriverPayout(data.driverId, {
      amount: data.amount,
      method: data.method,
      payoutDate: data.payoutDate,
      note: data.note,
      receiptId: data.receiptId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.salary.listAll });
      qc.invalidateQueries({ queryKey: qk.salary.driverSalaryAll });
    },
  });
}

export function useSupplierStatement(
  supplierId: number | undefined,
  range?: { dateFrom?: string; dateTo?: string },
  kind: 'vendor' | 'carrier' = 'vendor',
) {
  return useQuery<SupplierStatement>({
    queryKey: kind === 'carrier'
      ? qk.financial.carrierPayableStatement(supplierId, range)
      : qk.financial.supplierStatement(supplierId, range),
    queryFn: () => kind === 'carrier'
      ? financialClient.getCarrierPayableStatement(supplierId!, range)
      : financialClient.getSupplierStatement(supplierId!, range),
    enabled: !!supplierId,
    placeholderData: keepPreviousData,
  });
}

export function useExpenses(filters?: {
  truckId?: number;
  supplierId?: number;
  categoryId?: number;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: qk.financial.expenses(filters),
    queryFn: () => financialClient.getExpenses(filters),
  });
}
