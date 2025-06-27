import { apiClient } from '@api/client/apiClient';
import { ApiResponse } from '@api/types';

interface HealthStatus {
  status: string;
  timestamp: string;
  version?: string;
}

class HealthService {
  async check(): Promise<ApiResponse<HealthStatus>> {
    return apiClient.get<HealthStatus>('/healthz');
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.check();
      return response.status === 'success';
    } catch {
      return false;
    }
  }
}

export const healthService = new HealthService();