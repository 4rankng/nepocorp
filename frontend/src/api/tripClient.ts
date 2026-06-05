import { api } from "../lib/api";
import { TRIPS, CATALOGS } from "@tingting/shared";
import type {
  Trip,
  TripDetail,
  TripExpense,
  CreateTripRequest,
  UpdateTripFiguresRequest,
  PaginatedResponse,
} from "@tingting/shared";

type ListTripsParams = { status?: string; limit?: number; page?: number; dateFrom?: string; dateTo?: string; search?: string; truckId?: number; customerId?: number };

export const tripClient = {
  listTrips: async (params?: ListTripsParams) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.page) query.append("page", String(params.page));
    if (params?.dateFrom) query.append("dateFrom", params.dateFrom);
    if (params?.dateTo) query.append("dateTo", params.dateTo);
    if (params?.search) query.append("search", params.search);
    if (params?.truckId) query.append("truckId", String(params.truckId));
    if (params?.customerId) query.append("customerId", String(params.customerId));
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return api.get<PaginatedResponse<TripDetail>>(`${TRIPS.LIST}${queryString}`);
  },

  /** Fetch all pages of trips for a given filter set. */
  fetchAllTrips: async (params: Omit<ListTripsParams, 'page'> & { limit?: number }): Promise<{ items: TripDetail[]; total: number }> => {
    const pageSize = params.limit ?? 100;
    const first = await tripClient.listTrips({ ...params, limit: pageSize, page: 1 });
    const totalPages = Math.ceil(first.total / pageSize);
    if (totalPages <= 1) return { items: first.items, total: first.total };
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        tripClient.listTrips({ ...params, limit: pageSize, page: i + 2 })
      ),
    );
    const allItems = [first, ...remaining].flatMap(r => r.items);
    return { items: allItems, total: first.total };
  },

  getTripsSummary: async (params?: { dateFrom?: string; dateTo?: string }) => {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.append("dateFrom", params.dateFrom);
    if (params?.dateTo) query.append("dateTo", params.dateTo);
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return api.get<{
      statusCounts: Record<string, number>;
      totalKm: number;
      totalFuel: number;
      totalRoad: number;
      totalRevenue: number;
      missingFuel: number;
      avgPer100: number;
      truckOptions: Array<{ id: number; licensePlate: string }>;
      customerOptions: Array<{ id: number; name: string }>;
    }>(`${TRIPS.LIST}/summary${queryString}`);
  },

  getTrip: async (id: number) => {
    return api.get<TripDetail>(TRIPS.DETAIL(id));
  },

  getAdjustments: async (id: number) => {
    return api.get<{ items: any[] }>(TRIPS.ADJUSTMENTS(id));
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

  listTripExpenses: (tripId: number) =>
    api.get<{ items: TripExpense[] }>(`/trips/${tripId}/expenses`),

  createTripExpense: (tripId: number, data: object) =>
    api.post<TripExpense>(`/trips/${tripId}/expenses`, data),

  deleteTripExpense: (tripId: number, eid: number) =>
    api.delete<{ ok: boolean }>(`/trips/${tripId}/expenses/${eid}`),

  approveTripExpense: (tripId: number, eid: number) =>
    api.post<{ ok: boolean }>(`/trips/${tripId}/expenses/${eid}/approve`, {}),

  rejectTripExpense: (tripId: number, eid: number) =>
    api.post<{ ok: boolean }>(`/trips/${tripId}/expenses/${eid}/reject`, {}),
};
