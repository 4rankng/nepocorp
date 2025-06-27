import { useState, useEffect, useCallback } from 'react';
import { authService } from '@api/services';
import { LoginRequest, User } from '@api/types';

// Login hook
export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
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

// Profile query
export const useProfile = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authService.getProfile();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

// Logout hook
export const useLogout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout();
      window.location.reload();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Logout failed');
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

// Get stored user data (from localStorage)
export const useStoredUser = (): User | null => {
  return authService.getStoredUser();
};

// Check if user is authenticated
export const useIsAuthenticated = (): boolean => {
  return authService.isAuthenticated();
};