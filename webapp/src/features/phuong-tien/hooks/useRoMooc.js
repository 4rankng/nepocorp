import { useState, useEffect, useCallback } from 'react';
import { fetchAllRoMooc, addRoMooc, editRoMooc, removeRoMooc } from '@services/mockApi';

export const useRoMooc = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(0);

  // Fetch all trailers
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAllRoMooc();

      // Handle new standardized API response format
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch trailers');
      }

      const result = response.data?.items || response.data || [];
      setData(result);
      setCount(result.length);
      return result;
    } catch (err) {
      setError('Không thể tải danh sách rơ-mooc');
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
      const response = await addRoMooc(formData);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create trailer');
      }

      const newTrailer = response.data;
      setData(prev => [...prev, newTrailer]);
      setCount(prev => prev + 1);
      return newTrailer;
    } catch (err) {
      setError('Không thể thêm rơ-mooc mới');
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
      const response = await editRoMooc(id, formData);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update trailer');
      }

      const updatedTrailer = response.data;
      setData(prev => prev.map(item => (item.id === id ? updatedTrailer : item)));
      return updatedTrailer;
    } catch (err) {
      setError('Không thể cập nhật rơ-mooc');
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
      const response = await removeRoMooc(id);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete trailer');
      }

      setData(prev => prev.filter(item => item.id !== id));
      setCount(prev => prev - 1);
    } catch (err) {
      setError('Không thể xóa rơ-mooc');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh count only
  const refreshCount = useCallback(async () => {
    try {
      const response = await fetchAllRoMooc();

      if (response.success) {
        const result = response.data?.items || response.data || [];
        setCount(result.length);
      }
    } catch (err) {
      console.error('Failed to refresh count:', err);
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
    fetchAll,
    create,
    update,
    remove,
    refreshCount,
  };
};
