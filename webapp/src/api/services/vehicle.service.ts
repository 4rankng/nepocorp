import { BaseService } from './base.service';
import { ApiResponse } from '@api/types';
import {
  Tractor,
  Trailer,
  Container,
  Route,
  FuelStandard,
  CreateTractorRequest,
  UpdateTractorRequest,
  CreateTrailerRequest,
  UpdateTrailerRequest,
  CreateContainerRequest,
  UpdateContainerRequest,
  CreateRouteRequest,
  UpdateRouteRequest,
  CreateFuelStandardRequest,
  UpdateFuelStandardRequest,
  VehicleFilters,
  RouteFilters,
  FuelStandardFilters
} from '@api/types/vehicle.types';

class TractorService extends BaseService<Tractor, CreateTractorRequest, UpdateTractorRequest> {
  constructor() {
    super('/tractor');
  }

  async getAll(params?: VehicleFilters & { page?: number; limit?: number }): Promise<ApiResponse<Tractor[]>> {
    return super.getAll(params);
  }

  async getActive(page = 1, limit = 100): Promise<ApiResponse<Tractor[]>> {
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

  async getActive(page = 1, limit = 100): Promise<ApiResponse<Trailer[]>> {
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

  async getActive(page = 1, limit = 100): Promise<ApiResponse<Container[]>> {
    return this.getAll({ is_active: true, page, limit });
  }

  async searchByNumber(query: string): Promise<ApiResponse<Container[]>> {
    return this.getAll({ search: query });
  }
}

class RouteService extends BaseService<Route, CreateRouteRequest, UpdateRouteRequest> {
  constructor() {
    super('/route');
  }

  async getAll(params?: RouteFilters & { page?: number; limit?: number }): Promise<ApiResponse<Route[]>> {
    return super.getAll(params);
  }

  async getByTrailerType(trailerType: string): Promise<ApiResponse<Route[]>> {
    return this.getAll({ trailer_type: trailerType });
  }

  async search(query: string): Promise<ApiResponse<Route[]>> {
    return this.getAll({ search: query });
  }
}

class FuelStandardService extends BaseService<FuelStandard, CreateFuelStandardRequest, UpdateFuelStandardRequest> {
  constructor() {
    super('/fuel-standard');
  }

  async getAll(params?: FuelStandardFilters & { page?: number; limit?: number }): Promise<ApiResponse<FuelStandard[]>> {
    return super.getAll(params);
  }

  async getByTractor(tractorId: number): Promise<ApiResponse<FuelStandard[]>> {
    return this.client.get(`${this.basePath}/tractor/${tractorId}`);
  }

  async getByTractorAndType(tractorId: number, trailerType: string, loadCategory: string): Promise<ApiResponse<FuelStandard>> {
    return this.client.get(`${this.basePath}/tractor/${tractorId}/${trailerType}/${loadCategory}`);
  }

  async getByTrailerType(trailerType: string): Promise<ApiResponse<FuelStandard[]>> {
    return this.client.get(`${this.basePath}/trailer-type/${trailerType}`);
  }

  async getByLoadCategory(loadCategory: string): Promise<ApiResponse<FuelStandard[]>> {
    return this.client.get(`${this.basePath}/load-category/${loadCategory}`);
  }
}

export const tractorService = new TractorService();
export const trailerService = new TrailerService();
export const containerService = new ContainerService();
export const routeService = new RouteService();
export const fuelStandardService = new FuelStandardService();