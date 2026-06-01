import { api } from '../lib/api';
import { FINANCIAL, REPORTS } from '@nepocorp/shared';
import type {
  LedgerEntry,
  CustomerStatement,
  PayableSummary,
  SupplierStatement,
  ExpenseWithRefs,
  PaginatedResponse,
} from '@nepocorp/shared';

export interface CustomerAging {
  customerId: number;
  customerName: string;
  contactInfo: string | null;
  totalOutstanding: number;
  aging: { current: number; d30: number; d60: number; over90: number };
  maxOverdueDays: number;
}

export const financialClient = {
  getLedgerEntries: async (params?: { entityType?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entityType) qs.set('entityType', params.entityType);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<PaginatedResponse<LedgerEntry>>(`${FINANCIAL.LEDGER}${query}`);
  },

  getCustomerStatement: async (id: number) => {
    return api.get<CustomerStatement>(FINANCIAL.CUSTOMER_STATEMENT(id));
  },

  getSupplierStatement: async (id: number) => {
    return api.get<SupplierStatement>(FINANCIAL.SUPPLIER_STATEMENT(id));
  },

  getPenalties: async (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<PaginatedResponse<any>>(`${FINANCIAL.PENALTIES}${query}`);
  },

  getExpenses: async (filters?: {
    truckId?: number;
    supplierId?: number;
    categoryId?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = new URLSearchParams();
    if (filters) {
      if (filters.truckId) qs.set('truckId', String(filters.truckId));
      if (filters.supplierId) qs.set('supplierId', String(filters.supplierId));
      if (filters.categoryId) qs.set('categoryId', String(filters.categoryId));
      if (filters.fromDate) qs.set('fromDate', filters.fromDate);
      if (filters.toDate) qs.set('toDate', filters.toDate);
      if (filters.page) qs.set('page', String(filters.page));
      if (filters.pageSize) qs.set('pageSize', String(filters.pageSize));
    }
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<PaginatedResponse<ExpenseWithRefs>>(`${FINANCIAL.EXPENSES}${query}`);
  },

  getPayablesSummary: async () => {
    return api.get<{
      items: PayableSummary[];
      totalOutstanding: string;
      totalSuppliers: number;
      overdueSuppliers: number;
    }>(REPORTS.PAYABLES_SUMMARY);
  },

  getCustomerAging: async () => {
    return api.get<{ customers: CustomerAging[] }>(REPORTS.RECEIVABLES_AGING);
  },
};
