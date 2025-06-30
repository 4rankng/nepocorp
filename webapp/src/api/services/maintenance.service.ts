import { BaseService } from './base.service';
import { ApiResponse } from '@api/types';
import {
  MaintenanceRecord,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest,
  MaintenanceFilters,
} from '@api/types/maintenance.types';

class MaintenanceService extends BaseService<
  MaintenanceRecord,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest
> {
  constructor() {
    super('/maintenance');
  }

  // Override getAll to support maintenance-specific filters
  async getAll(
    params?: MaintenanceFilters & { page?: number; limit?: number }
  ): Promise<ApiResponse<MaintenanceRecord[]>> {
    return super.getAll(params);
  }

  // Convenience methods for common queries
  async getByLicensePlate(
    licensePlate: string,
    page = 1,
    limit = 100
  ): Promise<ApiResponse<MaintenanceRecord[]>> {
    return this.getAll({ license_plate: licensePlate, page, limit });
  }

  async getByVendor(
    vendorName: string,
    page = 1,
    limit = 100
  ): Promise<ApiResponse<MaintenanceRecord[]>> {
    return this.getAll({ vendor_name: vendorName, page, limit });
  }

  async getByItemName(
    itemName: string,
    page = 1,
    limit = 100
  ): Promise<ApiResponse<MaintenanceRecord[]>> {
    return this.getAll({ item_name: itemName, page, limit });
  }

  async getByDateRange(
    startDate: string,
    endDate: string,
    page = 1,
    limit = 100
  ): Promise<ApiResponse<MaintenanceRecord[]>> {
    return this.getAll({ start_date: startDate, end_date: endDate, page, limit });
  }

  async getExpiring(daysAhead = 30): Promise<ApiResponse<MaintenanceRecord[]>> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.getAll({
      start_date: today.toISOString().split('T')[0],
      end_date: futureDate.toISOString().split('T')[0],
    });
  }

  async getOverdue(): Promise<ApiResponse<MaintenanceRecord[]>> {
    const today = new Date().toISOString().split('T')[0];

    return this.getAll({
      end_date: today,
      // This would need backend support for filtering expired items
    });
  }
}

export const maintenanceService = new MaintenanceService();
