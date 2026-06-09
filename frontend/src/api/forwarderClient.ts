import { api } from '../lib/api';
import { FORWARDER, FINANCIAL } from '@tingting/shared';

export const forwarderClient = {
  getTrips: async (status?: string) => {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<{
      items: Array<{
        id: number;
        tripCode: string | null;
        departureDate: string;
        status: string;
        routeName: string | null;
        truckPlate: string | null;
        customerName: string | null;
        customerReference: string | null;
        containerCount: number | null;
        cargoTypeName: string | null;
      }>;
      counts: Record<string, number>;
    }>(`${FORWARDER.TRIPS}${params}`);
  },

  getTripDetail: async (id: number) => {
    return api.get<any>(FORWARDER.TRIP_DETAIL(id));
  },

  listSuppliers: async () => {
    return api.get<{ items: Array<{ id: number; name: string; contactPerson: string | null; phone: string | null }> }>('/forwarder/me/suppliers');
  },

  createContainer: async (tripId: number, data: { containerTypeId?: number; containerNumber: string; sealNumber?: string; notes?: string }) => {
    return api.post(FORWARDER.CONTAINERS(tripId), data);
  },

  createExpense: async (data: {
    tripId: number;
    expenseType: string;
    buyAmount: number;
    sellAmount?: number;
    settlementMethod?: 'COMPANY_DIRECT' | 'FORWARDER_ADVANCE';
    supplierId?: number;
    invoiceNumber?: string;
    invoiceDate?: string;
    declarationNumber?: string;
    containerNumber?: string;
    note?: string;
  }) => {
    return api.post(FORWARDER.EXPENSES, data);
  },

  deleteExpense: async (id: number) => {
    return api.delete(FORWARDER.EXPENSE(id));
  },

  getAdvanceRequests: async (status?: string) => {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<{ items: any[]; counts: Record<string, number> }>(`${FORWARDER.ADVANCE_REQUESTS}${params}`);
  },
  createAdvanceRequest: async (data: { amount: number; reason: string }) => {
    return api.post(FORWARDER.ADVANCE_REQUESTS, data);
  },

  getAdvanceSettlements: async () => {
    return api.get<{ items: any[] }>(FORWARDER.ADVANCE_SETTLEMENTS);
  },
  getAdvanceSettlementDetail: async (id: number) => {
    return api.get<any>(FORWARDER.ADVANCE_SETTLEMENT_DETAIL(id));
  },
  createAdvanceSettlement: async (data: { totalExpenseAmount?: number; refundAmount?: number; note?: string; advanceRequestIds: number[]; tripExpenseIds?: number[] }) => {
    return api.post(FORWARDER.ADVANCE_SETTLEMENTS, data);
  },

  getUnlinkedExpenses: async () => {
    return api.get<{ items: any[] }>(FORWARDER.UNLINKED_EXPENSES);
  },

  listAllAdvanceRequests: async (filters?: { status?: string }) => {
    const params = filters?.status ? `?status=${encodeURIComponent(filters.status)}` : '';
    return api.get<{ items: any[] }>(`${FINANCIAL.ADVANCE_REQUESTS}${params}`);
  },
  approveAdvanceRequest: async (id: number) => {
    return api.post(FINANCIAL.ADVANCE_REQUEST_APPROVE(id), {});
  },
  rejectAdvanceRequest: async (id: number) => {
    return api.post(FINANCIAL.ADVANCE_REQUEST_REJECT(id), {});
  },

  listAllAdvanceSettlements: async (filters?: { status?: string }) => {
    const params = filters?.status ? `?status=${encodeURIComponent(filters.status)}` : '';
    return api.get<{ items: any[] }>(`${FINANCIAL.ADVANCE_SETTLEMENTS}${params}`);
  },
  checkAdvanceSettlement: async (id: number) => {
    return api.post(FINANCIAL.ADVANCE_SETTLEMENT_CHECK(id), {});
  },
  approveAdvanceSettlement: async (id: number) => {
    return api.post(FINANCIAL.ADVANCE_SETTLEMENT_APPROVE(id), {});
  },
  rejectAdvanceSettlement: async (id: number) => {
    return api.post(FINANCIAL.ADVANCE_SETTLEMENT_REJECT(id), {});
  },
};
