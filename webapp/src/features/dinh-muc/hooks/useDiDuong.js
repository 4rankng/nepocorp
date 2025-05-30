import { useState, useEffect, useCallback } from 'react';
import * as dinhMucDiDuongApi from '@services/mockApi/dinhMucDiDuongApi';
import * as tuyenDuongApi from '@services/mockApi/tuyenDuongApi';
import { containerApi } from '@services/mockApi/containerApi';

/**
 * Hook for managing road travel fuel standards (định mức đi đường)
 */
export const useDiDuong = () => {
  const [roadNorms, setRoadNorms] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all road travel data
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dinhMucRes, tuyenDuongRes, containerRes] = await Promise.all([
        dinhMucDiDuongApi.getAllDinhMucDiDuong(),
        tuyenDuongApi.getAllTuyenDuong(),
        containerApi.getAll(),
      ]);

      // Handle new standardized API response format
      if (!dinhMucRes.success) {
        throw new Error(dinhMucRes.error?.message || 'Failed to fetch road norms');
      }
      if (!tuyenDuongRes.success) {
        throw new Error(tuyenDuongRes.error?.message || 'Failed to fetch routes');
      }
      if (!containerRes.success) {
        throw new Error(containerRes.error?.message || 'Failed to fetch container types');
      }

      const allDinhMuc = dinhMucRes.data?.items || dinhMucRes.data || [];
      const allTuyenDuong = tuyenDuongRes.data?.items || tuyenDuongRes.data || [];
      const allContainerTypes = containerRes.data?.items || containerRes.data || [];

      // Process container types
      const validContainerTypes = allContainerTypes.filter(
        ct => ct && ct.ma_loai_container != null
      );
      const uniqueContainerTypes = Array.from(
        new Map(
          validContainerTypes.map(ct => [
            String(ct.ma_loai_container),
            {
              ma_loai_container: String(ct.ma_loai_container),
              ten_loai_container: ct.ten_loai_container,
            },
          ])
        ).values()
      );

      setContainerTypes(uniqueContainerTypes);
      setRoutes(allTuyenDuong);
      setRoadNorms(allDinhMuc);

      return { roadNorms: allDinhMuc, routes: allTuyenDuong, containerTypes: uniqueContainerTypes };
    } catch (err) {
      console.error('Failed to fetch road travel data:', err);
      setError('Không thể tải dữ liệu định mức đi đường. Vui lòng thử lại.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create road norm
  const createRoadNorm = useCallback(async (formData) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dinhMucDiDuongApi.createDinhMucDiDuong(formData);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create road norm');
      }

      const newNorm = response.data;
      setRoadNorms(prev => [...prev, newNorm]);
      return newNorm;
    } catch (err) {
      console.error('Error creating road norm:', err);
      setError('Không thể thêm định mức đi đường mới');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update road norm
  const updateRoadNorm = useCallback(async (id, formData) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dinhMucDiDuongApi.updateDinhMucDiDuong(id, formData);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update road norm');
      }

      const updatedNorm = response.data;
      setRoadNorms(prev => prev.map(item => (item.id === id ? updatedNorm : item)));
      return updatedNorm;
    } catch (err) {
      console.error('Error updating road norm:', err);
      setError('Không thể cập nhật định mức đi đường');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete road norm
  const deleteRoadNorm = useCallback(async (id) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dinhMucDiDuongApi.deleteDinhMucDiDuong(id);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete road norm');
      }

      setRoadNorms(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting road norm:', err);
      setError('Không thể xóa định mức đi đường');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    roadNorms,
    containerTypes,
    routes,
    isLoading,
    error,
    fetchAllData,
    createRoadNorm,
    updateRoadNorm,
    deleteRoadNorm,
  };
};
