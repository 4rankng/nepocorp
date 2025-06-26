import apiClient from './apiClient';

export const trailerApi = {
  // Get all trailers with pagination
  getAll: async (page = 1, limit = 10) => {
    const response = await apiClient.get('/trailer', {
      params: { page, limit }
    });
    return response;
  },

  // Get all trailers without pagination
  getAllWithoutPagination: async () => {
    const response = await apiClient.get('/trailer', {
      params: { page: 1, limit: 1000 }
    });
    return response;
  },

  // Get trailer by ID
  getById: async (id) => {
    const response = await apiClient.get(`/trailer/${id}`);
    return response;
  },

  // Create new trailer
  create: async (data) => {
    const response = await apiClient.post('/trailer', data);
    return response;
  },

  // Update existing trailer
  update: async (id, data) => {
    const response = await apiClient.put(`/trailer/${id}`, data);
    return response;
  },

  // Delete trailer
  delete: async (id) => {
    const response = await apiClient.delete(`/trailer/${id}`);
    return response;
  },

  // Get count of trailers
  getCount: async () => {
    const response = await apiClient.get('/trailer', {
      params: { page: 1, limit: 1 }
    });
    return response.pagination?.records_count || 0;
  }
};