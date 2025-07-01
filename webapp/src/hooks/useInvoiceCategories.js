import { useState, useEffect, useCallback } from 'react';
import { invoiceCategoryApi } from '@services/api/invoiceCategoryApi';
import { cacheManager } from '@utils/cacheManager';

const useInvoiceCategories = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 1000,
    total_pages: 1,
    records_count: 0,
  });

  const fetchCategories = useCallback(async (page = 1, limit = 1000) => {
    const cacheKey = cacheManager.generateKey('/invoice_category', { page, limit });

    // Check cache first
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData) {
      setCategories(cachedData.data);
      setPagination(cachedData.pagination);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await invoiceCategoryApi.getAll(page, limit);

      // Response structure: { status, data: [...], pagination: {...} }
      const data = response.data || [];
      const pagination = response.pagination || {
        page: 1,
        limit: 1000,
        total_pages: 1,
        records_count: data.length,
      };

      // Cache the response
      cacheManager.set(cacheKey, { data, pagination });

      setCategories(data);
      setPagination(pagination);
    } catch (error) {
      console.error('Error fetching invoice categories:', error);
      setError(error.message);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCategory = useCallback(
    async categoryData => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await invoiceCategoryApi.create(categoryData);
        const newCategory = response.data || response;

        // Invalidate cache after creation
        cacheManager.invalidate('/invoice_category');

        // Refresh the list after creation
        await fetchCategories(pagination.page, pagination.limit);

        return newCategory;
      } catch (error) {
        console.error('Error creating invoice category:', error);
        setError(error.message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCategories, pagination.page, pagination.limit]
  );

  const updateCategory = useCallback(async (id, categoryData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await invoiceCategoryApi.update(id, categoryData);
      const updatedCategory = response.data || response;

      // Invalidate cache after update
      cacheManager.invalidate('/invoice_category');

      // Update the category in the local state
      setCategories(prevCategories =>
        prevCategories.map(cat => (cat.id === id ? updatedCategory : cat))
      );

      return updatedCategory;
    } catch (error) {
      console.error('Error updating invoice category:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCategory = useCallback(
    async id => {
      setIsLoading(true);
      setError(null);
      try {
        await invoiceCategoryApi.delete(id);

        // Invalidate cache after deletion
        cacheManager.invalidate('/invoice_category');

        // Remove the category from local state
        setCategories(prevCategories => prevCategories.filter(cat => cat.id !== id));

        // If current page becomes empty and it's not the first page, go to previous page
        const remainingCategories = categories.length - 1;
        if (remainingCategories === 0 && pagination.page > 1) {
          await fetchCategories(pagination.page - 1, pagination.limit);
        } else {
          // Update pagination count
          setPagination(prev => ({
            ...prev,
            records_count: Math.max(0, prev.records_count - 1),
          }));
        }
      } catch (error) {
        console.error('Error deleting invoice category:', error);
        setError(error.message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [categories.length, pagination.page, pagination.limit, fetchCategories]
  );

  const getCategoryById = useCallback(async id => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await invoiceCategoryApi.getById(id);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching invoice category by ID:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onPageChange = useCallback(
    newPage => {
      fetchCategories(newPage, pagination.limit);
    },
    [fetchCategories, pagination.limit]
  );

  const onLimitChange = useCallback(
    newLimit => {
      fetchCategories(1, newLimit);
    },
    [fetchCategories]
  );

  // Load initial data
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    pagination: {
      ...pagination,
      onPageChange,
      onLimitChange,
    },
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    refreshCategories: () => fetchCategories(pagination.page, pagination.limit),
  };
};

export default useInvoiceCategories;