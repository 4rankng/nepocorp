import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salaryClient, salaryPeriodConfigClient, type WorkDayUpdate } from '../api/salaryClient';

export function useSalaryList(year: number, month: number) {
  return useQuery({
    queryKey: ['salary-list', year, month],
    queryFn: () => salaryClient.getAll(year, month),
    enabled: year >= 2020 && month >= 1 && month <= 12,
  });
}

export function useDriverSalary(driverId: number | null, year: number, month: number) {
  return useQuery({
    queryKey: ['driver-salary', driverId, year, month],
    queryFn: () => salaryClient.getSalary(driverId!, year, month),
    enabled: !!driverId && year >= 2020 && month >= 1 && month <= 12,
  });
}

export function useDriverWorkDays(driverId: number | null, year: number, month: number) {
  return useQuery({
    queryKey: ['driver-workdays', driverId, year, month],
    queryFn: () => salaryClient.getWorkDays(driverId!, year, month),
    enabled: !!driverId && year >= 2020 && month >= 1 && month <= 12,
  });
}

export function useUpdateWorkDays(driverId: number, year: number, month: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: WorkDayUpdate[]) =>
      salaryClient.updateWorkDays(driverId, year, month, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-workdays', driverId, year, month] });
      queryClient.invalidateQueries({ queryKey: ['driver-salary', driverId, year, month] });
      queryClient.invalidateQueries({ queryKey: ['salary-list', year, month] });
    },
  });
}

export function useSalaryPeriodDefault() {
  return useQuery({
    queryKey: ['salary-period-default'],
    queryFn: () => salaryPeriodConfigClient.getDefault(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSalaryPeriodDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ startDay, endDay }: { startDay: number; endDay: number }) =>
      salaryPeriodConfigClient.updateDefault(startDay, endDay),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-period-default'] });
      queryClient.invalidateQueries({ queryKey: ['salary-period-resolve'] });
      queryClient.invalidateQueries({ queryKey: ['driver-workdays'] });
      queryClient.invalidateQueries({ queryKey: ['driver-salary'] });
      queryClient.invalidateQueries({ queryKey: ['salary-list'] });
    },
  });
}

export function useDeleteSalaryPeriodDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => salaryPeriodConfigClient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-period-default'] });
      queryClient.invalidateQueries({ queryKey: ['salary-period-resolve'] });
      queryClient.invalidateQueries({ queryKey: ['driver-workdays'] });
      queryClient.invalidateQueries({ queryKey: ['driver-salary'] });
      queryClient.invalidateQueries({ queryKey: ['salary-list'] });
    },
  });
}

export function useResolveSalaryPeriod(year: number, month: number) {
  return useQuery({
    queryKey: ['salary-period-resolve', year, month],
    queryFn: () => salaryPeriodConfigClient.resolve(year, month),
    enabled: year >= 2020 && month >= 1 && month <= 12,
  });
}


