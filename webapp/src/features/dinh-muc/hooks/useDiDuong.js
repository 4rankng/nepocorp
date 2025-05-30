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
      // Fetch data sequentially to isolate errors
      console.log('Fetching dinh muc di duong data...');
      const dinhMucRes = await dinhMucDiDuongApi.getAllDinhMucDiDuong();

      // Validate dinh muc response
      if (!dinhMucRes) {
        throw new Error('Không nhận được phản hồi từ máy chủ khi tải định mức đi đường. Vui lòng kiểm tra kết nối mạng.');
      }

      if (!dinhMucRes.success) {
        console.error('DinhMucDiDuong API Error:', dinhMucRes.error);
        throw new Error(dinhMucRes.error?.message || 'Lỗi khi tải dữ liệu định mức đi đường. Vui lòng thử lại sau.');
      }

      console.log('Fetching tuyen duong data...');
      const tuyenDuongRes = await tuyenDuongApi.getAllTuyenDuong();

      // Validate tuyen duong response
      if (!tuyenDuongRes) {
        throw new Error('Không nhận được phản hồi từ máy chủ khi tải tuyến đường. Vui lòng kiểm tra kết nối mạng.');
      }

      if (!tuyenDuongRes.success) {
        console.error('TuyenDuong API Error:', tuyenDuongRes.error);
        throw new Error(tuyenDuongRes.error?.message || 'Lỗi khi tải danh sách tuyến đường. Vui lòng thử lại sau.');
      }

      console.log('Fetching container data...');
      const containerRes = await containerApi.getAll();

      // Validate container response
      if (!containerRes) {
        throw new Error('Không nhận được phản hồi từ máy chủ khi tải container. Vui lòng kiểm tra kết nối mạng.');
      }

      if (!containerRes.success) {
        console.error('Container API Error:', containerRes.error);
        throw new Error(containerRes.error?.message || 'Lỗi khi tải danh sách loại container. Vui lòng thử lại sau.');
      }

      // Handle different response structures from mock API
      const allDinhMuc = Array.isArray(dinhMucRes.data) ? dinhMucRes.data : [];
      const allTuyenDuong = Array.isArray(tuyenDuongRes.data) ? tuyenDuongRes.data : [];
      const allContainerTypes = Array.isArray(containerRes.data) ? containerRes.data : [];

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
      console.error('useDiDuong.js error: ', err);

      // Handle different error object structures
      let errorMessage = 'Không thể tải dữ liệu định mức đi đường. Vui lòng thử lại.';

      if (err.error && typeof err.error === 'object') {
        // Handle API error response object
        errorMessage = err.error.message || errorMessage;
      } else if (err.message) {
        // Handle standard Error objects
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        // Handle string errors
        errorMessage = err;
      }

      console.error('Error details:', {
        error: err,
        errorMessage,
        errorType: typeof err,
        hasErrorProperty: !!err.error,
        errorKeys: err ? Object.keys(err) : []
      });

      setError(errorMessage);
      // Return empty data to prevent UI from breaking
      setRoadNorms([]);
      setRoutes([]);
      setContainerTypes([]);
      // Don't re-throw the error to prevent uncaught promise rejection
      // The error is already handled by the error state and message
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
