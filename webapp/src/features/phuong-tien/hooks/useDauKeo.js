import { useState, useEffect, useCallback } from 'react';
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
      const result = await fetchAllDauKeo();
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
      const newTractor = await addDauKeo(formData);
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
      const updatedTractor = await editDauKeo(id, formData);
      setData(prev => prev.map(item => (item.id === id ? { ...item, ...formData } : item)));
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
      await removeDauKeo(id);
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
      const result = await fetchAllDauKeo();
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
