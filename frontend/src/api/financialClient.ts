import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';
import { fetchAllPaginated } from '../lib/http/paginate';
import { FINANCIAL, REPORTS } from '@tingting/shared';
import type {
  LedgerEntry,
  CustomerStatement,
  PayableSummary,
  PayablesCategory,
  SupplierStatement,
  ExpenseWithRefs,
  PaginatedResponse,
  Penalty,
  AdvanceSettlementWithRefs,
} from '@tingting/shared';

export interface CustomerAging {
  customerId: number;
  customerName: string;
  contactInfo: string | null;
  linkedSupplierId: number | null;
  totalOutstanding: number;
  aging: { current: number; d30: number; d60: number; over90: number };
  maxOverdueDays: number;
}

export const financialClient = {
  getLedgerEntries: (params?: { entityType?: string; limit?: number }) =>
    api.get<PaginatedResponse<LedgerEntry>>(
      `${FINANCIAL.LEDGER}${toQuery(params)}`,
    ),

  getAllLedgerEntries: (params?: { entityType?: string }) =>
    fetchAllPaginated<LedgerEntry>(
      FINANCIAL.LEDGER,
      params?.entityType ? { entityType: params.entityType } : undefined,
    ),

  getCustomerStatement: (id: number) =>
    api.get<CustomerStatement>(FINANCIAL.CUSTOMER_STATEMENT(id)),

  getSupplierStatement: (id: number) =>
    api.get<SupplierStatement>(FINANCIAL.SUPPLIER_STATEMENT(id)),

  getPenalties: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Penalty>>(
      `${FINANCIAL.PENALTIES}${toQuery(params as Record<string, string | number | undefined>)}`,
    ),

  getExpenses: (filters?: {
    truckId?: number;
    supplierId?: number;
    categoryId?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api.get<PaginatedResponse<ExpenseWithRefs>>(
      `${FINANCIAL.EXPENSES}${toQuery(filters)}`,
    ),

  getPayablesSummary: (category?: PayablesCategory) =>
    api.get<{
      items: PayableSummary[];
      totalOutstanding: string;
      totalSuppliers: number;
      overdueSuppliers: number;
    }>(`${REPORTS.PAYABLES_SUMMARY}${toQuery({ category })}`),

  postCommission: (data: { supplierId: number; amount: number; tripId?: number; note?: string }) =>
    api.post<{ ok: true }>(FINANCIAL.COMMISSIONS, data),

  getCustomerAging: (search?: string) => {
    const trimmed = search?.trim();
    return api.get<{ customers: CustomerAging[] }>(
      trimmed
        ? `${REPORTS.RECEIVABLES_AGING}${toQuery({ search: trimmed })}`
        : REPORTS.RECEIVABLES_AGING,
    );
  },

  getAdminSettlementDetail: (id: number) =>
    api.get<AdvanceSettlementWithRefs>(FINANCIAL.ADVANCE_SETTLEMENT_DETAIL(id)),

  getSettlementExportUrl: (id: number, format: 'xlsx' | 'pdf') =>
    `/api${FINANCIAL.ADVANCE_SETTLEMENT_EXPORT(id, format)}`,

  getAdvanceBalances: () =>
    api.get<{
      totalOutstanding: string;
      items: Array<{ forwarderId: number; name: string | null; outstanding: string }>;
    }>(FINANCIAL.ADVANCE_BALANCES),
};
