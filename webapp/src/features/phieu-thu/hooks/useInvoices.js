import { useState, useCallback, useEffect } from 'react';
import logger from '@services/logger';
import { invoiceApi } from '@services/api/invoiceApi';
import { invoiceCategoryApi } from '@services/api/invoiceCategoryApi';
import { extractErrorMessage } from '@utils/errorUtils';

export default function useInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 100,
    total: 0,
    totalPages: 1,
  });

  // Fetch invoice categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await invoiceCategoryApi.getAllWithoutPagination();
      setCategories(response.data || []);
    } catch (err) {
      logger.error('Error loading invoice categories', { error: err });
    }
  }, []);

  // Check if data is stale (older than 5 minutes)
  const isDataStale = useCallback(() => {
    if (!lastFetchTime) return true;
    return Date.now() - lastFetchTime > 5 * 60 * 1000; // 5 minutes
  }, [lastFetchTime]);

  // Fetch paginated invoices data
  const fetchData = useCallback(
    async (page = 0, pageSize = 100, categoryId = null, customerId = null, paymentStatus = null) => {
      setIsLoading(true);
      try {
        // Note: API is 1-indexed for page number
        const response = await invoiceApi.getAll(
          page + 1,
          pageSize,
          categoryId,
          customerId,
          paymentStatus
        );

        const data = response.data || [];
        setInvoices(data);

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
        setLastFetchTime(Date.now()); // Update last fetch time
      } catch (err) {
        logger.error('Error loading invoices', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tải dữ liệu phiếu thu');
        setError(errorMessage);
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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

  // Fetch all invoices (up to 1000)
  const fetchAll = useCallback(() => {
    return fetchData(0, 1000);
  }, [fetchData]);

  // Create new invoice
  const createInvoice = useCallback(
    async invoiceData => {
      setIsLoading(true);
      try {
        const response = await invoiceApi.create(invoiceData);

        // Refresh the data after creation
        await fetchData(pagination.page, pagination.pageSize);

        return response;
      } catch (err) {
        logger.error('Error creating invoice', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tạo phiếu thu');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Update invoice
  const updateInvoice = useCallback(
    async (id, invoiceData) => {
      setIsLoading(true);
      try {
        const response = await invoiceApi.update(id, invoiceData);

        // Refresh the data after update
        await fetchData(pagination.page, pagination.pageSize);

        return response;
      } catch (err) {
        logger.error('Error updating invoice', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể sửa phiếu thu');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Delete invoice
  const deleteInvoice = useCallback(
    async id => {
      setIsLoading(true);
      try {
        const response = await invoiceApi.delete(id);

        // Refresh the data after deletion
        await fetchData(pagination.page, pagination.pageSize);

        return response;
      } catch (err) {
        logger.error('Error deleting invoice', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể xóa phiếu thu');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Get invoice by ID
  const getInvoiceById = useCallback(async id => {
    setIsLoading(true);
    try {
      const response = await invoiceApi.getById(id);
      return response;
    } catch (err) {
      logger.error('Error fetching invoice by ID', { error: err });
      const errorMessage = extractErrorMessage(err, 'Không thể tải phiếu thu');
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

  // Fetch initial data on mount or when data is stale
  useEffect(() => {
    if (isDataStale()) {
      fetchData(0, 100);
    }
  }, [isDataStale]);

  return {
    invoices,
    categories,
    setInvoices,
    isLoading,
    error,
    fetchData,
    fetchAll,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    isDataStale,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onRowsPerPageChange: handlePageSizeChange,
    },
  };
}
