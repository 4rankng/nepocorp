import { BaseService } from './base.service';
import { ApiResponse } from '@api/types';
import {
  Tractor,
  Trailer,
  Container,
  CreateTractorRequest,
  UpdateTractorRequest,
  CreateTrailerRequest,
  UpdateTrailerRequest,
  CreateContainerRequest,
  UpdateContainerRequest,
  VehicleFilters
} from '@api/types/vehicle.types';

class TractorService extends BaseService<Tractor, CreateTractorRequest, UpdateTractorRequest> {
  constructor() {
    super('/tractor');
  }

  async getAll(params?: VehicleFilters & { page?: number; limit?: number }): Promise<ApiResponse<Tractor[]>> {
    return super.getAll(params);
  }

  async getActive(page = 1, limit = 10): Promise<ApiResponse<Tractor[]>> {
    return this.getAll({ is_active: true, page, limit });
  }

  async searchByLicensePlate(query: string): Promise<ApiResponse<Tractor[]>> {
    return this.getAll({ search: query });
  }
}

class TrailerService extends BaseService<Trailer, CreateTrailerRequest, UpdateTrailerRequest> {
  constructor() {
    super('/trailer');
  }

  async getAll(params?: VehicleFilters & { page?: number; limit?: number }): Promise<ApiResponse<Trailer[]>> {
    return super.getAll(params);
  }

  async getActive(page = 1, limit = 10): Promise<ApiResponse<Trailer[]>> {
    return this.getAll({ is_active: true, page, limit });
  }

  async searchByLicensePlate(query: string): Promise<ApiResponse<Trailer[]>> {
    return this.getAll({ search: query });
  }
}

class ContainerService extends BaseService<Container, CreateContainerRequest, UpdateContainerRequest> {
  constructor() {
    super('/container');
  }

  async getAll(params?: VehicleFilters & { page?: number; limit?: number }): Promise<ApiResponse<Container[]>> {
    return super.getAll(params);
  }

  async getActive(page = 1, limit = 10): Promise<ApiResponse<Container[]>> {
    return this.getAll({ is_active: true, page, limit });
  }

  async searchByNumber(query: string): Promise<ApiResponse<Container[]>> {
    return this.getAll({ search: query });
  }
}

export const tractorService = new TractorService();
export const trailerService = new TrailerService();
export const containerService = new ContainerService();