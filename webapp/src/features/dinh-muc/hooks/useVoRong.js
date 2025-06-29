import { useState, useEffect, useCallback, useRef } from 'react';
import { useVehicleData } from '@contexts/VehicleDataContext';

// Fuel standards API not yet implemented - return empty data
const dinhMucDauApi = {
  getCount: async () => 0,
  getVoRongRecords: async () => []
};

/**
 * Hook for managing empty fuel standards (định mức vỏ rỗng/km không hàng)
 */
export const useVoRong = () => {
  const { tractors, trailers, fetchTractors, fetchTrailers, loading } = useVehicleData();
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

  // Store raw data for filtering/pagination
  const [rawVoRongData, setRawVoRongData] = useState([]);

  // Use ref to store the latest fetch function to avoid dependency issues
  const fetchVoRongDataRef = useRef();

  // Process data function to handle grouping only (no filtering/pagination)
  const processVoRongData = useCallback(
    (voRongDataItems) => {
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

      // Create flat array for table display
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

      // Store raw data for filtering/pagination
      setRawVoRongData(voRongFlat);

      // Combine tractor and trailer license plates from cached data
      const tractorPlates =
        tractors?.map(dk => ({
          licensePlate: dk.license_plate,
          type: 'dau_keo',
        })) || [];
      const trailerPlates =
        trailers?.map(rm => ({
          licensePlate: rm.license_plate,
          type: 'ro_mooc',
        })) || [];
      setAvailableLicensePlates([...tractorPlates, ...trailerPlates]);

      // Set license plates for dropdown (from actual vo rong data)
      const voRongPlates = Array.from(new Set(voRongFlat.map(r => r.bienSoXe).filter(Boolean))).map(
        plate => ({ id: plate, bien_so: plate })
      );
      setLicensePlates(voRongPlates);

      return { voRongGrouped, voRongFlat };
    },
    [tractors, trailers] // Add tractors and trailers as dependencies
  );

  // Separate function to handle filtering and pagination
  const applyFiltersAndPagination = useCallback(() => {
    if (rawVoRongData.length === 0) return;

    // Apply search filter
    let filteredRecords = rawVoRongData;
    if (searchTerm || selectedPlate) {
      const searchValue = selectedPlate || searchTerm;
      filteredRecords = rawVoRongData.filter(
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
  }, [rawVoRongData, searchTerm, selectedPlate, pagination.page, pagination.pageSize]);

  // Fetch all empty fuel standards
  const fetchVoRongData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // Ensure vehicle data is loaded from cache
      await Promise.all([fetchTractors(), fetchTrailers()]);

      const dinhMucResponse = await dinhMucDauApi.getAllDinhMucDau();

      // Handle API response errors with more specific messages
      if (!dinhMucResponse) {
        throw new Error('Không nhận được phản hồi từ máy chủ. Vui lòng kiểm tra kết nối mạng.');
      }
      if (!dinhMucResponse.success) {
        throw new Error(
          dinhMucResponse.error?.message ||
            'Lỗi khi tải dữ liệu định mức dầu. Vui lòng thử lại sau.'
        );
      }

      const allDinhMucData = dinhMucResponse.data?.items || dinhMucResponse.data || [];

      // Filter for empty standards (km_vo)
      const voRongDataItems = allDinhMucData.filter(item => item.phan_loai === 'km_vo');

      // Process and set data
      processVoRongData(voRongDataItems);

      return { voRongDataItems };
    } catch (err) {
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
      setRawVoRongData([]);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [processVoRongData, fetchTractors, fetchTrailers]); // Keep processVoRongData dependency

  // Update the ref whenever fetchVoRongData changes
  fetchVoRongDataRef.current = fetchVoRongData;
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
        await fetchVoRongDataRef.current();
        return response.data;
      } catch (err) {
        setError('Không thể thêm định mức vỏ rỗng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [] // Remove fetchVoRongData dependency to prevent infinite loops
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
        await fetchVoRongDataRef.current();
        return response.data;
      } catch (err) {
        setError('Không thể sửa định mức vỏ rỗng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [] // Remove fetchVoRongData dependency to prevent infinite loops
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
        await fetchVoRongDataRef.current();
        return true;
      } catch (err) {
        setError('Không thể xóa định mức vỏ rỗng');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [] // Remove fetchVoRongData dependency to prevent infinite loops
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
    fetchVoRongDataRef.current?.();
  }, []);

  // Apply filtering and pagination when search/pagination state changes
  useEffect(() => {
    applyFiltersAndPagination();
  }, [applyFiltersAndPagination]);

  // Load data on mount
  useEffect(() => {
    fetchVoRongDataRef.current?.();
  }, []);
  return {
    dinhMucVoRong,
    voRongRecords,
    licensePlates,
    availableLicensePlates,
    isLoading: isLoading || loading.tractors || loading.trailers,
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
