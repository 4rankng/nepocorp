import { useQuery } from '@tanstack/react-query';
import { healthService } from '@api/services';
import { queryKeys } from './queryKeys';

export const useHealthCheck = () => {
  return useQuery({
    queryKey: queryKeys.health.status(),
    queryFn: () => healthService.check(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // 25 seconds
  });
};

export const useApiStatus = () => {
  const { data, isLoading, error } = useHealthCheck();
  
  return {
    isOnline: !error && data?.status === 'success',
    isLoading,
    error,
    data
  };
};