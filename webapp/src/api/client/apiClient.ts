import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { ApiError, ApiResponse } from '@api/types/common.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const REQUEST_TIMEOUT = 30000; // 30 seconds

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8',
      },
    });

    this.setupInterceptors();
  }

  private processQueue(error: any, token: string | null = null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAuthToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Return the response data directly (already in our format)
        return response.data;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.axiosInstance(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          const refreshToken = this.getRefreshToken();
          if (!refreshToken) {
            this.clearAuthTokens();
            window.location.href = '/';
            return Promise.reject(error);
          }

          try {
            const response = await this.refreshAccessToken(refreshToken);
            if (response.data?.access_token) {
              this.setAuthToken(response.data.access_token);
              if (response.data.refresh_token) {
                this.setRefreshToken(response.data.refresh_token);
              }
              this.processQueue(null, response.data.access_token);
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.clearAuthTokens();
            window.location.href = '/';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Transform error to our ApiError format
        const apiError: ApiError = {
          status: 'error',
          message: error.response?.data?.message || error.message || 'An error occurred',
          errors: error.response?.data?.errors || {
            code: error.response?.status || 5000,
            message: error.response?.data?.message || error.message || 'Unknown error'
          }
        };

        return Promise.reject(apiError);
      }
    );
  }

  private async refreshAccessToken(refreshToken: string): Promise<ApiResponse<any>> {
    return this.axiosInstance.post('/auth/refresh', {
      refresh_token: refreshToken
    });
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  }

  private clearAuthTokens(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth');
  }

  // Validation helper
  private validateResponse<T>(data: any, schema?: z.ZodSchema<T>): T {
    if (schema) {
      try {
        return schema.parse(data);
      } catch (error) {
        console.warn('Response validation failed:', error);
        // In production, you might want to throw an error here
        // For now, we'll just log and return the unvalidated data
      }
    }
    return data;
  }

  // HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.get<any, ApiResponse<T>>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.post<any, ApiResponse<T>>(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.put<any, ApiResponse<T>>(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.patch<any, ApiResponse<T>>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.delete<any, ApiResponse<T>>(url, config);
  }

  // HTTP methods with validation
  async getWithValidation<T>(url: string, schema: z.ZodSchema<T>, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.get<T>(url, config);
    return this.validateResponse(response, schema);
  }

  async postWithValidation<T>(url: string, data: any, schema: z.ZodSchema<T>, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.post<T>(url, data, config);
    return this.validateResponse(response, schema);
  }

  async putWithValidation<T>(url: string, data: any, schema: z.ZodSchema<T>, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.put<T>(url, data, config);
    return this.validateResponse(response, schema);
  }

  async deleteWithValidation<T>(url: string, schema: z.ZodSchema<T>, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.delete<T>(url, config);
    return this.validateResponse(response, schema);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();