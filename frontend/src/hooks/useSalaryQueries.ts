import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salaryClient, type WorkDayUpdate } from '../api/salaryClient';

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
