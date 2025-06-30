import { useState, useEffect, useCallback } from 'react';
import { financialLedgerApi } from '@services/api/financialLedgerApi';

export const useFinancialLedger = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Current filters
  const [filters, setFilters] = useState({
    customer_id: null,
    partner_id: null,
    transaction_type: null,
    start_date: null,
    end_date: null,
    search: '',
  });

  // Balance summary
  const [balanceSummary, setBalanceSummary] = useState({
    totalDebit: 0,
    totalCredit: 0,
    balance: 0,
  });

  // Fetch transactions with current filters and pagination
  const fetchTransactions = useCallback(
    async (page = 0, limit = 50, newFilters = null) => {
      setLoading(true);
      setError(null);

      try {
        const currentFilters = newFilters || filters;
        const cleanFilters = {};

        // Only include non-null/non-empty filters
        Object.keys(currentFilters).forEach(key => {
          if (currentFilters[key] !== null && currentFilters[key] !== '') {
            cleanFilters[key] = currentFilters[key];
          }
        });

        const response = await financialLedgerApi.getFiltered(
          cleanFilters,
          page + 1, // API uses 1-based pagination
          limit
        );

        const data = response.data?.data || response.data || [];
        const total = response.data?.total || response.data?.pagination?.total || data.length;
        const totalPages = Math.ceil(total / limit);

        setTransactions(data);
        setPagination({
          page,
          limit,
          total,
          totalPages,
        });

        // Calculate balance summary
        const summary = data.reduce(
          (acc, transaction) => {
            const debit = parseFloat(transaction.debit) || 0;
            const credit = parseFloat(transaction.credit) || 0;

            acc.totalDebit += debit;
            acc.totalCredit += credit;

            return acc;
          },
          { totalDebit: 0, totalCredit: 0 }
        );

        summary.balance = summary.totalDebit - summary.totalCredit;
        setBalanceSummary(summary);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Không thể tải dữ liệu giao dịch');
        setTransactions([]);
        setBalanceSummary({ totalDebit: 0, totalCredit: 0, balance: 0 });
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Handle page change
  const handlePageChange = useCallback(
    newPage => {
      fetchTransactions(newPage, pagination.limit);
    },
    [fetchTransactions, pagination.limit]
  );

  // Handle rows per page change
  const handleRowsPerPageChange = useCallback(
    newLimit => {
      fetchTransactions(0, newLimit);
    },
    [fetchTransactions]
  );

  // Update filters
  const updateFilters = useCallback(
    newFilters => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      fetchTransactions(0, pagination.limit, updatedFilters);
    },
    [filters, fetchTransactions, pagination.limit]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    const clearedFilters = {
      customer_id: null,
      partner_id: null,
      transaction_type: null,
      start_date: null,
      end_date: null,
      search: '',
    };
    setFilters(clearedFilters);
    fetchTransactions(0, pagination.limit, clearedFilters);
  }, [fetchTransactions, pagination.limit]);

  // Create transaction
  const createTransaction = useCallback(
    async transactionData => {
      try {
        setLoading(true);
        await financialLedgerApi.create(transactionData);
        await fetchTransactions(pagination.page, pagination.limit);
        return { success: true };
      } catch (err) {
        console.error('Error creating transaction:', err);
        const message = err.response?.data?.message || 'Không thể tạo giao dịch';
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchTransactions, pagination.page, pagination.limit]
  );

  // Update transaction
  const updateTransaction = useCallback(
    async (id, transactionData) => {
      try {
        setLoading(true);
        await financialLedgerApi.update(id, transactionData);
        await fetchTransactions(pagination.page, pagination.limit);
        return { success: true };
      } catch (err) {
        console.error('Error updating transaction:', err);
        const message = err.response?.data?.message || 'Không thể cập nhật giao dịch';
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchTransactions, pagination.page, pagination.limit]
  );

  // Delete transaction
  const deleteTransaction = useCallback(
    async id => {
      try {
        setLoading(true);
        await financialLedgerApi.delete(id);
        await fetchTransactions(pagination.page, pagination.limit);
        return { success: true };
      } catch (err) {
        console.error('Error deleting transaction:', err);
        const message = err.response?.data?.message || 'Không thể xóa giao dịch';
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchTransactions, pagination.page, pagination.limit]
  );

  // Get balance for specific customer
  const getCustomerBalance = useCallback(async customerId => {
    try {
      const response = await financialLedgerApi.getCustomerBalance(customerId);
      return response.data;
    } catch (err) {
      console.error('Error fetching customer balance:', err);
      throw new Error('Không thể tải số dư khách hàng');
    }
  }, []);

  // Get balance for specific partner
  const getPartnerBalance = useCallback(async partnerId => {
    try {
      const response = await financialLedgerApi.getPartnerBalance(partnerId);
      return response.data;
    } catch (err) {
      console.error('Error fetching partner balance:', err);
      throw new Error('Không thể tải số dư đối tác');
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTransactions();
  }, []); // Empty dependency array for initial load only

  return {
    // Data
    transactions,
    loading,
    error,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onRowsPerPageChange: handleRowsPerPageChange,
    },
    filters,
    balanceSummary,

    // Actions
    fetchTransactions,
    updateFilters,
    clearFilters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getCustomerBalance,
    getPartnerBalance,

    // Utilities
    refresh: () => fetchTransactions(pagination.page, pagination.limit),
  };
};
