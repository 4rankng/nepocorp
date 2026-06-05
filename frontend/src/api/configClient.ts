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

export const configClient = {
  getCustomers: async (page: number, search: string) => {
    const qs = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) qs.set('search', search);
    return api.get<{ items: any[]; total: number }>(`${CONFIG.CUSTOMERS}?${qs}`);
  },

  getTrucks: async (params?: { pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<PaginatedResponse<Truck>>(`${CONFIG.TRUCKS}${query}`);
  },

  getDrivers: async () => {
    return api.get<PaginatedResponse<Driver>>(CONFIG.DRIVERS);
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
    return api.get<PaginatedResponse<CapTableHistory>>(CONFIG.CAP_TABLE);
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
    return api.get<PaginatedResponse<Port>>('/ports');
  },

  getContainerTypes: async () => {
    return api.get<PaginatedResponse<ContainerType>>('/container-types');
  },

  getRoutesList: async () => {
    return api.get<PaginatedResponse<any>>('/routes?limit=500');
  },

  getAllCustomers: async () => {
    return api.get<{ items: any[]; total: number }>(`${CONFIG.CUSTOMERS}?limit=500`);
  },

  getSalaryPeriodResolve: async (month: number, year: number) => {
    return api.get<SalaryPeriodRange>(`${CONFIG.SALARY_PERIOD_RESOLVE}?month=${month}&year=${year}`);
  },

  getPenaltyReasons: async () => {
    return api.get<PaginatedResponse<any>>(CONFIG.PENALTY_REASONS);
  },

  getFuelPriceHistory: async () => {
    return api.get<FuelPriceHistory[]>('/fuel-price-history');
  },
};
