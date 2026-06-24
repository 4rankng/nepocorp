import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';
import { TRIPS, CATALOGS, TRACKING } from '@tingting/shared';
import type {
  Trip,
  TripDetail,
  TripExpense,
  TripInstruction,
  CreateTripRequest,
  UpdateTripFiguresRequest,
  PaginatedResponse,
  LiveFleetResponse,
} from '@tingting/shared';

type ListTripsParams = {
  status?: string;
  limit?: number;
  page?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  truckId?: number;
  customerId?: number;
};

export const tripClient = {
  listTrips: (params?: ListTripsParams) =>
    api.get<PaginatedResponse<TripDetail>>(`${TRIPS.LIST}${toQuery(params)}`),

  /** Live fleet — current GPS positions of trucks on active IN_TRANSIT trips. */
  getLiveFleet: () => api.get<LiveFleetResponse>(TRACKING.LIVE_FLEET),

  /** Fetch all pages of trips for a given filter set. */
  fetchAllTrips: async (
    params: Omit<ListTripsParams, 'page'> & { limit?: number },
  ): Promise<{ items: TripDetail[]; total: number }> => {
    const pageSize = params.limit ?? 100;
    const first = await tripClient.listTrips({ ...params, limit: pageSize, page: 1 });
    const totalPages = Math.ceil(first.total / pageSize);
    if (totalPages <= 1) return { items: first.items, total: first.total };
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        tripClient.listTrips({ ...params, limit: pageSize, page: i + 2 }),
      ),
    );
    return {
      items: [first, ...remaining].flatMap((r) => r.items),
      total: first.total,
    };
  },

  getTripsSummary: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<{
      statusCounts: Record<string, number>;
      totalKm: number;
      totalFuel: number;
      totalRoad: number;
      totalRevenue: number;
      missingFuel: number;
      avgPer100: number;
      truckOptions: Array<{ id: number; licensePlate: string }>;
      customerOptions: Array<{ id: number; name: string }>;
    }>(`${TRIPS.LIST}/summary${toQuery(params)}`),

  getTrip: (id: number) => api.get<TripDetail>(TRIPS.DETAIL(id)),

  getAdjustments: (id: number) => api.get<{ items: Record<string, unknown>[] }>(TRIPS.ADJUSTMENTS(id)),

  createTrip: (data: CreateTripRequest) => api.post<Trip>(TRIPS.CREATE, data),

  updateTripPreDeparture: (
    id: number,
    data: UpdateTripFiguresRequest,
    opts?: { expectedUpdatedAt?: string },
  ) => api.put<Trip>(TRIPS.PRE_DEPARTURE(id), data, opts),

  updateTripActuals: (
    id: number,
    data: UpdateTripFiguresRequest,
    opts?: { expectedUpdatedAt?: string },
  ) => api.put<Trip>(TRIPS.ACTUALS(id), data, opts),

  dispatchTrip: (id: number) => api.post<Trip>(TRIPS.DISPATCH(id), {}),

  lockTrip: (id: number, confirmZeroRevenue?: boolean) =>
    api.post<Trip>(TRIPS.LOCK(id), { confirmZeroRevenue }),

  cancelTrip: (id: number) => api.post<Trip>(TRIPS.CANCEL(id), {}),

  reassignTrip: (id: number, data: { carrierType?: 'OWN' | 'EXTERNAL', truckId?: number | null, driverId?: number | null, externalCarrierId?: number | null, externalPlateNumber?: string | null, externalDriverName?: string | null, externalDriverPhone?: string | null }) =>
    api.patch<TripDetail>(TRIPS.REASSIGN(id), data),

  getPricing: (customerId: number, routeId: number, date?: string) =>
    api.get<{ price: number }>(
      `${CATALOGS.PRICING}${toQuery({ customerId, routeId, date })}`,
    ),

  // Bootstrap returns the full catalog blob; typed at the query layer via
  // useCatalogs's CatalogData interface (cannot import here without a cycle).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBootstrap: () => api.get<any>(CATALOGS.BOOTSTRAP),

  listTripExpenses: (tripId: number) =>
    api.get<{ items: TripExpense[] }>(TRIPS.EXPENSES(tripId)),

  createTripExpense: (tripId: number, data: object) =>
    api.post<TripExpense>(TRIPS.EXPENSES(tripId), data),

  updateTripExpense: (tripId: number, eid: number, data: object) =>
    api.put<TripExpense>(TRIPS.EXPENSE(tripId, eid), data),

  deleteTripExpense: (tripId: number, eid: number) =>
    api.delete<{ ok: boolean }>(TRIPS.EXPENSE(tripId, eid)),

  approveTripExpense: (tripId: number, eid: number) =>
    api.post<{ ok: boolean }>(TRIPS.EXPENSE_APPROVE(tripId, eid), {}),

  rejectTripExpense: (tripId: number, eid: number) =>
    api.post<{ ok: boolean }>(TRIPS.EXPENSE_REJECT(tripId, eid), {}),

  // ─── Trip instructions (N2 / B1.3) ──────────────────────────────────────────
  // Manager-authored contact + free-text guidance. Returns null when no row
  // exists yet.
  getTripInstructions: (tripId: number) =>
    api.get<TripInstruction | null>(TRIPS.INSTRUCTIONS(tripId)),

  upsertTripInstructions: (
    tripId: number,
    data: { contactName?: string | null; contactPhone?: string | null; notes?: string | null },
  ) => api.put<TripInstruction>(TRIPS.INSTRUCTIONS(tripId), data),
};
