import { useState, useCallback, useEffect } from 'react';
import logger from '@services/logger';
import { tractorApi } from '@services/api/tractorApi';
import { trailerApi } from '@services/api/trailerApi';

export default function useBaoDuongRecords(baoDuongApi) {
  const [baoDuongRecords, setBaoDuongRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlates, setIsLoadingPlates] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Fetch license plates from both dauKeo and roMooc APIs
  const fetchLicensePlates = useCallback(async () => {
    try {
      setIsLoadingPlates(true);
      // Fetch tractor license plates
      const tractorResponse = await tractorApi.getAll(1, 1000);
      const tractorData = Array.isArray(tractorResponse?.data) ? tractorResponse.data : [];
      const tractorPlates = tractorData
        .filter(item => item?.license_plate)
        .map(item => ({
          value: item.license_plate,
          type: 'Đầu kéo',
        }));

      // Fetch trailer license plates
      const trailerResponse = await trailerApi.getAll(1, 1000);
      const trailerData = Array.isArray(trailerResponse?.data) ? trailerResponse.data : [];
      const trailerPlates = trailerData
        .filter(item => item?.license_plate)
        .map(item => ({
          value: item.license_plate,
          type: 'Rơ moóc',
        }));

      // Combine and deduplicate plates
      const allPlates = [...dauKeoPlates, ...roMoocPlates];
      const uniquePlates = Array.from(
        new Map(allPlates.map(plate => [plate.value, plate])).values()
      ).sort((a, b) => (a.value || '').localeCompare(b.value || ''));

      setLicensePlates(uniquePlates);
    } catch (error) {
      logger.error('Error fetching license plates', { error });
      // Set some default plates for testing if API fails
      setLicensePlates([
        { value: '51C-001.01', type: 'Đầu kéo' },
        { value: '29H-111.22', type: 'Đầu kéo' },
        { value: '51R-001.11', type: 'Rơ moóc' },
        { value: '51R-002.22', type: 'Rơ moóc' },
      ]);
    } finally {
      setIsLoadingPlates(false);
    }
  }, []);

  // Initial fetch of license plates
  useEffect(() => {
    fetchLicensePlates();
  }, [fetchLicensePlates]);

  // Fetch paginated data
  const fetchData = useCallback(
    async (page = 0, pageSize = 10) => {
      setIsLoading(true);
      try {
        // Note: API is 1-indexed for page number
        const recordsRes = await baoDuongApi.getAll(page + 1, pageSize);

        setBaoDuongRecords(recordsRes.data || []);

        // Update pagination state from API response
        const newPagination = {
          page,
          pageSize,
          total: recordsRes.meta?.total || 0,
          totalPages: recordsRes.meta?.totalPages || 1,
        };

        setPagination(prev => ({
          ...prev,
          ...newPagination,
        }));

        setError('');
      } catch (err) {
        logger.error('Error in loadBaoDuong', { error: err });
        setError('Không thể tải dữ liệu bảo dưỡng');
      } finally {
        setIsLoading(false);
      }
    },
    [baoDuongApi]
  );
  const handlePageChange = useCallback(
    newPage => {
      fetchData(newPage, pagination.pageSize);
    },
    [fetchData, pagination.pageSize]
  );
  const handlePageSizeChange = useCallback(
    newPageSize => {
      fetchData(0, newPageSize); // Reset to first page when page size changes
    },
    [fetchData]
  );
  // Fetch by license plate
  const fetchByLicensePlate = useCallback(
    async (bienSo, page = 0, pageSize = 10) => {
      setIsLoading(true);
      try {
        const recordsRes = await baoDuongApi.getAll(page + 1, pageSize, { bien_so: bienSo });
        setBaoDuongRecords(recordsRes.data || []);
        setPagination(prev => ({
          ...prev,
          page,
          pageSize,
          total: recordsRes.meta?.total || 0,
          totalPages: recordsRes.meta?.totalPages || 1,
        }));
        setError('');
      } catch (err) {
        logger.error('Error in loadBaoDuong', { error: err });
        setError('Không thể tải dữ liệu bảo dưỡng');
      } finally {
        setIsLoading(false);
      }
    },
    [baoDuongApi]
  );
  return {
    baoDuongRecords,
    setBaoDuongRecords,
    licensePlates,
    setLicensePlates,
    isLoading: isLoading || isLoadingPlates,
    error,
    fetchData,
    fetchByLicensePlate,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onRowsPerPageChange: handlePageSizeChange,
    },
  };
}
