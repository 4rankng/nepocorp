import apiClient from './apiClient';

export const expenseCategoryApi = {
  // Get all expense categories with pagination
  getAll: async (page = 1, limit = 100) => {
    const response = await apiClient.get('/expense_category', {
      params: { page, limit },
    });
    return response;
  },

  // Get all expense categories without pagination
  getAllWithoutPagination: async () => {
    const response = await apiClient.get('/expense_category', {
      params: { page: 1, limit: 1000 },
    });
    return response;
  },

  // Get expense category by ID
  getById: async id => {
    const response = await apiClient.get(`/expense_category/${id}`);
    return response;
  },

  // Create new expense category
  create: async data => {
    const response = await apiClient.post('/expense_category', data);
    return response;
  },

  // Update existing expense category
  update: async (id, data) => {
    const response = await apiClient.put(`/expense_category/${id}`, data);
    return response;
  },

  // Delete expense category
  delete: async id => {
    const response = await apiClient.delete(`/expense_category/${id}`);
    return response;
  },

  // Get count of expense categories
  getCount: async () => {
    const response = await apiClient.get('/expense_category', {
      params: { page: 1, limit: 1 },
    });
    return response.pagination?.records_count || 0;
  },
};
