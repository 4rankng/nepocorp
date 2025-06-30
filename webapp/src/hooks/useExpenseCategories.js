import { useState, useEffect, useCallback } from 'react';
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';

const useExpenseCategories = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_pages: 1,
    records_count: 0
  });

  const fetchCategories = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseCategoryApi.getAll(page, limit);
      // Response structure: { status, data: [...], pagination: {...} }
      const data = response.data || [];
      const pagination = response.pagination || {
        page: 1,
        limit: 10,
        total_pages: 1,
        records_count: data.length
      };
      
      setCategories(data);
      setPagination(pagination);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      setError(error.message);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (categoryData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseCategoryApi.create(categoryData);
      const newCategory = response.data || response;
      
      // Refresh the list after creation
      await fetchCategories(pagination.page, pagination.limit);
      
      return newCategory;
    } catch (error) {
      console.error('Error creating expense category:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCategories, pagination.page, pagination.limit]);

  const updateCategory = useCallback(async (id, categoryData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseCategoryApi.update(id, categoryData);
      const updatedCategory = response.data || response;
      
      // Update the category in the local state
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === id ? updatedCategory : cat
        )
      );
      
      return updatedCategory;
    } catch (error) {
      console.error('Error updating expense category:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCategory = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      await expenseCategoryApi.delete(id);
      
      // Remove the category from local state
      setCategories(prevCategories => 
        prevCategories.filter(cat => cat.id !== id)
      );
      
      // If current page becomes empty and it's not the first page, go to previous page
      const remainingCategories = categories.length - 1;
      if (remainingCategories === 0 && pagination.page > 1) {
        await fetchCategories(pagination.page - 1, pagination.limit);
      } else {
        // Update pagination count
        setPagination(prev => ({
          ...prev,
          records_count: Math.max(0, prev.records_count - 1)
        }));
      }
    } catch (error) {
      console.error('Error deleting expense category:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [categories.length, pagination.page, pagination.limit, fetchCategories]);

  const getCategoryById = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseCategoryApi.getById(id);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching expense category by ID:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onPageChange = useCallback((newPage) => {
    fetchCategories(newPage, pagination.limit);
  }, [fetchCategories, pagination.limit]);

  const onLimitChange = useCallback((newLimit) => {
    fetchCategories(1, newLimit);
  }, [fetchCategories]);

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
      onLimitChange
    },
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    refreshCategories: () => fetchCategories(pagination.page, pagination.limit)
  };
};

export default useExpenseCategories;