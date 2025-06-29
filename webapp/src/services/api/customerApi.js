import apiClient from './apiClient';

export const customerApi = {
  // Get all customers
  getAll: async () => {
    const response = await apiClient.get('/customer');
    return response;
  },

  // Get customer by ID
  getById: async (id) => {
    const response = await apiClient.get(`/customer/${id}`);
    return response;
  },

  // Create new customer
  create: async (data) => {
    const response = await apiClient.post('/customer', data);
    return response;
  },

  // Update existing customer
  update: async (id, data) => {
    const response = await apiClient.put(`/customer/${id}`, data);
    return response;
  },

  // Delete customer
  delete: async (id) => {
    const response = await apiClient.delete(`/customer/${id}`);
    return response;
  }
};