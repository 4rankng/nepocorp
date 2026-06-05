import { useQuery } from '@tanstack/react-query';
import { configClient } from '../api/configClient';

export function useFleetData() {
  return useQuery({
    queryKey: ['fleet'],
    queryFn: async () => {
      const [trucks, drivers] = await Promise.all([
        configClient.getTrucks(),
        configClient.getDrivers(),
      ]);
      return { trucks, drivers };
    },
  });
}
