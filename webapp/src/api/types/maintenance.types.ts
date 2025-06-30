import { AuditableEntity } from './common.types';

// Maintenance record type
export interface MaintenanceRecord extends AuditableEntity {
  expense_id: number;
  license_plate: string;
  vendor_name: string;
  item_name: string;
  price: number;
  quantity: number;
  tax_rate: number;
  total: number;
  install_date: string;
  expiry_date?: string;
}

// Request types
export interface CreateMaintenanceRequest {
  expense_id: number;
  license_plate: string;
  vendor_name: string;
  item_name: string;
  price: number;
  quantity: number;
  tax_rate: number;
  total: number;
  install_date: string;
  expiry_date?: string;
}

export interface UpdateMaintenanceRequest extends Partial<CreateMaintenanceRequest> {}

// Filter types
export interface MaintenanceFilters {
  license_plate?: string;
  vendor_name?: string;
  item_name?: string;
  start_date?: string;
  end_date?: string;
}
