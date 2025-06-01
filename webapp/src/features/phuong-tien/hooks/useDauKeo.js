import { useState, useEffect, useCallback } from 'react';
import logger from '@utils/logger';
import { fetchAllDauKeo, addDauKeo, editDauKeo, removeDauKeo } from '@services/mockApi';
export const useDauKeo = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(0);
  // Fetch all tractors
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAllDauKeo();
      // Handle new standardized API response format
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch tractors');
      }
      const result = response.data?.items || response.data || [];
      setData(result);
      setCount(result.length);
      return result;
    } catch (err) {
      setError('Không thể tải danh sách đầu kéo');
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
      const response = await addDauKeo(formData);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create tractor');
      }
      const newTractor = response.data;
      setData(prev => [...prev, newTractor]);
      setCount(prev => prev + 1);
      return newTractor;
    } catch (err) {
      setError('Không thể thêm đầu kéo mới');
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
      const response = await editDauKeo(id, formData);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update tractor');
      }
      const updatedTractor = response.data;
      setData(prev => prev.map(item => (item.id === id ? updatedTractor : item)));
      return updatedTractor;
    } catch (err) {
      setError('Không thể cập nhật đầu kéo');
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
      const response = await removeDauKeo(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete tractor');
      }
      setData(prev => prev.filter(item => item.id !== id));
      setCount(prev => prev - 1);
    } catch (err) {
      setError('Không thể xóa đầu kéo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  // Refresh count only
  const refreshCount = useCallback(async () => {
    try {
      const response = await fetchAllDauKeo();
      if (response.success) {
        const result = response.data?.items || response.data || [];
        setCount(result.length);
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
    fetchAll,
    create,
    update,
    remove,
    refreshCount,
  };
};
