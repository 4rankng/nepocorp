import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { maintenanceService } from '@api/services';
import { queryKeys } from './queryKeys';
import { 
  MaintenanceFilters,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest
} from '@api/types';

// Maintenance queries
export const useMaintenance = (filters?: MaintenanceFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: queryKeys.maintenance.list(filters),
    queryFn: () => maintenanceService.getAll(filters),
  });
};

export const useMaintenanceRecord = (id: number) => {
  return useQuery({
    queryKey: queryKeys.maintenance.detail(id),
    queryFn: () => maintenanceService.getById(id),
    enabled: !!id,
  });
};

// Infinite query for maintenance pagination
export const useInfiniteMaintenance = (filters?: MaintenanceFilters) => {
  return useInfiniteQuery({
    queryKey: queryKeys.maintenance.list(filters),
    queryFn: ({ pageParam = 1 }) => maintenanceService.getAll({ ...filters, page: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination && pagination.page < pagination.total_pages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

// Specialized queries
export const useMaintenanceByLicensePlate = (licensePlate: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.maintenance.list({ license_plate: licensePlate, page, limit }),
    queryFn: () => maintenanceService.getByLicensePlate(licensePlate, page, limit),
    enabled: !!licensePlate,
  });
};

export const useMaintenanceByVendor = (vendorName: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.maintenance.list({ vendor_name: vendorName, page, limit }),
    queryFn: () => maintenanceService.getByVendor(vendorName, page, limit),
    enabled: !!vendorName,
  });
};

export const useMaintenanceByDateRange = (startDate: string, endDate: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.maintenance.list({ start_date: startDate, end_date: endDate, page, limit }),
    queryFn: () => maintenanceService.getByDateRange(startDate, endDate, page, limit),
    enabled: !!startDate && !!endDate,
  });
};

export const useExpiringMaintenance = (daysAhead = 30) => {
  return useQuery({
    queryKey: queryKeys.maintenance.expiring(daysAhead),
    queryFn: () => maintenanceService.getExpiring(daysAhead),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

export const useOverdueMaintenance = () => {
  return useQuery({
    queryKey: queryKeys.maintenance.overdue(),
    queryFn: () => maintenanceService.getOverdue(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Maintenance mutations
export const useCreateMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaintenanceRequest) => maintenanceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.expiring() });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.overdue() });
    },
  });
};

export const useUpdateMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMaintenanceRequest }) => 
      maintenanceService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.expiring() });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.overdue() });
    },
  });
};

export const useDeleteMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.maintenance.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.expiring() });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.overdue() });
    },
  });
};