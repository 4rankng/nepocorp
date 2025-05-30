import { useState, useEffect, useCallback } from 'react';
import * as dinhMucDauApi from '@services/mockApi/dinhMucDauApi';
import * as dauKeoApi from '@services/mockApi/dauKeoApi';
import * as roMoocApi from '@services/mockApi/roMoocApi';

/**
 * Hook for managing loaded fuel standards (định mức cho hàng/km có hàng)
 */
export const useChoHang = () => {
  const [dinhMucChoHang, setDinhMucChoHang] = useState({}); // Format: { '51C-12345': [...] }
  const [availableLicensePlates, setAvailableLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all loaded fuel standards
  const fetchChoHangData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dinhMucResponse, dauKeoResponse, roMoocResponse] = await Promise.all([
        dinhMucDauApi.getAllDinhMucDau(),
        dauKeoApi.fetchAllDauKeo(),
        roMoocApi.fetchAllRoMooc(),
      ]);

      // Handle API response errors with more specific messages
      if (!dinhMucResponse || !dauKeoResponse || !roMoocResponse) {
        throw new Error('Không nhận được phản hồi từ máy chủ. Vui lòng kiểm tra kết nối mạng.');
      }

      if (!dinhMucResponse.success) {
        console.error('DinhMucDau API Error:', dinhMucResponse.error);
        throw new Error(dinhMucResponse.error?.message || 'Lỗi khi tải dữ liệu định mức dầu. Vui lòng thử lại sau.');
      }
      if (!dauKeoResponse.success) {
        console.error('DauKeo API Error:', dauKeoResponse.error);
        throw new Error(dauKeoResponse.error?.message || 'Lỗi khi tải danh sách đầu kéo. Vui lòng thử lại sau.');
      }
      if (!roMoocResponse.success) {
        console.error('RoMooc API Error:', roMoocResponse.error);
        throw new Error(roMoocResponse.error?.message || 'Lỗi khi tải danh sách rơ mooc. Vui lòng thử lại sau.');
      }

      const allDinhMucData = dinhMucResponse.data?.items || dinhMucResponse.data || [];
      const dauKeoData = dauKeoResponse.data?.items || dauKeoResponse.data || [];
      const roMoocData = roMoocResponse.data?.items || roMoocResponse.data || [];

      // Filter for loaded standards (km_hang)
      const choHangDataItems = allDinhMucData.filter(item => item.phan_loai === 'km_hang');

      // Group by license plate
      const choHangGrouped = choHangDataItems.reduce((acc, item) => {
        const plateKey = item.bien_so_xe || item.bienSoXe;
        if (!acc[plateKey]) acc[plateKey] = [];
        acc[plateKey].push({
          id: item.id,
          fromKm: item.tuKm,
          toKm: item.denKm,
          standard: item.l_km,
          note: item.ghiChu,
          // Keep original fields for other operations
          bien_so_xe: plateKey,
          phan_loai: item.phan_loai,
          tuKm: item.tuKm,
          denKm: item.denKm,
          l_km: item.l_km,
          ghiChu: item.ghiChu,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
        return acc;
      }, {});

      setDinhMucChoHang(choHangGrouped);

      // Combine tractor and trailer license plates
      const tractorPlates = dauKeoData.map(dk => ({ 
        licensePlate: dk.bien_so, 
        type: 'dau_keo' 
      }));
      const trailerPlates = roMoocData.map(rm => ({ 
        licensePlate: rm.bien_so, 
        type: 'ro_mooc' 
      }));
      setAvailableLicensePlates([...tractorPlates, ...trailerPlates]);

      return { choHangGrouped, tractorPlates, trailerPlates };
    } catch (err) {
      console.error('Failed to fetch loaded fuel standards:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Không thể tải dữ liệu định mức chở hàng. Vui lòng thử lại.';
      setError(errorMessage);
      // Return empty data to prevent UI from breaking
      setDinhMucChoHang({});
      setAvailableLicensePlates([]);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create cho hang standard
  const createChoHangStandard = useCallback(async (formData) => {
    setIsLoading(true);
    setError('');
    try {
      const apiData = {
        bien_so_xe: formData.bienSoXe,
        phan_loai: 'km_hang',
        tuKm: parseFloat(formData.fromKm),
        denKm: parseFloat(formData.toKm),
        l_km: parseFloat(formData.standard),
        ghiChu: formData.note,
      };

      const response = await dinhMucDauApi.create(apiData);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create cho hang standard');
      }

      // Refresh data to get updated grouping
      await fetchChoHangData();
      return response.data;
    } catch (err) {
      console.error('Error creating cho hang standard:', err);
      setError('Không thể thêm định mức cho hàng');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchChoHangData]);

  // Update cho hang standard
  const updateChoHangStandard = useCallback(async (id, formData) => {
    setIsLoading(true);
    setError('');
    try {
      const apiData = {
        bien_so_xe: formData.bienSoXe,
        phan_loai: 'km_hang',
        tuKm: parseFloat(formData.fromKm),
        denKm: parseFloat(formData.toKm),
        l_km: parseFloat(formData.standard),
        ghiChu: formData.note,
      };

      const response = await dinhMucDauApi.update(id, apiData);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update cho hang standard');
      }

      // Refresh data to get updated grouping
      await fetchChoHangData();
      return response.data;
    } catch (err) {
      console.error('Error updating cho hang standard:', err);
      setError('Không thể cập nhật định mức cho hàng');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchChoHangData]);

  // Delete cho hang standard
  const deleteChoHangStandard = useCallback(async (id) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dinhMucDauApi.delete(id);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete cho hang standard');
      }

      // Refresh data to get updated grouping
      await fetchChoHangData();
      return true;
    } catch (err) {
      console.error('Error deleting cho hang standard:', err);
      setError('Không thể xóa định mức cho hàng');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchChoHangData]);

  // Load data on mount
  useEffect(() => {
    fetchChoHangData().catch(err => {
      // Error is already handled in fetchChoHangData, this is just to prevent unhandled promise rejection
      console.warn('Error caught in useChoHang useEffect:', err.message);
    });
  }, [fetchChoHangData]);

  return {
    dinhMucChoHang,
    availableLicensePlates,
    isLoading,
    error,
    fetchChoHangData,
    createChoHangStandard,
    updateChoHangStandard,
    deleteChoHangStandard,
  };
};
