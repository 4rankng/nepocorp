import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  TripDetail,
  Customer,
  LedgerEntry,
  CustomerStatement,
  CapTableHistory,
  PaginatedResponse,
  DashboardStats,
  Truck as TruckType,
  Driver as DriverType,
} from '@nepocorp/shared';
import { TRIPS, REPORTS, CONFIG, FINANCIAL } from '@nepocorp/shared';

export interface ExtendedDashboardStats extends DashboardStats {
  totalTrucks?: number;
  totalDrivers?: number;
  topOverdueCustomer?: { id: number; name: string; amount: number };
  topShareholder?: { name: string; percentage: string };
}

export interface PnlReport {
  period: string;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  managementFee: number;
  otherIncome: number;
  netProfit: number;
  tripCount: number;
  trucks: string[];
}

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
  trailerId: number;
  cargoTypeId: number;
  status: string;
  departureDate: string;
  notes?: string;
  tripCode?: string;
}

export function normalizeTrip(t: any): NormalizedTrip {
  return {
    id: t.id,
    customerId: t.customer_id ?? t.customerId,
    customerName: t.customer?.name ?? t.customer_name ?? '',
    customerReference: t.customer_reference ?? t.customerReference ?? undefined,
    truckId: t.truck_id ?? t.truckId,
    truckPlate: t.truck?.license_plate ?? t.truck?.licensePlate ?? '',
    driverId: t.driver_id ?? t.driverId,
    driverName: t.driver?.name ?? t.driver_name ?? '',
    routeId: t.route_id ?? t.routeId,
    routeName: t.route?.name ?? t.route_name ?? '',
    trailerId: t.trailer_id ?? t.trailerId,
    cargoTypeId: t.cargo_type_id ?? t.cargoTypeId,
    status: t.status,
    departureDate: t.departure_date ?? t.departureDate ?? '',
    notes: t.notes ?? undefined,
    tripCode: t.trip_code ?? t.tripCode ?? undefined,
  };
}

export function useDashboardStats() {
  return useQuery<ExtendedDashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<ExtendedDashboardStats>(REPORTS.DASHBOARD),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePnlReport(month: number, year: number) {
  return useQuery<PnlReport>({
    queryKey: ['pnl', month, year],
    queryFn: () => api.get<PnlReport>(`${REPORTS.PNL}?month=${month}&year=${year}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyTrips(year: number, month: number) {
  return useQuery<TripDetail[]>({
    queryKey: ['trips', 'monthly', year, month],
    queryFn: async () => {
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const res = await api.get<PaginatedResponse<TripDetail>>(
        `${TRIPS.LIST}?limit=100&date_from=${monthStart}&date_to=${monthEnd}`,
      );
      return res.items;
    },
  });
}

export function useCreatedTrips() {
  return useQuery<TripDetail[]>({
    queryKey: ['trips', 'created'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TripDetail>>(
        `${TRIPS.LIST}?limit=100&status=CREATED`,
      );
      return res.items;
    },
  });
}

export function useYearlyPnl(year: number) {
  return useQuery<(PnlReport | null)[]>({
    queryKey: ['yearly-pnl', year],
    queryFn: () =>
      Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          api
            .get<PnlReport>(`${REPORTS.PNL}?month=${i + 1}&year=${year}`)
            .catch(() => null),
        ),
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTripDetail(id: string | undefined) {
  return useQuery<TripDetail>({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: () => api.get<TripDetail>(TRIPS.DETAIL(Number(id))),
  });
}

export function useTripAdjustments(id: number) {
  return useQuery({
    queryKey: ['trip-adjustments', id],
    enabled: id > 0,
    queryFn: () => api.get<{ items: any[] }>(TRIPS.ADJUSTMENTS(id)),
    select: (data) => data.items,
  });
}

export function useTripCosts(month: number, year: number) {
  return useQuery<TripDetail[]>({
    queryKey: ['trip-costs', month, year],
    queryFn: async () => {
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const res = await api.get<PaginatedResponse<TripDetail>>(
        `${TRIPS.LIST}?limit=100&status=LOCKED&date_from=${monthStart}&date_to=${monthEnd}`,
      );
      return res.items;
    },
  });
}

export function useCapTable() {
  return useQuery<CapTableHistory[]>({
    queryKey: ['cap-table'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<CapTableHistory>>(CONFIG.CAP_TABLE);
      return res.items;
    },
  });
}

export function useCustomerDebts() {
  return useQuery<{ customers: Customer[]; ledgerEntries: LedgerEntry[] }>({
    queryKey: ['customer-debts'],
    queryFn: async () => {
      const [customersRes, ledgerRes] = await Promise.all([
        api.get<PaginatedResponse<Customer>>(CONFIG.CUSTOMERS),
        api.get<PaginatedResponse<LedgerEntry>>(`${FINANCIAL.LEDGER}?entity_type=CUSTOMER&limit=2000`),
      ]);
      return {
        customers: customersRes.items,
        ledgerEntries: ledgerRes.items,
      };
    },
  });
}

export function useCustomerStatement(id: string | undefined) {
  return useQuery<CustomerStatement>({
    queryKey: ['customer-statement', id],
    enabled: !!id,
    queryFn: () => api.get<CustomerStatement>(FINANCIAL.CUSTOMER_STATEMENT(Number(id))),
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
        api.get<PaginatedResponse<DriverType>>(CONFIG.DRIVERS),
        api.get<PaginatedResponse<TruckType>>(CONFIG.TRUCKS),
        api.get<PaginatedResponse<TripDetail>>(`${TRIPS.LIST}?limit=100&status=CREATED`),
        api.get<PaginatedResponse<TripDetail>>(`${TRIPS.LIST}?limit=100&status=IN_TRANSIT`),
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

export function useBadgeCounts() {
  return useQuery<{ dispatchCount: number; penaltiesCount: number }>({
    queryKey: ['badge-counts'],
    queryFn: async () => {
      const [tripsRes, penaltiesRes] = await Promise.all([
        api.get<PaginatedResponse<TripDetail>>(`${TRIPS.LIST}?status=CREATED&limit=1`),
        api.get<PaginatedResponse<any>>(FINANCIAL.PENALTIES),
      ]);
      return {
        dispatchCount: tripsRes.total,
        penaltiesCount: penaltiesRes.total,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useTrucksAndDrivers() {
  return useQuery<{ trucks: TruckType[]; drivers: DriverType[] }>({
    queryKey: ['trucks-drivers'],
    queryFn: async () => {
      const [trucksRes, driversRes] = await Promise.all([
        api.get<PaginatedResponse<TruckType>>(`${CONFIG.TRUCKS}?pageSize=50`),
        api.get<PaginatedResponse<DriverType>>(CONFIG.DRIVERS),
      ]);
      return {
        trucks: trucksRes.items,
        drivers: driversRes.items,
      };
    },
  });
}
