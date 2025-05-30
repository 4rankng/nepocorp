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
        throw new Error(
          'Không nhận được phản hồi từ máy chủ khi tải định mức đi đường. Vui lòng kiểm tra kết nối mạng.'
        );
      }

      if (!dinhMucRes.success) {
        console.error('DinhMucDiDuong API Error:', dinhMucRes.error);
        throw new Error(
          dinhMucRes.error?.message ||
            'Lỗi khi tải dữ liệu định mức đi đường. Vui lòng thử lại sau.'
        );
      }

      console.log('Fetching tuyen duong data...');
      const tuyenDuongRes = await tuyenDuongApi.getAllTuyenDuong();

      // Validate tuyen duong response
      if (!tuyenDuongRes) {
        throw new Error(
          'Không nhận được phản hồi từ máy chủ khi tải tuyến đường. Vui lòng kiểm tra kết nối mạng.'
        );
      }

      if (!tuyenDuongRes.success) {
        console.error('TuyenDuong API Error:', tuyenDuongRes.error);
        throw new Error(
          tuyenDuongRes.error?.message || 'Lỗi khi tải danh sách tuyến đường. Vui lòng thử lại sau.'
        );
      }

      console.log('Fetching container data...');
      const containerRes = await containerApi.getAll();

      // Validate container response
      if (!containerRes) {
        throw new Error(
          'Không nhận được phản hồi từ máy chủ khi tải container. Vui lòng kiểm tra kết nối mạng.'
        );
      }

      if (!containerRes.success) {
        console.error('Container API Error:', containerRes.error);
        throw new Error(
          containerRes.error?.message ||
            'Lỗi khi tải danh sách loại container. Vui lòng thử lại sau.'
        );
      }

      // Handle different response structures from mock API
      const allDinhMuc = Array.isArray(dinhMucRes.data) ? dinhMucRes.data : [];
      const allTuyenDuong = Array.isArray(tuyenDuongRes.data) ? tuyenDuongRes.data : [];
      const allContainerTypes = Array.isArray(containerRes.data) ? containerRes.data : [];

      // Process container types from allContainerTypes (which has 'id', 'ma_so', and 'phan_loai')
      // Each item in allContainerTypes is an object like: { id: 1, ma_so: '...', phan_loai: '20ft DC', ... }
      const processedContainerTypes = allContainerTypes
        .filter(ct => ct && ct.phan_loai != null && String(ct.phan_loai).trim() !== '') // Ensure phan_loai exists and is not empty
        .map(ct => ({
          ma_loai_container: String(ct.phan_loai), // Use phan_loai as the unique ID for the type
          ten_loai_container: String(ct.phan_loai), // Use phan_loai as the display name for the type
        }));

      // Ensure uniqueness for container types based on ma_loai_container (which is derived from phan_loai)
      const uniqueContainerTypes = Array.from(
        new Map(
          processedContainerTypes.map(ct => [
            ct.ma_loai_container, // Key for map (e.g., "20ft DC")
            ct, // Value is the object { ma_loai_container: "20ft DC", ten_loai_container: "20ft DC" }
          ])
        ).values()
      );
      // uniqueContainerTypes will now be an array of objects like:
      // { ma_loai_container: "20ft DC", ten_loai_container: "20ft DC" },
      // { ma_loai_container: "40ft HC", ten_loai_container: "40ft HC" }, etc.

      // Create a map from container ma_so (e.g., 'CONU1234567') to phan_loai (e.g., '20ft DC')
      // This uses allContainerTypes which is the raw data from containerApi, where ma_so is the container code.
      const maSoToPhanLoaiMap = allContainerTypes.reduce((map, ct) => {
        if (ct && ct.ma_so && ct.phan_loai) {
          map[String(ct.ma_so)] = String(ct.phan_loai);
        }
        return map;
      }, {});

      // Transform roadNorms (allDinhMuc) to include ma_loai_container based on the phan_loai
      // Each norm in allDinhMuc has ma_cont which corresponds to ma_so in allContainerTypes.
      const transformedRoadNorms = allDinhMuc
        .map(norm => {
          const phanLoaiForNorm = maSoToPhanLoaiMap[String(norm.ma_cont)];
          return {
            ...norm,
            // Add ma_loai_container, which will be the phan_loai string (e.g., "20ft DC")
            // This ensures it matches the ma_loai_container in uniqueContainerTypes
            ma_loai_container: phanLoaiForNorm || null, // Handle cases where ma_cont might not map
          };
        })
        .filter(norm => norm.ma_loai_container !== null); // Optionally filter out norms that couldn't be mapped

      setContainerTypes(uniqueContainerTypes);
      setRoutes(allTuyenDuong);
      setRoadNorms(transformedRoadNorms);

      return {
        roadNorms: transformedRoadNorms,
        routes: allTuyenDuong,
        containerTypes: uniqueContainerTypes,
      };
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
        errorKeys: err ? Object.keys(err) : [],
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
  const createRoadNorm = useCallback(async formData => {
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
  const deleteRoadNorm = useCallback(async id => {
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
