import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';
import { fetchAllPaginated } from '../lib/http/paginate';
import { CONFIG } from '@tingting/shared';
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
  Route,
  Customer,
  PenaltyReason,
  RoadAllowance,
  Trailer,
  PricingTable,
} from '@tingting/shared';

export const configClient = {
  getCustomers: async (page: number, search: string) => {
    const qs = toQuery({ page, limit: '10', search: search || undefined });
    return api.get<{ items: Customer[]; total: number }>(`${CONFIG.CUSTOMERS}${qs}`);
  },

  getTrucks: () => fetchAllPaginated<Truck>(CONFIG.TRUCKS),

  getDrivers: () => fetchAllPaginated<Driver>(CONFIG.DRIVERS),

  getSuppliers: async (page?: number, search?: string) =>
    api.get<PaginatedResponse<Supplier>>(
      `${CONFIG.SUPPLIERS}${toQuery({ page, search })}`,
    ),

  getExpenseCategories: async (page?: number, search?: string) =>
    api.get<PaginatedResponse<ExpenseCategory>>(
      `${CONFIG.EXPENSE_CATEGORIES}${toQuery({ page, search })}`,
    ),

  getCapTable: () => fetchAllPaginated<CapTableHistory>(CONFIG.CAP_TABLE),

  getFuelConfig: () => api.get<FuelConfig | null>(CONFIG.FUEL_CONFIG),

  saveFuelConfig: (data: {
    loadedNorm: number; emptyNorm: number; supplement: number;
    unitPrice: number; warningThreshold: number; criticalThreshold: number;
  }) => api.put<FuelConfig>(CONFIG.FUEL_CONFIG, data),

  getRoadConfig: () => api.get<RoadConfig | null>(CONFIG.ROAD_CONFIG),

  saveRoadConfig: (data: {
    tollPerStation: number; returnCargoBonus: number;
    defaultDriverSalary: number; twoPointDeliveryBonus: number;
    vehicleShiftDefault: number;
  }) => api.put<RoadConfig>(CONFIG.ROAD_CONFIG, data),

  getPorts: () => fetchAllPaginated<Port>(CONFIG.PORTS),

  getContainerTypes: () => fetchAllPaginated<ContainerType>(CONFIG.CONTAINER_TYPES),

  getRoutesList: (search?: string) =>
    fetchAllPaginated<Route>(CONFIG.ROUTES, search ? { search } : undefined),

  getAllCustomers: (search?: string) =>
    fetchAllPaginated<Customer>(CONFIG.CUSTOMERS, search ? { search } : undefined),

  getSalaryPeriodResolve: (month: number, year: number) =>
    api.get<SalaryPeriodRange>(`${CONFIG.SALARY_PERIOD_RESOLVE}${toQuery({ month, year })}`),

  getPenaltyReasons: () => fetchAllPaginated<PenaltyReason>(CONFIG.PENALTY_REASONS),

  getFuelPriceHistory: () => api.get<FuelPriceHistory[]>(CONFIG.FUEL_PRICE_HISTORY),

  getRoadAllowances: () => fetchAllPaginated<RoadAllowance>(CONFIG.ROAD_ALLOWANCES),

  getTrailers: () => fetchAllPaginated<Trailer>(CONFIG.TRAILERS),

  getPricingTables: () => fetchAllPaginated<PricingTable>(CONFIG.PRICING_TABLES),

  getAllSuppliers: () => fetchAllPaginated<Supplier>(CONFIG.SUPPLIERS),

  getAllExpenseCategories: () => fetchAllPaginated<ExpenseCategory>(CONFIG.EXPENSE_CATEGORIES),
};
