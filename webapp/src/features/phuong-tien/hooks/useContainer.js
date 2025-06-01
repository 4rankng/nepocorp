import { useState, useEffect, useCallback } from 'react';
import logger from '@services/logger';
import { fetchAllContainer, addContainer, editContainer, removeContainer } from '@services/mockApi';
export const useContainer = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(0);
  // Fetch all containers
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAllContainer();
      // Handle new standardized API response format
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch containers');
      }
      const result = response.data?.items || response.data || [];
      setData(result);
      setCount(result.length);
      return result;
    } catch (err) {
      setError('Không thể tải danh sách container');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  // Create new container
  const create = useCallback(async formData => {
    setLoading(true);
    setError('');
    try {
      const response = await addContainer(formData);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create container');
      }
      const newContainer = response.data;
      setData(prev => [...prev, newContainer]);
      setCount(prev => prev + 1);
      return newContainer;
    } catch (err) {
      setError('Không thể thêm container mới');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  // Update existing container
  const update = useCallback(async (id, formData) => {
    setLoading(true);
    setError('');
    try {
      const response = await editContainer(id, formData);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update container');
      }
      const updatedContainer = response.data;
      setData(prev => prev.map(item => (item.id === id ? updatedContainer : item)));
      return updatedContainer;
    } catch (err) {
      setError('Không thể cập nhật container');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  // Delete container
  const remove = useCallback(async id => {
    setLoading(true);
    setError('');
    try {
      const response = await removeContainer(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete container');
      }
      setData(prev => prev.filter(item => item.id !== id));
      setCount(prev => prev - 1);
    } catch (err) {
      setError('Không thể xóa container');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  // Refresh count only
  const refreshCount = useCallback(async () => {
    try {
      const response = await fetchAllContainer();
      if (response.success) {
        const result = response.data?.items || response.data || [];
        setCount(result.length);
      }
    } catch (error) {
      logger.error('Error in loadContainers', { error });
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
