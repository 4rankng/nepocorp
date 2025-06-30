import { apiClient } from '@api/client/apiClient';
import { ApiResponse, PaginatedRequest, BaseEntity } from '@api/types';
import { AxiosRequestConfig } from 'axios';

export interface CrudService<T extends BaseEntity, CreateDTO, UpdateDTO> {
  getAll(params?: PaginatedRequest & Record<string, any>): Promise<ApiResponse<T[]>>;
  getById(id: number): Promise<ApiResponse<T>>;
  create(data: CreateDTO): Promise<ApiResponse<T>>;
  update(id: number, data: UpdateDTO): Promise<ApiResponse<T>>;
  delete(id: number): Promise<ApiResponse<void>>;
}

export abstract class BaseService<T extends BaseEntity, CreateDTO, UpdateDTO>
  implements CrudService<T, CreateDTO, UpdateDTO>
{
  protected constructor(protected readonly resourcePath: string) {}

  async getAll(params?: PaginatedRequest & Record<string, any>): Promise<ApiResponse<T[]>> {
    return apiClient.get<T[]>(this.resourcePath, { params });
  }

  async getById(id: number): Promise<ApiResponse<T>> {
    return apiClient.get<T>(`${this.resourcePath}/${id}`);
  }

  async create(data: CreateDTO): Promise<ApiResponse<T>> {
    return apiClient.post<T>(this.resourcePath, data);
  }

  async update(id: number, data: UpdateDTO): Promise<ApiResponse<T>> {
    return apiClient.put<T>(`${this.resourcePath}/${id}`, data);
  }

  async delete(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.resourcePath}/${id}`);
  }

  // Additional utility methods
  protected async getWithFilters(
    filters: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T[]>> {
    return apiClient.get<T[]>(this.resourcePath, {
      ...config,
      params: { ...config?.params, ...filters },
    });
  }

  protected async performAction<R>(
    id: number,
    action: string,
    data?: any
  ): Promise<ApiResponse<R>> {
    return apiClient.post<R>(`${this.resourcePath}/${id}/${action}`, data);
  }
}
