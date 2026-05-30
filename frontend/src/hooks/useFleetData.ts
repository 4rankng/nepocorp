import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Truck, Trailer, Driver, PaginatedResponse } from '@nepocorp/shared';

export function useFleetData() {
  return useQuery({
    queryKey: ['fleet'],
    queryFn: async () => {
      const [trucks, trailers, drivers] = await Promise.all([
        api.get<PaginatedResponse<Truck>>('/trucks'),
        api.get<PaginatedResponse<Trailer>>('/trailers'),
        api.get<PaginatedResponse<Driver>>('/drivers'),
      ]);
      return {
        trucks: trucks.items,
        trailers: trailers.items,
        drivers: drivers.items,
      };
    },
  });
}
