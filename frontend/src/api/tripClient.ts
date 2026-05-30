import { api } from "../lib/api";
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
    return api.get<{ items: TripDetail[]; total: number }>(`/trips${queryString}`);
  },

  getTrip: async (id: number) => {
    return api.get<TripDetail>(`/trips/${id}`);
  },

  createTrip: async (data: CreateTripRequest) => {
    return api.post<Trip>("/trips", data);
  },

  updateTripPreDeparture: async (id: number, data: UpdateTripFiguresRequest, opts?: { expectedUpdatedAt?: string }) => {
    return api.put<Trip>(`/trips/${id}/pre-departure`, data, opts);
  },

  updateTripActuals: async (id: number, data: UpdateTripFiguresRequest, opts?: { expectedUpdatedAt?: string }) => {
    return api.put<Trip>(`/trips/${id}/actuals`, data, opts);
  },

  dispatchTrip: async (id: number) => {
    return api.post<Trip>(`/trips/${id}/dispatch`, {});
  },

  lockTrip: async (id: number, confirmZeroRevenue?: boolean) => {
    return api.post<Trip>(`/trips/${id}/lock`, { confirmZeroRevenue });
  },

  cancelTrip: async (id: number) => {
    return api.post<Trip>(`/trips/${id}/cancel`, {});
  },

  reassignTrip: async (id: number, data: { truck_id: number; trailer_id: number; driver_id: number }) => {
    return api.patch<Trip>(`/trips/${id}/reassign`, data);
  },

  getPricing: async (customerId: number, routeId: number, date?: string) => {
    const query = new URLSearchParams({
      customerId: String(customerId),
      routeId: String(routeId),
    });
    if (date) query.append("date", date);
    return api.get<{ price: number }>(`/pricing?${query.toString()}`);
  },

  getBootstrap: async () => {
    return api.get<any>("/catalogs/bootstrap");
  },
};
