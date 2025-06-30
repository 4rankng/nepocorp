import apiClient from './apiClient';

export const expenseApi = {
  // Get all expenses with pagination (filtered by category if needed)
  getAll: async (page = 1, limit = 100, categoryId = null) => {
    const params = { page, limit };
    if (categoryId) {
      params.expense_category_id = categoryId;
    }
    const response = await apiClient.get('/expense', { params });
    return response;
  },

  // Get all expenses without pagination (for BaoDuong: category_id = 1)
  getAllWithoutPagination: async (categoryId = 1) => {
    const response = await apiClient.get('/expense', {
      params: { 
        page: 1, 
        limit: 1000,
        expense_category_id: categoryId
      }
    });
    return response;
  },

  // Get expense by ID (includes items)
  getById: async (id) => {
    const response = await apiClient.get(`/expense/${id}`);
    return response;
  },

  // Create new expense
  create: async (data) => {
    const response = await apiClient.post('/expense', data);
    return response;
  },

  // Update existing expense
  update: async (id, data) => {
    const response = await apiClient.put(`/expense/${id}`, data);
    return response;
  },

  // Delete expense
  delete: async (id) => {
    const response = await apiClient.delete(`/expense/${id}`);
    return response;
  },

  // Get count of expenses (for BaoDuong: category_id = 1)
  getCount: async (categoryId = 1) => {
    const response = await apiClient.get('/expense', {
      params: { 
        page: 1, 
        limit: 1,
        expense_category_id: categoryId
      }
    });
    return response.pagination?.records_count || 0;
  },

  // Add item to expense
  addItem: async (expenseId, itemData) => {
    const response = await apiClient.post(`/expense/${expenseId}/item`, itemData);
    return response;
  },

  // Update expense item
  updateItem: async (expenseId, itemId, itemData) => {
    const response = await apiClient.put(`/expense/${expenseId}/item/${itemId}`, itemData);
    return response;
  },

  // Delete expense item
  deleteItem: async (expenseId, itemId) => {
    const response = await apiClient.delete(`/expense/${expenseId}/item/${itemId}`);
    return response;
  }
};

// BaoDuong-specific API wrapper with expense_category_id = 1
export const baoDuongApi = {
  // Get all BaoDuong expenses (category_id = 1)
  getAll: async (page = 1, limit = 100) => {
    return expenseApi.getAll(page, limit, 1);
  },

  // Get all BaoDuong expenses without pagination
  getAllWithoutPagination: async () => {
    return expenseApi.getAllWithoutPagination(1);
  },

  // Get BaoDuong expense by ID
  getById: async (id) => {
    return expenseApi.getById(id);
  },

  // Create new BaoDuong expense (automatically sets expense_category_id = 1)
  create: async (data) => {
    const expenseData = {
      ...data,
      expense_category_id: 1,
      currency: data.currency || 'VND'
    };
    return expenseApi.create(expenseData);
  },

  // Update BaoDuong expense
  update: async (id, data) => {
    const expenseData = {
      ...data,
      expense_category_id: 1,
      currency: data.currency || 'VND'
    };
    return expenseApi.update(id, expenseData);
  },

  // Delete BaoDuong expense
  delete: async (id) => {
    return expenseApi.delete(id);
  },

  // Get count of BaoDuong expenses
  getCount: async () => {
    return expenseApi.getCount(1);
  },

  // Item management methods
  addItem: expenseApi.addItem,
  updateItem: expenseApi.updateItem,
  deleteItem: expenseApi.deleteItem
};