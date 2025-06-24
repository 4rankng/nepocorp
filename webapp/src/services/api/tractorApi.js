import apiClient from './apiClient';

export const tractorApi = {
  // Get all tractors with pagination
  getAll: async (page = 1, limit = 10) => {
    const response = await apiClient.get('/tractor', {
      params: { page, limit }
    });
    return response;
  },

  // Get all tractors without pagination
  getAllWithoutPagination: async () => {
    const response = await apiClient.get('/tractor', {
      params: { page: 1, limit: 1000 }
    });
    return response.data;
  },

  // Get tractor by ID
  getById: async (id) => {
    const response = await apiClient.get(`/tractor/${id}`);
    return response.data;
  },

  // Create new tractor
  create: async (data) => {
    const response = await apiClient.post('/tractor', data);
    return response;
  },

  // Update existing tractor
  update: async (id, data) => {
    const response = await apiClient.put(`/tractor/${id}`, data);
    return response;
  },

  // Delete tractor
  delete: async (id) => {
    const response = await apiClient.delete(`/tractor/${id}`);
    return response;
  },

  // Get count of tractors
  getCount: async () => {
    const response = await apiClient.get('/tractor', {
      params: { page: 1, limit: 1 }
    });
    return response.pagination?.records_count || 0;
  }
};