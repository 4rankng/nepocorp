import { useQuery } from '@tanstack/react-query';
import { financialClient, type CustomerAging } from '../api/financialClient';
import type { LedgerEntry, CustomerStatement, SupplierStatement } from '@nepocorp/shared';

export type { CustomerAging };

export function useCustomerAging(search?: string) {
  return useQuery<{ customers: CustomerAging[] }>({
    queryKey: ['customer-aging', search ?? ''],
    queryFn: () => financialClient.getCustomerAging(search),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCustomerStatement(id: string | undefined) {
  return useQuery<CustomerStatement>({
    queryKey: ['customer-statement', id],
    enabled: !!id,
    queryFn: () => financialClient.getCustomerStatement(Number(id)),
  });
}

export function useCustomerLedgerEntries() {
  return useQuery<LedgerEntry[]>({
    queryKey: ['customer-ledger-entries'],
    queryFn: async () => {
      const res = await financialClient.getLedgerEntries({ entityType: 'CUSTOMER', limit: 2000 });
      return res.items;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function usePayablesSummary() {
  return useQuery({
    queryKey: ['payables-summary'],
    queryFn: () => financialClient.getPayablesSummary(),
  });
}

export function useSupplierStatement(supplierId: number | undefined) {
  return useQuery<SupplierStatement>({
    queryKey: ['supplier-statement', supplierId],
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
    queryKey: ['expenses', filters],
    queryFn: () => financialClient.getExpenses(filters),
  });
}
