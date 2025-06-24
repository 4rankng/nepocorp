import apiClient from './apiClient';

export const tractorExpenseApi = {
  // Get all tractor expenses with pagination
  getAll: async (page = 1, limit = 10) => {
    const response = await apiClient.get('/tractor_expense', {
      params: { page, limit }
    });
    return response;
  },

  // Get all tractor expenses without pagination
  getAllWithoutPagination: async () => {
    const response = await apiClient.get('/tractor_expense', {
      params: { page: 1, limit: 1000 }
    });
    return response.data;
  },

  // Get tractor expense by ID (includes items)
  getById: async (id) => {
    const response = await apiClient.get(`/tractor_expense/${id}`);
    return response.data;
  },

  // Create new tractor expense
  create: async (data) => {
    const response = await apiClient.post('/tractor_expense', data);
    return response.data;
  },

  // Update existing tractor expense
  update: async (id, data) => {
    const response = await apiClient.put(`/tractor_expense/${id}`, data);
    return response.data;
  },

  // Delete tractor expense
  delete: async (id) => {
    const response = await apiClient.delete(`/tractor_expense/${id}`);
    return response;
  },

  // Get count of tractor expenses
  getCount: async () => {
    const response = await apiClient.get('/tractor_expense', {
      params: { page: 1, limit: 1 }
    });
    return response.pagination?.records_count || 0;
  },

  // Add item to tractor expense
  addItem: async (expenseId, itemData) => {
    const response = await apiClient.post(`/tractor_expense/${expenseId}/item`, itemData);
    return response.data;
  },

  // Update expense item
  updateItem: async (expenseId, itemId, itemData) => {
    const response = await apiClient.put(`/tractor_expense/${expenseId}/item/${itemId}`, itemData);
    return response.data;
  },

  // Delete expense item
  deleteItem: async (expenseId, itemId) => {
    const response = await apiClient.delete(`/tractor_expense/${expenseId}/item/${itemId}`);
    return response;
  }
};