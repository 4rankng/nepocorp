import { useState, useEffect, useCallback } from 'react';
import { healthService } from '@api/services';

export const useHealthCheck = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const response = await healthService.check();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Health check failed'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchHealth,
  };
};

export const useApiStatus = () => {
  const { data, isLoading, error } = useHealthCheck();

  return {
    isOnline: !error && data?.status === 'success',
    isLoading,
    error,
    data,
  };
};
