import apiClient from './apiClient';

export const financialLedgerApi = {
  // Get all transactions with pagination
  getAll: async (page = 1, limit = 50) => {
    const response = await apiClient.get('/financial-ledger', {
      params: { page, limit },
    });
    return response;
  },

  // Get transaction by ID
  getById: async id => {
    const response = await apiClient.get(`/financial-ledger/${id}`);
    return response;
  },

  // Create new transaction
  create: async data => {
    const response = await apiClient.post('/financial-ledger', data);
    return response;
  },

  // Update existing transaction
  update: async (id, data) => {
    const response = await apiClient.put(`/financial-ledger/${id}`, data);
    return response;
  },

  // Delete transaction
  delete: async id => {
    const response = await apiClient.delete(`/financial-ledger/${id}`);
    return response;
  },

  // Get transactions by customer ID
  getByCustomer: async (customerId, page = 1, limit = 50) => {
    const response = await apiClient.get(`/financial-ledger/customer/${customerId}`, {
      params: { page, limit },
    });
    return response;
  },

  // Get transactions by partner ID
  getByPartner: async (partnerId, page = 1, limit = 50) => {
    const response = await apiClient.get(`/financial-ledger/partner/${partnerId}`, {
      params: { page, limit },
    });
    return response;
  },

  // Get transactions by type
  getByType: async (type, page = 1, limit = 50) => {
    const response = await apiClient.get(`/financial-ledger/type/${type}`, {
      params: { page, limit },
    });
    return response;
  },

  // Get transactions by date range
  getByDateRange: async (startDate, endDate, page = 1, limit = 50) => {
    const response = await apiClient.get('/financial-ledger/date-range', {
      params: {
        start_date: startDate,
        end_date: endDate,
        page,
        limit,
      },
    });
    return response;
  },

  // Get customer balance
  getCustomerBalance: async customerId => {
    const response = await apiClient.get(`/financial-ledger/customer/${customerId}/balance`);
    return response;
  },

  // Get partner balance
  getPartnerBalance: async partnerId => {
    const response = await apiClient.get(`/financial-ledger/partner/${partnerId}/balance`);
    return response;
  },

  // Get filtered transactions (combining multiple filters)
  getFiltered: async (filters = {}, page = 1, limit = 50) => {
    // const params = { page, limit, ...filters };

    // If date range is provided, use the date-range endpoint
    if (filters.start_date && filters.end_date) {
      return await financialLedgerApi.getByDateRange(
        filters.start_date,
        filters.end_date,
        page,
        limit
      );
    }

    // If customer ID is provided, use customer endpoint
    if (filters.customer_id) {
      return await financialLedgerApi.getByCustomer(filters.customer_id, page, limit);
    }

    // If partner ID is provided, use partner endpoint
    if (filters.partner_id) {
      return await financialLedgerApi.getByPartner(filters.partner_id, page, limit);
    }

    // If transaction type is provided, use type endpoint
    if (filters.transaction_type) {
      return await financialLedgerApi.getByType(filters.transaction_type, page, limit);
    }

    // Default to getting all transactions
    return await financialLedgerApi.getAll(page, limit);
  },
};
