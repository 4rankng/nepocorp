import apiClient from './apiClient';

export const partnerApi = {
  // Get all partners with pagination
  getAll: async (page = 1, limit = 100) => {
    const response = await apiClient.get('/partner', {
      params: { page, limit },
    });
    return response;
  },

  // Get all partners without pagination
  getAllWithoutPagination: async () => {
    const response = await apiClient.get('/partner', {
      params: { page: 1, limit: 1000 },
    });
    return response;
  },

  // Get partner by ID
  getById: async id => {
    const response = await apiClient.get(`/partner/${id}`);
    return response;
  },

  // Create new partner
  create: async data => {
    const response = await apiClient.post('/partner', data);
    return response;
  },

  // Update existing partner
  update: async (id, data) => {
    const response = await apiClient.put(`/partner/${id}`, data);
    return response;
  },

  // Delete partner
  delete: async id => {
    const response = await apiClient.delete(`/partner/${id}`);
    return response;
  },

  // Get count of partners
  getCount: async () => {
    const response = await apiClient.get('/partner', {
      params: { page: 1, limit: 1 },
    });
    return response.pagination?.records_count || 0;
  },
};
