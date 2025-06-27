import { AuditableEntity } from './common.types';

// Vehicle types
export interface Tractor extends AuditableEntity {
  license_plate: string;
  description?: string;
  is_active: boolean;
}

export interface Trailer extends AuditableEntity {
  license_plate: string;
  description?: string;
  is_active: boolean;
}

export interface Container extends AuditableEntity {
  container_number: string;
  description?: string;
  is_active: boolean;
}

// Request types
export interface CreateTractorRequest {
  license_plate: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateTractorRequest extends Partial<CreateTractorRequest> {}

export interface CreateTrailerRequest {
  license_plate: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateTrailerRequest extends Partial<CreateTrailerRequest> {}

export interface CreateContainerRequest {
  container_number: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateContainerRequest extends Partial<CreateContainerRequest> {}

// Filter types
export interface VehicleFilters {
  is_active?: boolean;
  search?: string;
}