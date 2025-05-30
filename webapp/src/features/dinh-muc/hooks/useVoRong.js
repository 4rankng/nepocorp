import { useState, useEffect, useCallback } from 'react';
import * as dinhMucDauApi from '@services/mockApi/dinhMucDauApi';
import * as dauKeoApi from '@services/mockApi/dauKeoApi';
import * as roMoocApi from '@services/mockApi/roMoocApi';

/**
 * Hook for managing empty fuel standards (định mức vỏ rỗng/km không hàng)
 */
export const useVoRong = () => {
  const [dinhMucVoRong, setDinhMucVoRong] = useState({}); // Format: { '51C-12345': [...] }
  const [availableLicensePlates, setAvailableLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all empty fuel standards
  const fetchVoRongData = useCallback(async () => {
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
        throw new Error(
          dinhMucResponse.error?.message ||
            'Lỗi khi tải dữ liệu định mức dầu. Vui lòng thử lại sau.'
        );
      }
      if (!dauKeoResponse.success) {
        console.error('DauKeo API Error:', dauKeoResponse.error);
        throw new Error(
          dauKeoResponse.error?.message || 'Lỗi khi tải danh sách đầu kéo. Vui lòng thử lại sau.'
        );
      }
      if (!roMoocResponse.success) {
        console.error('RoMooc API Error:', roMoocResponse.error);
        throw new Error(
          roMoocResponse.error?.message || 'Lỗi khi tải danh sách rơ mooc. Vui lòng thử lại sau.'
        );
      }

      const allDinhMucData = dinhMucResponse.data?.items || dinhMucResponse.data || [];
      const dauKeoData = dauKeoResponse.data?.items || dauKeoResponse.data || [];
      const roMoocData = roMoocResponse.data?.items || roMoocResponse.data || [];

      // Filter for empty standards (km_vo)
      const voRongDataItems = allDinhMucData.filter(item => item.phan_loai === 'km_vo');

      // Group by license plate
      const voRongGrouped = voRongDataItems.reduce((acc, item) => {
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

      setDinhMucVoRong(voRongGrouped);

      // Combine tractor and trailer license plates
      const tractorPlates = dauKeoData.map(dk => ({
        licensePlate: dk.bien_so,
        type: 'dau_keo',
      }));
      const trailerPlates = roMoocData.map(rm => ({
        licensePlate: rm.bien_so,
        type: 'ro_mooc',
      }));
      setAvailableLicensePlates([...tractorPlates, ...trailerPlates]);

      return { voRongGrouped, tractorPlates, trailerPlates };
    } catch (err) {
      console.error('Failed to fetch empty fuel standards:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Không thể tải dữ liệu định mức vỏ rỗng. Vui lòng thử lại.';
      setError(errorMessage);
      // Return empty data to prevent UI from breaking
      setDinhMucVoRong({});
      setAvailableLicensePlates([]);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create vo rong standard
  const createVoRongStandard = useCallback(
    async formData => {
      setIsLoading(true);
      setError('');
      try {
        const apiData = {
          bien_so_xe: formData.bienSoXe,
          phan_loai: 'km_vo',
          tuKm: parseFloat(formData.fromKm),
          denKm: parseFloat(formData.toKm),
          l_km: parseFloat(formData.standard),
          ghiChu: formData.note,
        };

        const response = await dinhMucDauApi.create(apiData);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to create vo rong standard');
        }

        // Refresh data to get updated grouping
        await fetchVoRongData();
        return response.data;
      } catch (err) {
        console.error('Error creating vo rong standard:', err);
        setError('Không thể thêm định mức vỏ rỗng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchVoRongData]
  );

  // Update vo rong standard
  const updateVoRongStandard = useCallback(
    async (id, formData) => {
      setIsLoading(true);
      setError('');
      try {
        const apiData = {
          bien_so_xe: formData.bienSoXe,
          phan_loai: 'km_vo',
          tuKm: parseFloat(formData.fromKm),
          denKm: parseFloat(formData.toKm),
          l_km: parseFloat(formData.standard),
          ghiChu: formData.note,
        };

        const response = await dinhMucDauApi.update(id, apiData);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to update vo rong standard');
        }

        // Refresh data to get updated grouping
        await fetchVoRongData();
        return response.data;
      } catch (err) {
        console.error('Error updating vo rong standard:', err);
        setError('Không thể cập nhật định mức vỏ rỗng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchVoRongData]
  );

  // Delete vo rong standard
  const deleteVoRongStandard = useCallback(
    async id => {
      setIsLoading(true);
      setError('');
      try {
        const response = await dinhMucDauApi.delete(id);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to delete vo rong standard');
        }

        // Refresh data to get updated grouping
        await fetchVoRongData();
        return true;
      } catch (err) {
        console.error('Error deleting vo rong standard:', err);
        setError('Không thể xóa định mức vỏ rỗng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchVoRongData]
  );

  // Load data on mount
  useEffect(() => {
    fetchVoRongData();
  }, [fetchVoRongData]);

  return {
    dinhMucVoRong,
    availableLicensePlates,
    isLoading,
    error,
    fetchVoRongData,
    createVoRongStandard,
    updateVoRongStandard,
    deleteVoRongStandard,
  };
};
