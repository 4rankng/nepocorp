import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@api/services';
import { queryKeys } from './queryKeys';
import { LoginRequest, User } from '@api/types';

// Login mutation
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (response) => {
      // Invalidate and refetch user profile after successful login
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
      
      // Set user data in cache
      if (response.data?.user) {
        queryClient.setQueryData(queryKeys.auth.profile(), {
          status: 'success',
          message: 'Profile retrieved',
          data: response.data.user
        });
      }
    },
  });
};

// Profile query
export const useProfile = () => {
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: () => authService.getProfile(),
    enabled: authService.isAuthenticated(),
  });
};

// Logout mutation
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
    },
  });
};

// Get stored user data (from localStorage)
export const useStoredUser = (): User | null => {
  return authService.getStoredUser();
};

// Check if user is authenticated
export const useIsAuthenticated = (): boolean => {
  return authService.isAuthenticated();
};