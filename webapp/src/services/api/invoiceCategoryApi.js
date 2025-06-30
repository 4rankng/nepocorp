import apiClient from './apiClient';

export const invoiceCategoryApi = {
  // Get all invoice categories
  getAll: async () => {
    const response = await apiClient.get('/invoice_category');
    return response;
  },

  // Get all invoice categories without pagination
  getAllWithoutPagination: async () => {
    const response = await apiClient.get('/invoice_category');
    return response;
  },

  // Get invoice category by ID
  getById: async id => {
    const response = await apiClient.get(`/invoice_category/${id}`);
    return response;
  },

  // Create new invoice category
  create: async data => {
    const response = await apiClient.post('/invoice_category', data);
    return response;
  },

  // Update existing invoice category
  update: async (id, data) => {
    const response = await apiClient.put(`/invoice_category/${id}`, data);
    return response;
  },

  // Delete invoice category
  delete: async id => {
    const response = await apiClient.delete(`/invoice_category/${id}`);
    return response;
  },
};
