import apiClient from './apiClient';

export const customerApi = {
  // Get all customers
  getAll: async () => {
    const response = await apiClient.get('/customers');
    return response;
  },

  // Get customer by ID
  getById: async id => {
    const response = await apiClient.get(`/customers/${id}`);
    return response;
  },

  // Create new customer
  create: async data => {
    const response = await apiClient.post('/customers', data);
    return response;
  },

  // Update existing customer
  update: async (id, data) => {
    const response = await apiClient.put(`/customers/${id}`, data);
    return response;
  },

  // Delete customer
  delete: async id => {
    const response = await apiClient.delete(`/customers/${id}`);
    return response;
  },
};
