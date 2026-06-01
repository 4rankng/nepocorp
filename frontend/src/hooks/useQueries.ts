import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  TripDetail,
  LedgerEntry,
  CustomerStatement,
  CapTableHistory,
  PaginatedResponse,
  DashboardStats,
  Truck as TruckType,
  Driver as DriverType,
  FuelConfig,
  SalaryPeriodRange,
  PnlTruck,
  PnlReport,
  Supplier,
  ExpenseCategory,
  ExpenseWithRefs,
  PayableSummary,
  SupplierStatement,
  RenewalReminder,
} from '@nepocorp/shared';
import { TRIPS, REPORTS, CONFIG, FINANCIAL } from '@nepocorp/shared';

export interface CustomerAging {
  customerId: number;
  customerName: string;
  contactInfo: string | null;
  totalOutstanding: number;
  aging: { current: number; d30: number; d60: number; over90: number };
  maxOverdueDays: number;
}

export type { PnlTruck, PnlReport };

export interface ExtendedDashboardStats extends DashboardStats {
  topOverdueCustomer?: { name: string; balance: number; days: number } | null;
  topShareholder?: { name: string; percentage: number } | null;
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

export function useDashboardStats() {
  return useQuery<ExtendedDashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<ExtendedDashboardStats>(REPORTS.DASHBOARD),
    staleTime: 2 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
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
  const salaryPeriodQuery = useSalaryPeriod(month, year);

  const tripsQuery = useQuery<TripDetail[]>({
    queryKey: ['trips', 'monthly', year, month, salaryPeriodQuery.data?.start],
    enabled: !!salaryPeriodQuery.data,
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TripDetail>>(
        `${TRIPS.LIST}?limit=100&date_from=${salaryPeriodQuery.data!.start}&date_to=${salaryPeriodQuery.data!.end}`,
      );
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
  const salaryPeriodQuery = useSalaryPeriod(month, year);

  const tripsQuery = useQuery<TripDetail[]>({
    queryKey: ['trip-costs', month, year, salaryPeriodQuery.data?.start],
    enabled: !!salaryPeriodQuery.data,
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TripDetail>>(
        `${TRIPS.LIST}?limit=100&status=LOCKED&date_from=${salaryPeriodQuery.data!.start}&date_to=${salaryPeriodQuery.data!.end}`,
      );
      return res.items;
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    ...tripsQuery,
    salaryPeriod: salaryPeriodQuery.data,
  };
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

export function useCustomerAging() {
  return useQuery<{ customers: CustomerAging[] }>({
    queryKey: ['customer-aging'],
    queryFn: () => api.get<{ customers: CustomerAging[] }>(REPORTS.RECEIVABLES_AGING),
    staleTime: 2 * 60 * 1000,
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
        dispatchCount: tripsRes.total ?? 0,
        penaltiesCount: penaltiesRes.total ?? 0,
      };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useTrucksAndDrivers(options?: { enabled?: boolean }) {
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
    enabled: options?.enabled ?? true,
  });
}

export function useFuelConfig() {
  return useQuery<FuelConfig | null>({
    queryKey: ['fuel-config'],
    queryFn: () => api.get<FuelConfig | null>(CONFIG.FUEL_CONFIG),
    staleTime: 10 * 60 * 1000,
  });
}

/** Resolve the salary period date range for a given month/year */
export function useSalaryPeriod(month: number, year: number) {
  return useQuery<SalaryPeriodRange>({
    queryKey: ['salary-period', month, year],
    queryFn: () => api.get<SalaryPeriodRange>(`${CONFIG.SALARY_PERIOD_RESOLVE}?month=${month}&year=${year}`),
    staleTime: 30 * 60 * 1000,
    enabled: month >= 1 && month <= 12 && year >= 2000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ items: Array<{
      id: number;
      username: string | null;
      fullName: string | null;
      email: string | null;
      phone: string | null;
      role: string;
      status: string;
      createdAt: string;
    }> }>('/auth/users'),
  });
}

export function useDriverTrips() {
  return useQuery({
    queryKey: ['driver-trips'],
    queryFn: () => api.get<{ items: Array<{
      id: number;
      departureDate: string;
      status: string;
      driverSalary: string | null;
      routeName: string | null;
      truckPlate: string | null;
    }> }>('/driver/me/trips'),
  });
}

export function useDriverEarnings(month: number, year: number) {
  return useQuery({
    queryKey: ['driver-earnings', month, year],
    queryFn: () => api.get<{
      baseSalary: string;
      tripIncome: string;
      penalties: string;
      netIncome: string;
      periodStart?: string;
      periodEnd?: string;
    }>(`/driver/me/earnings?month=${month}&year=${year}`),
    enabled: month >= 1 && month <= 12 && year >= 2000,
  });
}

export function useDriverPenalties(params?: { dateFrom: string; dateTo: string }) {
  return useQuery({
    queryKey: ['driver-penalties', params],
    queryFn: () => {
      const qs = params ? `?dateFrom=${params.dateFrom}&dateTo=${params.dateTo}` : '';
      return api.get<Array<{
        id: number;
        driverId: number;
        tripId: number | null;
        tripCode?: string | null;
        reasonId: number | null;
        customReason: string | null;
        amount: string;
        date: string;
        reasonText?: string;
      }> | { items: Array<any> }>(`/driver/me/penalties${qs}`);
    },
  });
}

export function useCustomerLedgerEntries() {
  return useQuery<LedgerEntry[]>({
    queryKey: ['customer-ledger-entries'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<LedgerEntry>>(
        `${FINANCIAL.LEDGER}?entity_type=CUSTOMER&limit=2000`,
      );
      return res.items;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCustomers(page: number, search: string) {
  return useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) qs.set('search', search);
      return api.get<{
        items: any[];
        total: number;
      }>(`/customers?${qs}`);
    },
  });
}

export function useDistributionHistory() {
  return useQuery({
    queryKey: ['distribution-history'],
    queryFn: async () => {
      const res = await api.get<Array<{
        id: number;
        quarter: number;
        year: number;
        partnerName: string;
        amount: string;
        createdAt: string;
      }> | { items: Array<any> }>('/reports/distribution-history');
      return Array.isArray(res) ? res : (res as any).items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSuppliers(page?: number, search?: string) {
  return useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (page) qs.set('page', String(page));
      if (search) qs.set('search', search);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return api.get<PaginatedResponse<Supplier>>(`${CONFIG.SUPPLIERS}${query}`);
    },
  });
}

export function useExpenseCategories(page?: number, search?: string) {
  return useQuery({
    queryKey: ['expense-categories', page, search],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (page) qs.set('page', String(page));
      if (search) qs.set('search', search);
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return api.get<PaginatedResponse<ExpenseCategory>>(`${CONFIG.EXPENSE_CATEGORIES}${query}`);
    },
  });
}

export function useExpenses(filters?: { truckId?: number; supplierId?: number; categoryId?: number; fromDate?: string; toDate?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (filters) {
        if (filters.truckId) qs.set('truckId', String(filters.truckId));
        if (filters.supplierId) qs.set('supplierId', String(filters.supplierId));
        if (filters.categoryId) qs.set('categoryId', String(filters.categoryId));
        if (filters.fromDate) qs.set('fromDate', filters.fromDate);
        if (filters.toDate) qs.set('toDate', filters.toDate);
        if (filters.page) qs.set('page', String(filters.page));
        if (filters.pageSize) qs.set('pageSize', String(filters.pageSize));
      }
      const query = qs.toString() ? `?${qs.toString()}` : '';
      return api.get<PaginatedResponse<ExpenseWithRefs>>(`${FINANCIAL.EXPENSES}${query}`);
    },
  });
}

export function usePayablesSummary() {
  return useQuery({
    queryKey: ['payables-summary'],
    queryFn: async () => {
      const result = await api.get<{ items: PayableSummary[]; totalOutstanding: string; totalSuppliers: number; overdueSuppliers: number }>(REPORTS.PAYABLES_SUMMARY);
      return result;
    },
  });
}

export function useSupplierStatement(supplierId: number | undefined) {
  return useQuery<SupplierStatement>({
    queryKey: ['supplier-statement', supplierId],
    queryFn: () => api.get<SupplierStatement>(FINANCIAL.SUPPLIER_STATEMENT(supplierId!)),
    enabled: !!supplierId,
  });
}

export function useRenewalReminders() {
  return useQuery<RenewalReminder[]>({
    queryKey: ['renewal-reminders'],
    queryFn: () => api.get<RenewalReminder[]>(REPORTS.RENEWALS),
    staleTime: 5 * 60 * 1000,
  });
}
