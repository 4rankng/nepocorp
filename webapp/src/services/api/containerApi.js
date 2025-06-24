import apiClient from './apiClient';

export const containerApi = {
  // Get all containers with pagination
  getAll: async (page = 1, limit = 10) => {
    const response = await apiClient.get('/container', {
      params: { page, limit }
    });
    return response;
  },

  // Get all containers without pagination
  getAllWithoutPagination: async () => {
    const response = await apiClient.get('/container', {
      params: { page: 1, limit: 1000 }
    });
    return response.data;
  },

  // Get container by ID
  getById: async (id) => {
    const response = await apiClient.get(`/container/${id}`);
    return response.data;
  },

  // Create new container
  create: async (data) => {
    const response = await apiClient.post('/container', data);
    return response.data;
  },

  // Update existing container
  update: async (id, data) => {
    const response = await apiClient.put(`/container/${id}`, data);
    return response.data;
  },

  // Delete container
  delete: async (id) => {
    const response = await apiClient.delete(`/container/${id}`);
    return response;
  },

  // Get count of containers
  getCount: async () => {
    const response = await apiClient.get('/container', {
      params: { page: 1, limit: 1 }
    });
    return response.pagination?.records_count || 0;
  }
};