import { api } from '../lib/api';
import { FORWARDER } from '@nepocorp/shared';

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
};
