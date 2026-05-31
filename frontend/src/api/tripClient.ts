import { api } from "../lib/api";
import { TRIPS, CATALOGS, REPORTS, CONFIG } from "@nepocorp/shared";
import type {
  Trip,
  TripDetail,
  CreateTripRequest,
  UpdateTripFiguresRequest,
  TripStatus,
} from "@nepocorp/shared";

export const tripClient = {
  listTrips: async (params?: { status?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.limit) query.append("limit", String(params.limit));
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return api.get<{ items: TripDetail[]; total: number }>(`${TRIPS.LIST}${queryString}`);
  },

  getTrip: async (id: number) => {
    return api.get<TripDetail>(TRIPS.DETAIL(id));
  },

  createTrip: async (data: CreateTripRequest) => {
    return api.post<Trip>(TRIPS.CREATE, data);
  },

  updateTripPreDeparture: async (id: number, data: UpdateTripFiguresRequest, opts?: { expectedUpdatedAt?: string }) => {
    return api.put<Trip>(TRIPS.PRE_DEPARTURE(id), data, opts);
  },

  updateTripActuals: async (id: number, data: UpdateTripFiguresRequest, opts?: { expectedUpdatedAt?: string }) => {
    return api.put<Trip>(TRIPS.ACTUALS(id), data, opts);
  },

  dispatchTrip: async (id: number) => {
    return api.post<Trip>(TRIPS.DISPATCH(id), {});
  },

  lockTrip: async (id: number, confirmZeroRevenue?: boolean) => {
    return api.post<Trip>(TRIPS.LOCK(id), { confirmZeroRevenue });
  },

  cancelTrip: async (id: number) => {
    return api.post<Trip>(TRIPS.CANCEL(id), {});
  },

  reassignTrip: async (id: number, data: { truckId: number; driverId: number }) => {
    return api.patch<Trip>(TRIPS.REASSIGN(id), data);
  },

  getPricing: async (customerId: number, routeId: number, date?: string) => {
    const query = new URLSearchParams({
      customerId: String(customerId),
      routeId: String(routeId),
    });
    if (date) query.append("date", date);
    return api.get<{ price: number }>(`${CATALOGS.PRICING}?${query.toString()}`);
  },

  getBootstrap: async () => {
    return api.get<any>(CATALOGS.BOOTSTRAP);
  },
};
