import { useQuery } from '@tanstack/react-query';
import { financialClient, type CustomerAging } from '../api/financialClient';
import { qk } from '../api/keys';
import type { LedgerEntry, CustomerStatement, SupplierStatement } from '@tingting/shared';

export type { CustomerAging };

export function useCustomerAging(search?: string) {
  return useQuery<{ customers: CustomerAging[] }>({
    queryKey: qk.financial.customerAging(search),
    queryFn: () => financialClient.getCustomerAging(search),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCustomerStatement(id: string | undefined) {
  return useQuery<CustomerStatement>({
    queryKey: qk.financial.customerStatement(id),
    enabled: !!id,
    queryFn: () => financialClient.getCustomerStatement(Number(id)),
  });
}

export function useCustomerLedgerEntries() {
  return useQuery<LedgerEntry[]>({
    queryKey: qk.financial.customerLedgerEntries,
    queryFn: () => financialClient.getAllLedgerEntries({ entityType: 'CUSTOMER' }),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePayablesSummary() {
  return useQuery({
    queryKey: qk.financial.payablesSummary,
    queryFn: () => financialClient.getPayablesSummary(),
  });
}

export function useSupplierStatement(supplierId: number | undefined) {
  return useQuery<SupplierStatement>({
    queryKey: qk.financial.supplierStatement(supplierId),
    queryFn: () => financialClient.getSupplierStatement(supplierId!),
    enabled: !!supplierId,
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
