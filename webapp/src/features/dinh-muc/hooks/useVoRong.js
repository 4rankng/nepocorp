import { useState, useEffect, useCallback } from 'react';
import * as dinhMucDauApi from '@services/mockApi/dinhMucDauApi';
import * as dauKeoApi from '@services/mockApi/dauKeoApi';
import * as roMoocApi from '@services/mockApi/roMoocApi';

/**
 * Hook for managing empty fuel standards (định mức vỏ rỗng/km không hàng)
 */
export const useVoRong = () => {
  const [dinhMucVoRong, setDinhMucVoRong] = useState({}); // Format: { '51C-12345': [...] }
  const [voRongRecords, setVoRongRecords] = useState([]); // Flat array for table
  const [availableLicensePlates, setAvailableLicensePlates] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]); // For dropdown
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 0, // 0-indexed for MUI TablePagination
    pageSize: 5,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlate, setSelectedPlate] = useState('');

  // Process data function to handle filtering and pagination
  const processVoRongData = useCallback(
    (voRongDataItems, dauKeoData, roMoocData) => {
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

      // Create flat array for table display with search and pagination
      const voRongFlat = voRongDataItems.map(item => ({
        id: item.id,
        bienSoXe: item.bien_so_xe || item.bienSoXe,
        tuKm: item.tuKm,
        denKm: item.denKm,
        l_km: item.l_km,
        ghiChu: item.ghiChu,
        // Keep original fields for other operations
        bien_so_xe: item.bien_so_xe || item.bienSoXe,
        phan_loai: item.phan_loai,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      // Apply search filter
      let filteredRecords = voRongFlat;
      if (searchTerm || selectedPlate) {
        const searchValue = selectedPlate || searchTerm;
        filteredRecords = voRongFlat.filter(
          record =>
            record.bienSoXe?.toLowerCase().includes(searchValue.toLowerCase()) ||
            record.ghiChu?.toLowerCase().includes(searchValue.toLowerCase())
        );
      }

      // Apply pagination
      const startIndex = pagination.page * pagination.pageSize;
      const endIndex = startIndex + pagination.pageSize;
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

      setVoRongRecords(paginatedRecords);
      setPagination(prev => ({
        ...prev,
        total: filteredRecords.length,
        totalPages: Math.ceil(filteredRecords.length / prev.pageSize),
      }));

      // Combine tractor and trailer license plates
      const tractorPlates =
        dauKeoData?.map(dk => ({
          licensePlate: dk.bien_so,
          type: 'dau_keo',
        })) || [];
      const trailerPlates =
        roMoocData?.map(rm => ({
          licensePlate: rm.bien_so,
          type: 'ro_mooc',
        })) || [];
      setAvailableLicensePlates([...tractorPlates, ...trailerPlates]);

      // Set license plates for dropdown (from actual vo rong data)
      const voRongPlates = Array.from(new Set(voRongFlat.map(r => r.bienSoXe).filter(Boolean))).map(
        plate => ({ id: plate, bien_so: plate })
      );
      setLicensePlates(voRongPlates);
    },
    [searchTerm, selectedPlate, pagination.page, pagination.pageSize]
  );

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

      // Process and set data
      processVoRongData(voRongDataItems, dauKeoData, roMoocData);

      return { voRongDataItems, dauKeoData, roMoocData };
    } catch (err) {
      console.error('Failed to fetch empty fuel standards:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Không thể tải dữ liệu định mức vỏ rỗng. Vui lòng thử lại.';
      setError(errorMessage);

      // Return empty data to prevent UI from breaking
      setDinhMucVoRong({});
      setVoRongRecords([]);
      setAvailableLicensePlates([]);
      setLicensePlates([]);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [processVoRongData]);
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

  // Pagination and search handlers
  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = event => {
    setPagination(prev => ({
      ...prev,
      pageSize: parseInt(event.target.value, 10),
      page: 0,
    }));
  };

  const handleSearchChange = newSearchTerm => {
    setSearchTerm(newSearchTerm);
    setSelectedPlate(''); // Clear plate filter when searching
    setPagination(prev => ({ ...prev, page: 0 })); // Reset to first page on new search
  };

  const handlePlateChange = newPlate => {
    setSelectedPlate(newPlate);
    setSearchTerm(''); // Clear search when filtering by plate
    setPagination(prev => ({ ...prev, page: 0 })); // Reset to first page on plate change
  };

  // Refetch with current filters
  const refetchData = useCallback(() => {
    fetchVoRongData();
  }, [fetchVoRongData]);

  // Re-run data processing when search/pagination changes
  useEffect(() => {
    if (Object.keys(dinhMucVoRong).length > 0) {
      // Reprocess the data with current filters
      fetchVoRongData();
    }
  }, [searchTerm, selectedPlate, pagination.page, pagination.pageSize, dinhMucVoRong, fetchVoRongData]);

  // Load data on mount
  useEffect(() => {
    fetchVoRongData();
  }, [fetchVoRongData]);
  return {
    dinhMucVoRong,
    voRongRecords,
    licensePlates,
    availableLicensePlates,
    isLoading,
    error,
    fetchVoRongData,
    fetchData: refetchData,
    createVoRongStandard,
    updateVoRongStandard,
    deleteVoRongStandard,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onRowsPerPageChange: handleRowsPerPageChange,
    },
    searchTerm,
    selectedPlate,
    handleSearchChange,
    handlePlateChange,
  };
};
