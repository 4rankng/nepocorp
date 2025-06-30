import { useState, useEffect, useCallback } from 'react';
import logger from '@services/logger';
import { containerApi } from '@services/api/containerApi';
import { useVehicleData } from '@contexts/VehicleDataContext';

export const useContainer = () => {
  const { invalidateCache, refreshCache } = useVehicleData();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(0);
  const [pagination, setPagination] = useState(null);

  // Fetch all containers
  const fetchAll = useCallback(async (page = 1, limit = 100) => {
    setLoading(true);
    setError('');
    try {
      const response = await containerApi.getAll(page, limit);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to fetch containers');
      }

      setData(response.data || []);
      setPagination(response.pagination);
      setCount(response.pagination?.records_count || response.data?.length || 0);

      return response.data;
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách container');
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
      const response = await containerApi.create(formData);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to create container');
      }

      const newContainer = response.data;
      setData(prev => [...prev, newContainer]);
      setCount(prev => prev + 1);

      // Invalidate and refresh cache after creating
      invalidateCache(['containers']);
      refreshCache(['containers']);

      return newContainer;
    } catch (err) {
      setError(err.message || 'Không thể thêm container mới');
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
      const response = await containerApi.update(id, formData);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to update container');
      }

      const updatedContainer = response.data;
      setData(prev => prev.map(item => (item.id === id ? updatedContainer : item)));

      // Invalidate and refresh cache after updating
      invalidateCache(['containers']);
      refreshCache(['containers']);

      return updatedContainer;
    } catch (err) {
      setError(err.message || 'Không thể sửa container');
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
      const response = await containerApi.delete(id);

      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to delete container');
      }

      setData(prev => prev.filter(item => item.id !== id));
      setCount(prev => prev - 1);

      // Invalidate and refresh cache after deleting
      invalidateCache(['containers']);
      refreshCache(['containers']);
    } catch (err) {
      setError(err.message || 'Không thể xóa container');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh count only
  const refreshCount = useCallback(async () => {
    try {
      const response = await containerApi.getAll(1, 1);
      if (response.status === 'success') {
        setCount(response.pagination?.records_count || 0);
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
    pagination,
    fetchAll,
    create,
    update,
    remove,
    refreshCount,
  };
};
