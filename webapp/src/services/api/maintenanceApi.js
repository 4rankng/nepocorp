import apiClient from './apiClient';

export const maintenanceApi = {
  // Get all maintenance records with pagination and optional filters
  getAll: async (page = 1, limit = 100, filters = {}) => {
    const params = { page, limit, ...filters };
    const response = await apiClient.get('/maintenance', { params });
    return response;
  },

  // Get maintenance record by ID
  getById: async id => {
    const response = await apiClient.get(`/maintenance/${id}`);
    return response;
  },

  // Create new maintenance record
  create: async maintenanceData => {
    const response = await apiClient.post('/maintenance', maintenanceData);
    return response;
  },

  // Update existing maintenance record
  update: async (id, maintenanceData) => {
    const response = await apiClient.put(`/maintenance/${id}`, maintenanceData);
    return response;
  },

  // Delete maintenance record
  delete: async id => {
    const response = await apiClient.delete(`/maintenance/${id}`);
    return response;
  },

  // Get maintenance records by license plate
  getByLicensePlate: async (licensePlate, page = 1, limit = 100) => {
    const response = await apiClient.get('/maintenance', {
      params: { page, limit, license_plate: licensePlate },
    });
    return response;
  },

  // Get maintenance records with vendor filter
  getByVendor: async (vendorName, page = 1, limit = 100) => {
    const response = await apiClient.get('/maintenance', {
      params: { page, limit, vendor_name: vendorName },
    });
    return response;
  },

  // Get maintenance records with date range filter
  getByDateRange: async (startDate, endDate, page = 1, limit = 100) => {
    const response = await apiClient.get('/maintenance', {
      params: {
        page,
        limit,
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response;
  },

  // Get maintenance records with item name filter
  getByItemName: async (itemName, page = 1, limit = 100) => {
    const response = await apiClient.get('/maintenance', {
      params: { page, limit, item_name: itemName },
    });
    return response;
  },

  // Get count of maintenance records
  getCount: async () => {
    const response = await apiClient.get('/maintenance', {
      params: { page: 1, limit: 1 },
    });
    return response.pagination?.records_count || 0;
  },
};
