import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';
import { FORWARDER, FINANCIAL } from '@tingting/shared';
import type {
  ForwarderTripDetail,
  AdvanceRequestWithRefs,
  AdvanceSettlementWithRefs,
  TripExpenseWithSupplier,
} from '@tingting/shared';

export const forwarderClient = {
  getTrips: async (status?: string) => {
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
        containerNumbers: string | null;
        cargoTypeName: string | null;
      }>;
      counts: Record<string, number>;
    }>(`${FORWARDER.TRIPS}${toQuery({ status })}`);
  },

  getTripDetail: async (id: number) => {
    return api.get<ForwarderTripDetail>(FORWARDER.TRIP_DETAIL(id));
  },

  listSuppliers: async () => {
    return api.get<{ items: Array<{ id: number; name: string; contactPerson: string | null; phone: string | null }> }>(FORWARDER.SUPPLIERS);
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
    return api.get<{ items: AdvanceRequestWithRefs[]; counts: Record<string, number> }>(`${FORWARDER.ADVANCE_REQUESTS}${toQuery({ status })}`);
  },
  createAdvanceRequest: async (data: { amount: number; reason: string }) => {
    return api.post(FORWARDER.ADVANCE_REQUESTS, data);
  },

  getAdvanceSettlements: async () => {
    return api.get<{ items: AdvanceSettlementWithRefs[] }>(FORWARDER.ADVANCE_SETTLEMENTS);
  },
  getAdvanceSettlementDetail: async (id: number) => {
    return api.get<AdvanceSettlementWithRefs>(FORWARDER.ADVANCE_SETTLEMENT_DETAIL(id));
  },
  createAdvanceSettlement: async (data: { totalExpenseAmount?: number; refundAmount?: number; note?: string; advanceRequestIds: number[]; tripExpenseIds?: number[] }) => {
    return api.post(FORWARDER.ADVANCE_SETTLEMENTS, data);
  },

  previewSettlementHtml: async (data: { totalExpenseAmount?: number; refundAmount?: number; note?: string; advanceRequestIds: number[]; tripExpenseIds?: number[] }) => {
    return api.postForText(`${FORWARDER.ADVANCE_SETTLEMENT_PREVIEW}?format=html`, data);
  },

  previewSettlementXlsx: async (data: { totalExpenseAmount?: number; refundAmount?: number; note?: string; advanceRequestIds: number[]; tripExpenseIds?: number[] }) => {
    return api.postForBlob(`${FORWARDER.ADVANCE_SETTLEMENT_PREVIEW}?format=xlsx`, data);
  },

  getUnlinkedExpenses: async () => {
    return api.get<{ items: TripExpenseWithSupplier[] }>(FORWARDER.UNLINKED_EXPENSES);
  },

  listAllAdvanceRequests: async (filters?: { status?: string }) => {
    return api.get<{ items: AdvanceRequestWithRefs[] }>(`${FINANCIAL.ADVANCE_REQUESTS}${toQuery(filters)}`);
  },
  approveAdvanceRequest: async (id: number) => {
    return api.post(FINANCIAL.ADVANCE_REQUEST_APPROVE(id), {});
  },
  rejectAdvanceRequest: async (id: number) => {
    return api.post(FINANCIAL.ADVANCE_REQUEST_REJECT(id), {});
  },

  listAllAdvanceSettlements: async (filters?: { status?: string }) => {
    return api.get<{ items: AdvanceSettlementWithRefs[] }>(`${FINANCIAL.ADVANCE_SETTLEMENTS}${toQuery(filters)}`);
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
