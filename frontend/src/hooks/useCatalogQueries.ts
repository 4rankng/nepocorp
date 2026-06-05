import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configClient } from '../api/configClient';
import { userClient } from '../api/userClient';
import type {
  Truck as TruckType,
  Driver as DriverType,
  FuelConfig,
  RoadConfig,
  SalaryPeriodRange,
  CapTableHistory,
  Port as PortType,
  ContainerType as ContainerTypeType,
} from '@nepocorp/shared';

export function useCapTable() {
  return useQuery<CapTableHistory[]>({
    queryKey: ['cap-table'],
    queryFn: () => configClient.getCapTable(),
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

export function useRoadConfig() {
  return useQuery<RoadConfig | null>({
    queryKey: ['road-config'],
    queryFn: () => configClient.getRoadConfig(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrucksAndDrivers(options?: { enabled?: boolean }) {
  return useQuery<{ trucks: TruckType[]; drivers: DriverType[] }>({
    queryKey: ['trucks-drivers'],
    queryFn: async () => {
      const [trucks, drivers] = await Promise.all([
        configClient.getTrucks(),
        configClient.getDrivers(),
      ]);
      return { trucks, drivers };
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

/* ── Config mutations ── */

export function useSaveFuelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof configClient.saveFuelConfig>[0]) =>
      configClient.saveFuelConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-config'] });
      queryClient.invalidateQueries({ queryKey: ['cfg-count', 'fuel-config'] });
    },
  });
}

export function useSaveRoadConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof configClient.saveRoadConfig>[0]) =>
      configClient.saveRoadConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['road-config'] });
    },
  });
}

/* ── Config entity queries (for pages that currently use raw api.get) ── */

export function usePorts() {
  return useQuery<PortType[]>({
    queryKey: ['ports'],
    queryFn: () => configClient.getPorts(),
  });
}

export function useContainerTypes() {
  return useQuery<ContainerTypeType[]>({
    queryKey: ['container-types'],
    queryFn: () => configClient.getContainerTypes(),
  });
}

export function useRoutesDropdown() {
  return useQuery({
    queryKey: ['routes-dropdown'],
    queryFn: () => configClient.getRoutesList(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllCustomers() {
  return useQuery({
    queryKey: ['all-customers'],
    queryFn: () => configClient.getAllCustomers(),
    staleTime: 5 * 60 * 1000,
  });
}
