import { api } from '../lib/api';
import { FORWARDER, FINANCIAL } from '@nepocorp/shared';

export const forwarderClient = {
  getTrips: async () => {
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
    }>(FORWARDER.TRIPS);
  },

  getTripDetail: async (id: number) => {
    return api.get<any>(FORWARDER.TRIP_DETAIL(id));
  },

  createContainer: async (tripId: number, data: { containerNumber: string; sealNumber?: string; notes?: string }) => {
    return api.post(FORWARDER.CONTAINERS(tripId), data);
  },

  createExpense: async (data: { tripId: number; expenseType: string; amount: number; note?: string }) => {
    return api.post(FORWARDER.EXPENSES, data);
  },

  deleteExpense: async (id: number) => {
    return api.delete(FORWARDER.EXPENSE(id));
  },

  getAdvanceRequests: async () => {
    return api.get<{ items: any[] }>(FORWARDER.ADVANCE_REQUESTS);
  },
  createAdvanceRequest: async (data: { amount: number; reason: string }) => {
    return api.post(FORWARDER.ADVANCE_REQUESTS, data);
  },

  getAdvanceSettlements: async () => {
    return api.get<{ items: any[] }>(FORWARDER.ADVANCE_SETTLEMENTS);
  },
  createAdvanceSettlement: async (data: { totalExpenseAmount: number; refundAmount?: number; note?: string; advanceRequestIds: number[] }) => {
    return api.post(FORWARDER.ADVANCE_SETTLEMENTS, data);
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
