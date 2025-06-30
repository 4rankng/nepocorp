import { useState, useCallback, useEffect } from 'react';
import logger from '@services/logger';
import { expenseApi } from '@services/api/expenseApi';
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';
import { extractErrorMessage } from '@utils/errorUtils';

export default function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Fetch expense categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await expenseCategoryApi.getAllWithoutPagination();
      setCategories(response.data || []);
    } catch (err) {
      logger.error('Error loading expense categories', { error: err });
    }
  }, []);

  // Fetch paginated expenses data
  const fetchData = useCallback(async (page = 0, pageSize = 10, categoryId = null) => {
    setIsLoading(true);
    try {
      // Note: API is 1-indexed for page number
      const response = await expenseApi.getAll(page + 1, pageSize, categoryId);

      const data = response.data || [];
      setExpenses(data);

      // Update pagination state from API response
      const newPagination = {
        page,
        pageSize,
        total: response.pagination?.records_count || 0,
        totalPages: response.pagination?.total_pages || 1,
      };

      setPagination(prev => ({
        ...prev,
        ...newPagination,
      }));

      setError('');
    } catch (err) {
      logger.error('Error loading expenses', { error: err });
      const errorMessage = extractErrorMessage(err, 'Không thể tải dữ liệu chi phí');
      setError(errorMessage);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePageChange = useCallback(
    newPage => {
      fetchData(newPage, pagination.pageSize);
    },
    [fetchData, pagination.pageSize]
  );

  const handlePageSizeChange = useCallback(
    newPageSize => {
      fetchData(0, newPageSize); // Reset to first page when page size changes
    },
    [fetchData]
  );

  // Create new expense
  const createExpense = useCallback(
    async expenseData => {
      setIsLoading(true);
      try {
        const response = await expenseApi.create(expenseData);

        // Refresh the data after creation
        await fetchData(pagination.page, pagination.pageSize);

        return response;
      } catch (err) {
        logger.error('Error creating expense', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tạo phiếu chi');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Update expense
  const updateExpense = useCallback(
    async (id, expenseData) => {
      setIsLoading(true);
      try {
        const response = await expenseApi.update(id, expenseData);

        // Refresh the data after update
        await fetchData(pagination.page, pagination.pageSize);

        return response;
      } catch (err) {
        logger.error('Error updating expense', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể sửa phiếu chi');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Delete expense
  const deleteExpense = useCallback(
    async id => {
      setIsLoading(true);
      try {
        const response = await expenseApi.delete(id);

        // Refresh the data after deletion
        await fetchData(pagination.page, pagination.pageSize);

        return response;
      } catch (err) {
        logger.error('Error deleting expense', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể xóa phiếu chi');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Get expense by ID
  const getExpenseById = useCallback(async id => {
    setIsLoading(true);
    try {
      const response = await expenseApi.getById(id);
      return response;
    } catch (err) {
      logger.error('Error fetching expense by ID', { error: err });
      const errorMessage = extractErrorMessage(err, 'Không thể tải phiếu chi');
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchData(0, 10);
  }, []);

  return {
    expenses,
    categories,
    setExpenses,
    isLoading,
    error,
    fetchData,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseById,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onRowsPerPageChange: handlePageSizeChange,
    },
  };
}
