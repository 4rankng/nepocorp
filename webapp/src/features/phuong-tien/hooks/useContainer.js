import { useState, useEffect, useCallback } from 'react';
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
      const result = await fetchAllContainer();
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
      const newContainer = await addContainer(formData);
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
      const updatedContainer = await editContainer(id, formData);
      setData(prev => prev.map(item => (item.id === id ? { ...item, ...formData } : item)));
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
      await removeContainer(id);
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
      const result = await fetchAllContainer();
      setCount(result.length);
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
