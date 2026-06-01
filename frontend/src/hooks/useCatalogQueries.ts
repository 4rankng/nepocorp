import { useQuery } from '@tanstack/react-query';
import { configClient } from '../api/configClient';
import { userClient } from '../api/userClient';
import type {
  Truck as TruckType,
  Driver as DriverType,
  FuelConfig,
  SalaryPeriodRange,
  CapTableHistory,
} from '@nepocorp/shared';

export function useCapTable() {
  return useQuery<CapTableHistory[]>({
    queryKey: ['cap-table'],
    queryFn: async () => {
      const res = await configClient.getCapTable();
      return res.items;
    },
  });
}

export function useSalaryPeriod(month: number, year: number) {
  return useQuery<SalaryPeriodRange>({
    queryKey: ['salary-period', month, year],
    queryFn: () => configClient.getSalaryPeriodResolve(month, year),
    staleTime: 30 * 60 * 1000,
    enabled: month >= 1 && month <= 12 && year >= 2000,
  });
}

export function useFuelConfig() {
  return useQuery<FuelConfig | null>({
    queryKey: ['fuel-config'],
    queryFn: () => configClient.getFuelConfig(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrucksAndDrivers(options?: { enabled?: boolean }) {
  return useQuery<{ trucks: TruckType[]; drivers: DriverType[] }>({
    queryKey: ['trucks-drivers'],
    queryFn: async () => {
      const [trucksRes, driversRes] = await Promise.all([
        configClient.getTrucks({ pageSize: 50 }),
        configClient.getDrivers(),
      ]);
      return {
        trucks: trucksRes.items,
        drivers: driversRes.items,
      };
    },
    enabled: options?.enabled ?? true,
  });
}

export function useSuppliers(page?: number, search?: string) {
  return useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => configClient.getSuppliers(page, search),
  });
}

export function useExpenseCategories(page?: number, search?: string) {
  return useQuery({
    queryKey: ['expense-categories', page, search],
    queryFn: () => configClient.getExpenseCategories(page, search),
  });
}

export function useCustomers(page: number, search: string) {
  return useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => configClient.getCustomers(page, search),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userClient.getUsers(),
  });
}
