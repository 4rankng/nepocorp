import { useQuery } from '@tanstack/react-query';
import { driverClient } from '../api/driverClient';

export function useDriverTrips() {
  return useQuery({
    queryKey: ['driver-trips'],
    queryFn: () => driverClient.getTrips(),
  });
}

export function useDriverEarnings(month: number, year: number) {
  return useQuery({
    queryKey: ['driver-earnings', month, year],
    queryFn: () => driverClient.getEarnings(month, year),
    enabled: month >= 1 && month <= 12 && year >= 2000,
  });
}

export function useDriverPenalties(params?: { dateFrom: string; dateTo: string }) {
  return useQuery({
    queryKey: ['driver-penalties', params],
    queryFn: () => driverClient.getPenalties(params),
  });
}
