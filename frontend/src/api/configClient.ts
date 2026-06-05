import { api } from '../lib/api';
import { CONFIG } from '@nepocorp/shared';
import type {
  Truck,
  Driver,
  FuelConfig, FuelPriceHistory,
  RoadConfig,
  SalaryPeriodRange,
  CapTableHistory,
  Supplier,
  ExpenseCategory,
  PaginatedResponse,
  Port,
  ContainerType,
} from '@nepocorp/shared';

/** Auto-paginate a crud-factory GET endpoint (capped at 100/page by backend). */
export async function fetchAllPaginated<T>(
  endpoint: string,
  params?: Record<string, string>,
  concurrency = 5,
): Promise<T[]> {
  const pageSize = 100;
  const baseExtra = params ? `&${new URLSearchParams(params)}` : '';
  const first = await api.get<PaginatedResponse<T>>(
    `${endpoint}?limit=${pageSize}&page=1${baseExtra}`,
  );
  const total = first.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return first.items ?? [];

  // Fetch remaining pages in bounded batches to avoid thundering-herd
  const results: PaginatedResponse<T>[] = [first];
  const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  for (let i = 0; i < pageNums.length; i += concurrency) {
    const batch = pageNums.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(page =>
        api.get<PaginatedResponse<T>>(
          `${endpoint}?limit=${pageSize}&page=${page}${baseExtra}`,
        ),
      ),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value);
      else console.warn(`[fetchAllPaginated] page fetch failed:`, r.reason);
    }
  }
  return results.flatMap(r => r.items ?? []);
}

export const configClient = {
  getCustomers: async (page: number, search: string) => {
    const qs = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) qs.set('search', search);
    return api.get<{ items: any[]; total: number }>(`${CONFIG.CUSTOMERS}?${qs}`);
  },

  getTrucks: async () => {
    return fetchAllPaginated<Truck>(CONFIG.TRUCKS);
  },

  getDrivers: async () => {
    return fetchAllPaginated<Driver>(CONFIG.DRIVERS);
  },

  getSuppliers: async (page?: number, search?: string) => {
    const qs = new URLSearchParams();
    if (page) qs.set('page', String(page));
    if (search) qs.set('search', search);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<PaginatedResponse<Supplier>>(`${CONFIG.SUPPLIERS}${query}`);
  },

  getExpenseCategories: async (page?: number, search?: string) => {
    const qs = new URLSearchParams();
    if (page) qs.set('page', String(page));
    if (search) qs.set('search', search);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<PaginatedResponse<ExpenseCategory>>(`${CONFIG.EXPENSE_CATEGORIES}${query}`);
  },

  getCapTable: async () => {
    return fetchAllPaginated<CapTableHistory>(CONFIG.CAP_TABLE);
  },

  getFuelConfig: async () => {
    return api.get<FuelConfig | null>(CONFIG.FUEL_CONFIG);
  },

  saveFuelConfig: async (data: {
    loadedNorm: number; emptyNorm: number; supplement: number;
    unitPrice: number; warningThreshold: number; criticalThreshold: number;
  }) => {
    return api.put<FuelConfig>('/fuel-config', data);
  },

  getRoadConfig: async () => {
    return api.get<RoadConfig | null>(CONFIG.ROAD_CONFIG);
  },

  saveRoadConfig: async (data: {
    tollPerStation: number; returnCargoBonus: number;
    defaultDriverSalary: number; twoPointDeliveryBonus: number;
    vehicleShiftDefault: number;
  }) => {
    return api.put<RoadConfig>('/road-config', data);
  },

  getPorts: async () => {
    return fetchAllPaginated<Port>('/ports');
  },

  getContainerTypes: async () => {
    return fetchAllPaginated<ContainerType>('/container-types');
  },

  getRoutesList: async (search?: string) => {
    return fetchAllPaginated<any>(
      '/routes',
      search ? { search } : undefined,
    );
  },

  getAllCustomers: async (search?: string) => {
    return fetchAllPaginated<any>(
      CONFIG.CUSTOMERS,
      search ? { search } : undefined,
    );
  },

  getSalaryPeriodResolve: async (month: number, year: number) => {
    return api.get<SalaryPeriodRange>(`${CONFIG.SALARY_PERIOD_RESOLVE}?month=${month}&year=${year}`);
  },

  getPenaltyReasons: async () => {
    return fetchAllPaginated<any>(CONFIG.PENALTY_REASONS);
  },

  getFuelPriceHistory: async () => {
    return api.get<FuelPriceHistory[]>('/fuel-price-history');
  },

  getRoadAllowances: async () => {
    return fetchAllPaginated<any>('/road-allowances');
  },

  getTrailers: async () => {
    return fetchAllPaginated<any>('/trailers');
  },

  getPricingTables: async () => {
    return fetchAllPaginated<any>('/pricing-tables');
  },

  getAllSuppliers: async () => {
    return fetchAllPaginated<Supplier>(CONFIG.SUPPLIERS);
  },

  getAllExpenseCategories: async () => {
    return fetchAllPaginated<ExpenseCategory>(CONFIG.EXPENSE_CATEGORIES);
  },
};
