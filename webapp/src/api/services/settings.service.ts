import { apiClient } from '@api/client/apiClient';
import { ApiResponse } from '@api/types';
import { Setting, UpdateSettingRequest, SettingKey } from '@api/types/settings.types';

class SettingsService {
  private readonly basePath = '/settings';

  async get(key: string): Promise<ApiResponse<Setting>> {
    return apiClient.get<Setting>(`${this.basePath}/${key}`);
  }

  async update(key: string, data: UpdateSettingRequest): Promise<ApiResponse<Setting>> {
    return apiClient.put<Setting>(`${this.basePath}/${key}`, data);
  }

  // Convenience methods for common settings
  async getDefaultTaxRate(): Promise<ApiResponse<Setting>> {
    return this.get(SettingKey.DEFAULT_TAX_RATE);
  }

  async updateDefaultTaxRate(value: number): Promise<ApiResponse<Setting>> {
    return this.update(SettingKey.DEFAULT_TAX_RATE, { value });
  }

  async getCurrency(): Promise<ApiResponse<Setting>> {
    return this.get(SettingKey.CURRENCY);
  }

  async updateCurrency(value: string): Promise<ApiResponse<Setting>> {
    return this.update(SettingKey.CURRENCY, { value });
  }

  async getDateFormat(): Promise<ApiResponse<Setting>> {
    return this.get(SettingKey.DATE_FORMAT);
  }

  async updateDateFormat(value: string): Promise<ApiResponse<Setting>> {
    return this.update(SettingKey.DATE_FORMAT, { value });
  }

  async getPaginationLimit(): Promise<ApiResponse<Setting>> {
    return this.get(SettingKey.PAGINATION_LIMIT);
  }

  async updatePaginationLimit(value: number): Promise<ApiResponse<Setting>> {
    return this.update(SettingKey.PAGINATION_LIMIT, { value });
  }
}

export const settingsService = new SettingsService();
