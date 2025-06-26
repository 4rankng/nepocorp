import apiClient from './apiClient';

export const maintenanceItemsApi = {
  // Get all maintenance items with pagination and optional filters
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit, ...filters };
    const response = await apiClient.get('/maintenance-items', { params });
    return response;
  },

  // Get maintenance items by license plate
  getByLicensePlate: async (licensePlate, page = 1, limit = 10) => {
    const response = await apiClient.get('/maintenance-items', { 
      params: { page, limit, license_plate: licensePlate }
    });
    return response;
  },

  // Get maintenance items with vendor filter
  getByVendor: async (vendorName, page = 1, limit = 10) => {
    const response = await apiClient.get('/maintenance-items', {
      params: { page, limit, vendor_name: vendorName }
    });
    return response;
  },

  // Get maintenance items with date range filter
  getByDateRange: async (startDate, endDate, page = 1, limit = 10) => {
    const response = await apiClient.get('/maintenance-items', {
      params: { 
        page, 
        limit, 
        start_date: startDate,
        end_date: endDate 
      }
    });
    return response;
  },

  // Get count of maintenance items
  getCount: async () => {
    const response = await apiClient.get('/maintenance-items', {
      params: { page: 1, limit: 1 }
    });
    return response.pagination?.records_count || 0;
  }
};