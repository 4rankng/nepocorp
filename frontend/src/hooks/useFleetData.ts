import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Truck, Driver, PaginatedResponse } from '@nepocorp/shared';

export function useFleetData() {
  return useQuery({
    queryKey: ['fleet'],
    queryFn: async () => {
      const [trucks, drivers] = await Promise.all([
        api.get<PaginatedResponse<Truck>>('/trucks'),
        api.get<PaginatedResponse<Driver>>('/drivers'),
      ]);
      return {
        trucks: trucks.items,
        drivers: drivers.items,
      };
    },
  });
}
