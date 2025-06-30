import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '@api/services';
import { UpdateSettingRequest, SettingKey } from '@api/types';

// Generic setting hooks
export const useSetting = (key: string) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!key) return;

    const fetchSetting = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await settingsService.get(key);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch setting'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSetting();
  }, [key]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useUpdateSetting = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ key, data }: { key: string; data: UpdateSettingRequest }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await settingsService.update(key, data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update setting');
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

// Specific setting hooks
export const useDefaultTaxRate = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTaxRate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await settingsService.getDefaultTaxRate();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch tax rate'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaxRate();
  }, []);

  return { data, isLoading, error, isError: !!error, isSuccess: !isLoading && !error && !!data };
};

export const useUpdateDefaultTaxRate = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (value: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await settingsService.updateDefaultTaxRate(value);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update tax rate');
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

export const useCurrency = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCurrency = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await settingsService.getCurrency();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch currency'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrency();
  }, []);

  return { data, isLoading, error, isError: !!error, isSuccess: !isLoading && !error && !!data };
};

export const useUpdateCurrency = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (value: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await settingsService.updateCurrency(value);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update currency');
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

export const useDateFormat = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDateFormat = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await settingsService.getDateFormat();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch date format'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDateFormat();
  }, []);

  return { data, isLoading, error, isError: !!error, isSuccess: !isLoading && !error && !!data };
};

export const useUpdateDateFormat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (value: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await settingsService.updateDateFormat(value);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update date format');
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

export const usePaginationLimit = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPaginationLimit = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await settingsService.getPaginationLimit();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pagination limit'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaginationLimit();
  }, []);

  return { data, isLoading, error, isError: !!error, isSuccess: !isLoading && !error && !!data };
};

export const useUpdatePaginationLimit = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (value: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await settingsService.updatePaginationLimit(value);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update pagination limit');
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
