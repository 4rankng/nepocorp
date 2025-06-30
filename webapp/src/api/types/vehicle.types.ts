import { AuditableEntity } from './common.types';

// Vehicle types
export interface Tractor extends AuditableEntity {
  license_plate: string;
  make?: string;
  model?: string;
  year_of_manufacture?: number;
  inspection_due_date?: string;
  road_fee_due_date?: string;
  insurance_policy_number?: string;
  insurance_expiry_date?: string;
  remark?: string;
}

export interface Trailer extends AuditableEntity {
  license_plate: string;
  type?: string;
  make?: string;
  model?: string;
  year_of_manufacture?: number;
  remark?: string;
}

export interface Container extends AuditableEntity {
  container_number: string;
  description?: string;
  is_active: boolean;
}

export interface Route extends AuditableEntity {
  name: string;
  trailer_type: string;
  base_fee: number;
  surcharge: number;
  discount: number;
  is_two_way_combined: boolean;
  notes?: string;
}

export interface FuelStandard extends AuditableEntity {
  tractor_id: number;
  trailer_type: string;
  load_category: 'under_20t' | 'over_20t' | 'empty';
  consumption_rate: number;
  surcharge_rate_mountain: number;
  notes?: string;
  tractor?: Tractor;
}

// Request types
export interface CreateTractorRequest {
  license_plate: string;
  make?: string;
  model?: string;
  year_of_manufacture?: number;
  inspection_due_date?: string;
  road_fee_due_date?: string;
  insurance_policy_number?: string;
  insurance_expiry_date?: string;
  remark?: string;
}

export interface UpdateTractorRequest extends Partial<CreateTractorRequest> {}

export interface CreateTrailerRequest {
  license_plate: string;
  type?: string;
  make?: string;
  model?: string;
  year_of_manufacture?: number;
  remark?: string;
}

export interface UpdateTrailerRequest extends Partial<CreateTrailerRequest> {}

export interface CreateContainerRequest {
  container_number: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateContainerRequest extends Partial<CreateContainerRequest> {}

export interface CreateRouteRequest {
  name: string;
  trailer_type: string;
  base_fee?: number;
  surcharge?: number;
  discount?: number;
  is_two_way_combined?: boolean;
  notes?: string;
}

export interface UpdateRouteRequest extends Partial<CreateRouteRequest> {}

export interface CreateFuelStandardRequest {
  tractor_id: number;
  trailer_type: string;
  load_category: 'under_20t' | 'over_20t' | 'empty';
  consumption_rate: number;
  surcharge_rate_mountain?: number;
  notes?: string;
}

export interface UpdateFuelStandardRequest extends Partial<CreateFuelStandardRequest> {}

// Filter types
export interface VehicleFilters {
  is_active?: boolean;
  search?: string;
}

export interface RouteFilters {
  trailer_type?: string;
  search?: string;
}

export interface FuelStandardFilters {
  tractor_id?: number;
  trailer_type?: string;
  load_category?: string;
  search?: string;
}
