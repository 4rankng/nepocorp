import { useState, useEffect, useCallback } from 'react';
import { maintenanceService } from '@api/services';
import { 
  MaintenanceFilters,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest
} from '@api/types';

// Maintenance queries
export const useMaintenance = (filters?: MaintenanceFilters & { page?: number; limit?: number }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaintenance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await maintenanceService.getAll(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch maintenance'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMaintenance();
  }, [fetchMaintenance]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchMaintenance,
  };
};

export const useMaintenanceRecord = (id: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchMaintenanceRecord = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await maintenanceService.getById(id);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch maintenance record'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceRecord();
  }, [id]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

// Infinite query replacement with pagination state
export const useInfiniteMaintenance = (filters?: MaintenanceFilters) => {
  const [data, setData] = useState<{ pages: any[]; pageParams: number[] }>({ pages: [], pageParams: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const fetchPage = useCallback(async (pageParam = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await maintenanceService.getAll({ ...filters, page: pageParam, limit: 100 });
      const { pagination } = response;
      
      setData(prev => ({
        pages: [...prev.pages, response],
        pageParams: [...prev.pageParams, pageParam]
      }));
      
      setHasNextPage(pagination && pagination.page < pagination.total_pages);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch maintenance'));
      throw err;
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [filters]);

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    
    setIsFetchingNextPage(true);
    const nextPageParam = data.pageParams.length > 0 ? data.pageParams[data.pageParams.length - 1] + 1 : 1;
    await fetchPage(nextPageParam);
  }, [hasNextPage, isFetchingNextPage, data.pageParams, fetchPage]);

  useEffect(() => {
    setData({ pages: [], pageParams: [] });
    fetchPage(1);
  }, [fetchPage]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
};

// Specialized queries
export const useMaintenanceByLicensePlate = (licensePlate: string, page = 1, limit = 100) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!licensePlate) return;

    const fetchMaintenanceByLicensePlate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await maintenanceService.getByLicensePlate(licensePlate, page, limit);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch maintenance by license plate'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceByLicensePlate();
  }, [licensePlate, page, limit]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useMaintenanceByVendor = (vendorName: string, page = 1, limit = 100) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!vendorName) return;

    const fetchMaintenanceByVendor = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await maintenanceService.getByVendor(vendorName, page, limit);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch maintenance by vendor'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceByVendor();
  }, [vendorName, page, limit]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useMaintenanceByDateRange = (startDate: string, endDate: string, page = 1, limit = 100) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchMaintenanceByDateRange = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await maintenanceService.getByDateRange(startDate, endDate, page, limit);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch maintenance by date range'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceByDateRange();
  }, [startDate, endDate, page, limit]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useExpiringMaintenance = (daysAhead = 30) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchExpiringMaintenance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await maintenanceService.getExpiring(daysAhead);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch expiring maintenance'));
    } finally {
      setIsLoading(false);
    }
  }, [daysAhead]);

  useEffect(() => {
    fetchExpiringMaintenance();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchExpiringMaintenance, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchExpiringMaintenance]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchExpiringMaintenance,
  };
};

export const useOverdueMaintenance = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOverdueMaintenance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await maintenanceService.getOverdue();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch overdue maintenance'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverdueMaintenance();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchOverdueMaintenance, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchOverdueMaintenance]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchOverdueMaintenance,
  };
};

// Maintenance mutations
export const useCreateMaintenance = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: CreateMaintenanceRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await maintenanceService.create(data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create maintenance');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

export const useUpdateMaintenance = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ id, data }: { id: number; data: UpdateMaintenanceRequest }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await maintenanceService.update(id, data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update maintenance');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

export const useDeleteMaintenance = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await maintenanceService.delete(id);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete maintenance');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};