import { useState, useEffect, useCallback } from 'react';
import { tractorService, trailerService, containerService } from '@api/services';
import { 
  VehicleFilters,
  CreateTractorRequest,
  UpdateTractorRequest,
  CreateTrailerRequest,
  UpdateTrailerRequest,
  CreateContainerRequest,
  UpdateContainerRequest
} from '@api/types';

// Tractor hooks
export const useTractors = (filters?: VehicleFilters & { page?: number; limit?: number }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTractors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tractorService.getAll(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tractors'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTractors();
  }, [fetchTractors]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchTractors,
  };
};

export const useTractor = (id: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchTractor = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await tractorService.getById(id);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch tractor'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTractor();
  }, [id]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useActiveTractors = (page = 1, limit = 10) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveTractors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tractorService.getActive(page, limit);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch active tractors'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchActiveTractors();
  }, [fetchActiveTractors]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchActiveTractors,
  };
};

export const useCreateTractor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: CreateTractorRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tractorService.create(data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create tractor');
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

export const useUpdateTractor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ id, data }: { id: number; data: UpdateTractorRequest }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tractorService.update(id, data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update tractor');
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

export const useDeleteTractor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tractorService.delete(id);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete tractor');
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

// Trailer hooks
export const useTrailers = (filters?: VehicleFilters & { page?: number; limit?: number }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrailers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await trailerService.getAll(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch trailers'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTrailers();
  }, [fetchTrailers]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchTrailers,
  };
};

export const useTrailer = (id: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchTrailer = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await trailerService.getById(id);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch trailer'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrailer();
  }, [id]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useActiveTrailers = (page = 1, limit = 10) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveTrailers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await trailerService.getActive(page, limit);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch active trailers'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchActiveTrailers();
  }, [fetchActiveTrailers]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchActiveTrailers,
  };
};

export const useCreateTrailer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: CreateTrailerRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await trailerService.create(data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create trailer');
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

export const useUpdateTrailer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ id, data }: { id: number; data: UpdateTrailerRequest }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await trailerService.update(id, data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update trailer');
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

export const useDeleteTrailer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await trailerService.delete(id);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete trailer');
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

// Container hooks
export const useContainers = (filters?: VehicleFilters & { page?: number; limit?: number }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchContainers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await containerService.getAll(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch containers'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchContainers,
  };
};

export const useContainer = (id: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchContainer = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await containerService.getById(id);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch container'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchContainer();
  }, [id]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useActiveContainers = (page = 1, limit = 10) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveContainers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await containerService.getActive(page, limit);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch active containers'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchActiveContainers();
  }, [fetchActiveContainers]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchActiveContainers,
  };
};

export const useCreateContainer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: CreateContainerRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await containerService.create(data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create container');
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

export const useUpdateContainer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ id, data }: { id: number; data: UpdateContainerRequest }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await containerService.update(id, data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update container');
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

export const useDeleteContainer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await containerService.delete(id);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete container');
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