import { useState, useEffect, useCallback } from 'react';
// Mock API objects returning empty data until backend is integrated
const dinhMucDiDuongApi = {
  getCount: async () => 0,
  getRoadNorms: async () => [],
};
const tuyenDuongApi = {
  getAll: async () => ({ data: [] }),
  getAllWithoutPagination: async () => [],
};
const containerApi = {
  getAll: async () => ({ data: [] }),
  getAllWithoutPagination: async () => [],
};
import logger from '@services/logger';
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
      // First get the total count of records
      const [tuyenDuongCountRes, containerRes] = await Promise.all([
        tuyenDuongApi.getTuyenDuongCount(),
        containerApi.getAll(),
      ]);

      if (!tuyenDuongCountRes || !tuyenDuongCountRes.success) {
        throw new Error(tuyenDuongCountRes?.error?.message || 'Lỗi khi lấy số lượng tuyến đường.');
      }

      if (!containerRes || !containerRes.success) {
        throw new Error(containerRes?.error?.message || 'Lỗi khi tải danh sách loại container.');
      }

      const totalRoutes = tuyenDuongCountRes.data;
      const pageSize = 100; // Reasonable page size
      const totalPages = Math.ceil(totalRoutes / pageSize);

      // Fetch all pages of routes
      const routePromises = [];
      for (let page = 1; page <= totalPages; page++) {
        routePromises.push(tuyenDuongApi.getAllTuyenDuong(page, pageSize));
      }

      // Fetch all routes and dinh muc data
      const [routeResponses, dinhMucRes] = await Promise.all([
        Promise.all(routePromises),
        dinhMucDiDuongApi.getAllDinhMucDiDuong(1, 1000), // Get all dinh muc records
      ]);

      // Validate responses
      if (!dinhMucRes || !dinhMucRes.success) {
        throw new Error(dinhMucRes?.error?.message || 'Lỗi khi tải dữ liệu định mức đi đường.');
      }

      // Combine all route pages
      const allTuyenDuong = routeResponses.reduce((acc, response) => {
        if (response && response.success && Array.isArray(response.data)) {
          return [...acc, ...response.data];
        }
        return acc;
      }, []);

      // Handle different response structures from mock API
      const allDinhMuc = Array.isArray(dinhMucRes.data) ? dinhMucRes.data : [];
      const allContainerTypes = Array.isArray(containerRes.data) ? containerRes.data : [];

      // Process container types from allContainerTypes (which has 'id', 'ma_so', and 'phan_loai')
      const processedContainerTypes = allContainerTypes
        .filter(ct => ct && ct.phan_loai != null && String(ct.phan_loai).trim() !== '')
        .map(ct => ({
          ma_loai_container: String(ct.phan_loai),
          ten_loai_container: String(ct.phan_loai),
        }));

      // Ensure uniqueness for container types
      const uniqueContainerTypes = Array.from(
        new Map(processedContainerTypes.map(ct => [ct.ma_loai_container, ct])).values()
      );

      // Create a map from container ma_so to phan_loai
      const maSoToPhanLoaiMap = allContainerTypes.reduce((map, ct) => {
        if (ct && ct.ma_so && ct.phan_loai) {
          map[String(ct.ma_so)] = String(ct.phan_loai);
        }
        return map;
      }, {});

      // Transform roadNorms to include ma_loai_container
      const transformedRoadNorms = allDinhMuc
        .map(norm => {
          const phanLoaiForNorm = maSoToPhanLoaiMap[String(norm.ma_cont)];
          return {
            ...norm,
            ma_loai_container: phanLoaiForNorm || null,
          };
        })
        .filter(norm => norm.ma_loai_container !== null);

      setContainerTypes(uniqueContainerTypes);
      setRoutes(allTuyenDuong);
      setRoadNorms(transformedRoadNorms);

      return {
        roadNorms: transformedRoadNorms,
        routes: allTuyenDuong,
        containerTypes: uniqueContainerTypes,
      };
    } catch (err) {
      logger.error('Error in fetchAllData:', err);
      let errorMessage = 'Không thể tải dữ liệu định mức đi đường. Vui lòng thử lại.';
      if (err.error && typeof err.error === 'object') {
        errorMessage = err.error.message || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);
      setRoadNorms([]);
      setRoutes([]);
      setContainerTypes([]);
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
      setError('Không thể sửa định mức đi đường');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Delete road norm
  const deleteRoadNorm = useCallback(async (id, { updateLocalState = true } = {}) => {
    // Added options object with updateLocalState, defaulting to true
    setIsLoading(true);
    setError('');
    try {
      const response = await dinhMucDiDuongApi.deleteDinhMucDiDuong(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete road norm');
      }
      if (updateLocalState) {
        setRoadNorms(prev => prev.filter(item => item.id !== id));
      }
      return true;
    } catch (err) {
      // It's better to throw the specific error message from the API if available
      const apiErrorMessage = err.response?.data?.error?.message || err.message;
      setError(apiErrorMessage || 'Không thể xóa định mức đi đường');
      throw err; // Re-throw to allow calling function to handle
    } finally {
      // Only set isLoading to false if we are not in a batch operation controlled by another function
      // However, for individual deletes, this is fine.
      setIsLoading(false);
    }
  }, []);

  // New function to delete a route and all its associated norms
  const deleteTuyenDuongAndNorms = useCallback(
    async routeId => {
      setIsLoading(true);
      setError('');
      try {
        // 1. Find all road norms associated with this routeId (ma_tuyen)
        const normsForRoute = roadNorms.filter(norm => norm.ma_tuyen === routeId);

        // 2. Delete each associated road norm
        // We call deleteRoadNorm with updateLocalState = false to avoid multiple re-renders
        // and then update roadNorms state once at the end.
        for (const norm of normsForRoute) {
          await deleteRoadNorm(norm.id, { updateLocalState: false });
        }

        // 3. Find the actual route object to get its numeric ID
        const routeToDelete = routes.find(route => route.ma_so === routeId);
        if (!routeToDelete) {
          // This should ideally not happen if routeId comes from a valid selection
          throw new Error(`Route with ma_so ${routeId} not found in local state.`);
        }
        const numericRouteId = routeToDelete.id; // Assuming 'id' is the numeric primary key

        // Delete the tuyenDuong record itself using its numeric ID
        const deleteRouteResponse = await tuyenDuongApi.deleteTuyenDuong(numericRouteId);
        if (!deleteRouteResponse.success) {
          throw new Error(
            deleteRouteResponse.error?.message || `Failed to delete route with ID ${numericRouteId}`
          );
        }

        // 4. Update local state for roadNorms (remove all norms for the deleted route)
        setRoadNorms(prev => prev.filter(norm => norm.ma_tuyen !== routeId));

        // 5. Update local state for routes (remove the deleted route)
        setRoutes(prev => prev.filter(route => route.ma_so !== routeId));

        return true;
      } catch (err) {
        const apiErrorMessage = err.response?.data?.error?.message || err.message;
        setError(apiErrorMessage || 'Không thể xóa tuyến đường và các định mức liên quan.');
        throw err; // Re-throw for the component to handle (e.g., show notification)
      } finally {
        setIsLoading(false);
      }
    },
    [roadNorms, routes, deleteRoadNorm]
  ); // Added routes to dependency array

  // Delete road norm (original - kept for potential direct use, but deleteTuyenDuongAndNorms is preferred for UI actions)
  const originalDeleteRoadNorm = useCallback(async id => {
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
    deleteRoadNorm: originalDeleteRoadNorm, // Keep original for direct norm deletion if ever needed
    deleteTuyenDuongAndNorms, // Expose the new function
  };
};
