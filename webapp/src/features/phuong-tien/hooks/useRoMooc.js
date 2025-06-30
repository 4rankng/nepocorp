import { useState, useEffect, useCallback } from 'react';
import logger from '@services/logger';
import { trailerApi } from '@services/api/trailerApi';

export const useRoMooc = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(0);
  const [pagination, setPagination] = useState(null);

  // Fetch all trailers
  const fetchAll = useCallback(async (page = 1, limit = 100) => {
    setLoading(true);
    setError('');
    try {
      const response = await trailerApi.getAll(page, limit);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to fetch trailers');
      }

      setData(response.data || []);
      setPagination(response.pagination);
      setCount(response.pagination?.records_count || response.data?.length || 0);

      return response.data;
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách rơ-mooc');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new trailer
  const create = useCallback(async formData => {
    setLoading(true);
    setError('');
    try {
      const response = await trailerApi.create(formData);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to create trailer');
      }

      const newTrailer = response.data;
      setData(prev => [...prev, newTrailer]);
      setCount(prev => prev + 1);

      return newTrailer;
    } catch (err) {
      setError(err.message || 'Không thể thêm rơ-mooc mới');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update existing trailer
  const update = useCallback(async (id, formData) => {
    setLoading(true);
    setError('');
    try {
      const response = await trailerApi.update(id, formData);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to update trailer');
      }

      const updatedTrailer = response.data;
      setData(prev => prev.map(item => (item.id === id ? updatedTrailer : item)));

      return updatedTrailer;
    } catch (err) {
      setError(err.message || 'Không thể sửa rơ-mooc');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete trailer
  const remove = useCallback(async id => {
    setLoading(true);
    setError('');
    try {
      const response = await trailerApi.delete(id);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to delete trailer');
      }

      setData(prev => prev.filter(item => item.id !== id));
      setCount(prev => prev - 1);
    } catch (err) {
      setError(err.message || 'Không thể xóa rơ-mooc');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh count only
  const refreshCount = useCallback(async () => {
    try {
      const response = await trailerApi.getAll(1, 1);
      if (response.status === 'success') {
        setCount(response.pagination?.records_count || 0);
      }
    } catch (error) {
      logger.error('Error in loadRoMooc', { error });
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
