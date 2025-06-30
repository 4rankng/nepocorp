// webapp/src/features/dinh-muc/hooks/useChoHang.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVehicleData } from '@contexts/VehicleDataContext';
// Mock API object returning empty data until backend is integrated
const dinhMucDauApi = {
  getCount: async () => 0,
  getChoHangRecords: async () => [],
  getAllLicensePlates: async () => []
};

export const useChoHang = () => {
  const { tractors, fetchTractors, loading } = useVehicleData();
  const [choHangRecords, setChoHangRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0, // 0-indexed for MUI TablePagination
    pageSize: 5,
    total: 0,
    totalPages: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlate, setSelectedPlate] = useState('');

  // Get license plates from cached tractor data
  const licensePlates = useMemo(() => {
    if (!tractors || !Array.isArray(tractors)) return [];

    // Extract unique license plates from tractors
    const plates = new Set();
    tractors.forEach(tractor => {
      if (tractor.license_plate) {
        plates.add(tractor.license_plate);
      }
    });

    return Array.from(plates).map(plate => ({
      id: plate,
      bien_so: plate,
    }));
  }, [tractors]);

  const fetchDataInternal = useCallback(
    async (currentPage, currentLimit, currentSearchTerm) => {
      setIsLoading(true);
      setError(null);
      try {
        // Ensure tractor data is loaded from cache
        await fetchTractors();

        // API uses 1-based indexing for page, UI uses 0-based
        const response = await dinhMucDauApi.getAllDinhMucChoHang(
          currentPage + 1,
          currentLimit,
          currentSearchTerm
        );
        if (response.success) {
          setChoHangRecords(response.data || []);
          setPagination(prev => ({
            ...prev,
            page: response.meta.page - 1, // Adjust back to 0-indexed
            pageSize: response.meta.limit,
            // 'response.meta.total' (from apiWrapper's totalItems) is the grand total of items matching the query.
            // 'response.meta.count' is the number of items on the current page.
            total: response.meta.total, // Use the grand total for TablePagination
            totalPages: response.meta.totalPages,
          }));
        } else {
          throw new Error(response.error?.message || 'Failed to fetch Cho Hang records');
        }
      } catch (err) {
        setError(err.message || 'An unexpected error occurred');
        setChoHangRecords([]); // Clear data on error
      } finally {
        setIsLoading(false);
      }
    },
    [fetchTractors]
  );

  useEffect(() => {
    // Plate filter takes precedence over search term
    const effectiveSearchTerm = selectedPlate || searchTerm;
    fetchDataInternal(pagination.page, pagination.pageSize, effectiveSearchTerm);
  }, [fetchDataInternal, pagination.page, pagination.pageSize, searchTerm, selectedPlate]);

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = event => {
    setPagination(prev => ({ ...prev, pageSize: parseInt(event.target.value, 10), page: 0 }));
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

  const refetchData = useCallback(() => {
    // Plate filter takes precedence over search term
    const effectiveSearchTerm = selectedPlate || searchTerm;
    fetchDataInternal(pagination.page, pagination.pageSize, effectiveSearchTerm);
  }, [fetchDataInternal, pagination.page, pagination.pageSize, searchTerm, selectedPlate]);

  return {
    choHangRecords,
    setChoHangRecords,
    licensePlates,
    isLoading: isLoading || loading.tractors,
    error,
    fetchData: refetchData,
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
