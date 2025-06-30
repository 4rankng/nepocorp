import apiClient from './apiClient';

export const invoiceApi = {
  // Get all invoices with pagination (filtered by category if needed)
  getAll: async (
    page = 1,
    limit = 100,
    categoryId = null,
    customerId = null,
    paymentStatus = null
  ) => {
    const params = { page, limit };
    if (categoryId) {
      params.invoice_category_id = categoryId;
    }
    if (customerId) {
      params.customer_id = customerId;
    }
    if (paymentStatus) {
      params.payment_status = paymentStatus;
    }
    const response = await apiClient.get('/invoice', { params });
    return response;
  },

  // Get all invoices without pagination
  getAllWithoutPagination: async (categoryId = null) => {
    const response = await apiClient.get('/invoice', {
      params: {
        page: 1,
        limit: 1000,
        ...(categoryId && { invoice_category_id: categoryId }),
      },
    });
    return response;
  },

  // Get invoice by ID (includes items)
  getById: async id => {
    const response = await apiClient.get(`/invoice/${id}`);
    return response;
  },

  // Create new invoice
  create: async data => {
    const response = await apiClient.post('/invoice', data);
    return response;
  },

  // Update existing invoice
  update: async (id, data) => {
    const response = await apiClient.put(`/invoice/${id}`, data);
    return response;
  },

  // Delete invoice
  delete: async id => {
    const response = await apiClient.delete(`/invoice/${id}`);
    return response;
  },

  // Get count of invoices
  getCount: async (categoryId = null) => {
    const response = await apiClient.get('/invoice', {
      params: {
        page: 1,
        limit: 1,
        ...(categoryId && { invoice_category_id: categoryId }),
      },
    });
    return response.pagination?.records_count || 0;
  },

  // Add item to invoice
  addItem: async (invoiceId, itemData) => {
    const response = await apiClient.post(`/invoice/${invoiceId}/item`, itemData);
    return response;
  },

  // Update invoice item
  updateItem: async (invoiceId, itemId, itemData) => {
    const response = await apiClient.put(`/invoice/${invoiceId}/item/${itemId}`, itemData);
    return response;
  },

  // Delete invoice item
  deleteItem: async (invoiceId, itemId) => {
    const response = await apiClient.delete(`/invoice/${invoiceId}/item/${itemId}`);
    return response;
  },
};
