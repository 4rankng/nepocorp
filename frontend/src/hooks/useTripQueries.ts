import { useQuery } from '@tanstack/react-query';
import { tripClient } from '../api/tripClient';
import { configClient } from '../api/configClient';
import { financialClient } from '../api/financialClient';
import type { TripDetail, Truck as TruckType, Driver as DriverType } from '@nepocorp/shared';
import { useSalaryPeriod } from './useCatalogQueries';

export interface NormalizedTrip {
  id: number;
  customerId: number;
  customerName: string;
  customerReference?: string;
  truckId: number;
  truckPlate: string;
  driverId: number;
  driverName: string;
  routeId: number;
  routeName: string;
  trailerType: string;
  cargoTypeId: number;
  status: string;
  departureDate: string;
  notes?: string;
  tripCode?: string;
}

export function normalizeTrip(t: any): NormalizedTrip {
  return {
    id: t.id,
    customerId: t.customerId,
    customerName: t.customer?.name ?? '',
    customerReference: t.customerReference ?? undefined,
    truckId: t.truckId,
    truckPlate: t.truck?.licensePlate ?? '',
    driverId: t.driverId,
    driverName: t.driver?.name ?? '',
    routeId: t.routeId,
    routeName: t.route?.name ?? '',
    trailerType: t.trailerType ?? '',
    cargoTypeId: t.cargoTypeId,
    status: t.status,
    departureDate: t.departureDate ?? '',
    notes: t.notes ?? undefined,
    tripCode: t.tripCode ?? undefined,
  };
}

export function useTripDetail(id: string | undefined) {
  return useQuery<TripDetail>({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: () => tripClient.getTrip(Number(id)),
  });
}

export function useTripAdjustments(id: number) {
  return useQuery({
    queryKey: ['trip-adjustments', id],
    enabled: id > 0,
    queryFn: () => tripClient.getAdjustments(id),
    select: (data) => data.items,
  });
}

export function useTripCosts(month: number, year: number) {
  const salaryPeriodQuery = useSalaryPeriod(month, year);

  const tripsQuery = useQuery<TripDetail[]>({
    queryKey: ['trip-costs', month, year, salaryPeriodQuery.data?.start],
    enabled: !!salaryPeriodQuery.data,
    queryFn: async () => {
      const res = await tripClient.listTrips({
        status: 'LOCKED',
        limit: 100,
        dateFrom: salaryPeriodQuery.data!.start,
        dateTo: salaryPeriodQuery.data!.end,
      });
      return res.items;
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    ...tripsQuery,
    salaryPeriod: salaryPeriodQuery.data,
  };
}

export function useMonthlyTrips(year: number, month: number) {
  const salaryPeriodQuery = useSalaryPeriod(month, year);

  const tripsQuery = useQuery<TripDetail[]>({
    queryKey: ['trips', 'monthly', year, month, salaryPeriodQuery.data?.start],
    enabled: !!salaryPeriodQuery.data,
    queryFn: async () => {
      const res = await tripClient.listTrips({
        limit: 100,
        dateFrom: salaryPeriodQuery.data!.start,
        dateTo: salaryPeriodQuery.data!.end,
      });
      return res.items;
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    ...tripsQuery,
    salaryPeriod: salaryPeriodQuery.data,
  };
}

export function useCreatedTrips() {
  return useQuery<TripDetail[]>({
    queryKey: ['trips', 'created'],
    queryFn: async () => {
      const res = await tripClient.listTrips({ status: 'CREATED', limit: 100 });
      return res.items;
    },
  });
}

export function useDispatchData() {
  return useQuery<{
    drivers: DriverType[];
    trucks: TruckType[];
    pendingTrips: NormalizedTrip[];
    activeTrips: NormalizedTrip[];
  }>({
    queryKey: ['dispatch'],
    queryFn: async () => {
      const [driversRes, trucksRes, pendingRes, activeRes] = await Promise.all([
        configClient.getDrivers(),
        configClient.getTrucks(),
        tripClient.listTrips({ status: 'CREATED', limit: 100 }),
        tripClient.listTrips({ status: 'IN_TRANSIT', limit: 100 }),
      ]);
      return {
        drivers: driversRes.items,
        trucks: trucksRes.items,
        pendingTrips: pendingRes.items.map(normalizeTrip),
        activeTrips: activeRes.items.map(normalizeTrip),
      };
    },
  });
}

export function useBadgeCounts(options?: { enabled?: boolean }) {
  return useQuery<{ dispatchCount: number; penaltiesCount: number }>({
    queryKey: ['badge-counts'],
    queryFn: async () => {
      const [tripsRes, penaltiesRes] = await Promise.all([
        tripClient.listTrips({ status: 'CREATED', limit: 1 }),
        financialClient.getPenalties(),
      ]);
      return {
        dispatchCount: tripsRes.total ?? 0,
        penaltiesCount: penaltiesRes.total ?? 0,
      };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}
