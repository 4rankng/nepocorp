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
      const result = await fetchAllRoMooc();
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
      const newTrailer = await addRoMooc(formData);
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
      const updatedTrailer = await editRoMooc(id, formData);
      setData(prev => prev.map(item => (item.id === id ? { ...item, ...formData } : item)));
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
      await removeRoMooc(id);
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
      const result = await fetchAllRoMooc();
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
