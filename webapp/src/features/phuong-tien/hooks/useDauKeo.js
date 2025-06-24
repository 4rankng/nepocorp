import { useState, useEffect, useCallback } from 'react';
import logger from '@services/logger';
import { tractorApi } from '@services/api/tractorApi';

export const useDauKeo = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(0);
  const [pagination, setPagination] = useState(null);

  // Fetch all tractors
  const fetchAll = useCallback(async (page = 1, limit = 10) => {
    setLoading(true);
    setError('');
    try {
      const response = await tractorApi.getAll(page, limit);
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to fetch tractors');
      }
      
      setData(response.data || []);
      setPagination(response.pagination);
      setCount(response.pagination?.records_count || response.data?.length || 0);
      
      return response.data;
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đầu kéo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new tractor
  const create = useCallback(async formData => {
    setLoading(true);
    setError('');
    try {
      const response = await tractorApi.create(formData);
      
      if (response.status !== 'success') {
        const errorMessage = response.message || 'Failed to create tractor';
        const detailedError = response.errors?.message || '';
        const fullErrorMessage = detailedError ? `${errorMessage}: ${detailedError}` : errorMessage;
        throw new Error(fullErrorMessage);
      }
      
      const newTractor = response.data;
      setData(prev => [...prev, newTractor]);
      setCount(prev => prev + 1);
      
      return newTractor;
    } catch (err) {
      setError(err.message || 'Không thể thêm đầu kéo mới');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update existing tractor
  const update = useCallback(async (id, formData) => {
    setLoading(true);
    setError('');
    try {
      const response = await tractorApi.update(id, formData);
      
      if (response.status !== 'success') {
        const errorMessage = response.message || 'Failed to update tractor';
        const detailedError = response.errors?.message || '';
        const fullErrorMessage = detailedError ? `${errorMessage}: ${detailedError}` : errorMessage;
        throw new Error(fullErrorMessage);
      }
      
      const updatedTractor = response.data;
      setData(prev => prev.map(item => (item.id === id ? updatedTractor : item)));
      
      return updatedTractor;
    } catch (err) {
      setError(err.message || 'Không thể cập nhật đầu kéo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete tractor
  const remove = useCallback(async id => {
    setLoading(true);
    setError('');
    try {
      const response = await tractorApi.delete(id);
      
      if (response.status !== 'success') {
        const errorMessage = response.message || 'Failed to delete tractor';
        const detailedError = response.errors?.message || '';
        const fullErrorMessage = detailedError ? `${errorMessage}: ${detailedError}` : errorMessage;
        throw new Error(fullErrorMessage);
      }
      
      setData(prev => prev.filter(item => item.id !== id));
      setCount(prev => prev - 1);
    } catch (err) {
      setError(err.message || 'Không thể xóa đầu kéo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh count only
  const refreshCount = useCallback(async () => {
    try {
      const response = await tractorApi.getAll(1, 1);
      if (response.status === 'success') {
        setCount(response.pagination?.records_count || 0);
      }
    } catch (error) {
      logger.error('Error in loadDauKeo', { error });
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return {
    data,
    loading,
    error,
    count,
    pagination,
    fetchAll,
    create,
    update,
    remove,
    refreshCount,
  };
};