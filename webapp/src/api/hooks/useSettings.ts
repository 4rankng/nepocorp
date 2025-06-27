import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@api/services';
import { queryKeys } from './queryKeys';
import { UpdateSettingRequest, SettingKey } from '@api/types';

// Generic setting hooks
export const useSetting = (key: string) => {
  return useQuery({
    queryKey: queryKeys.settings.detail(key),
    queryFn: () => settingsService.get(key),
    enabled: !!key,
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateSettingRequest }) => 
      settingsService.update(key, data),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.detail(key) });
    },
  });
};

// Specific setting hooks
export const useDefaultTaxRate = () => {
  return useQuery({
    queryKey: queryKeys.settings.detail(SettingKey.DEFAULT_TAX_RATE),
    queryFn: () => settingsService.getDefaultTaxRate(),
  });
};

export const useUpdateDefaultTaxRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: number) => settingsService.updateDefaultTaxRate(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.detail(SettingKey.DEFAULT_TAX_RATE) 
      });
    },
  });
};

export const useCurrency = () => {
  return useQuery({
    queryKey: queryKeys.settings.detail(SettingKey.CURRENCY),
    queryFn: () => settingsService.getCurrency(),
  });
};

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: string) => settingsService.updateCurrency(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.detail(SettingKey.CURRENCY) 
      });
    },
  });
};

export const useDateFormat = () => {
  return useQuery({
    queryKey: queryKeys.settings.detail(SettingKey.DATE_FORMAT),
    queryFn: () => settingsService.getDateFormat(),
  });
};

export const useUpdateDateFormat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: string) => settingsService.updateDateFormat(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.detail(SettingKey.DATE_FORMAT) 
      });
    },
  });
};

export const usePaginationLimit = () => {
  return useQuery({
    queryKey: queryKeys.settings.detail(SettingKey.PAGINATION_LIMIT),
    queryFn: () => settingsService.getPaginationLimit(),
  });
};

export const useUpdatePaginationLimit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: number) => settingsService.updatePaginationLimit(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.detail(SettingKey.PAGINATION_LIMIT) 
      });
    },
  });
};