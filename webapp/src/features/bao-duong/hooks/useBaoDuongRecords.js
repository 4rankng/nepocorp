import { useState, useCallback } from 'react';
export default function useBaoDuongRecords(api) {
  const [baoDuongRecords, setBaoDuongRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  // Fetch license plates separately to avoid pagination issues
  const fetchLicensePlates = useCallback(async () => {
    try {
      const allRecordsRes = await api.getAll(1, 1000); // Get all records for license plates
      const licensePlateOptions = Array.from(
        new Set((allRecordsRes.data || []).map(r => r.bien_so).filter(Boolean))
      ).map(plate => ({ id: plate, bien_so: plate }));
      setLicensePlates(licensePlateOptions);
    } catch (err) {

    }
  }, [api]);

  // Fetch paginated data
  const fetchData = useCallback(
    async (page = 0, pageSize = 10) => {
      setIsLoading(true);
      try {
        // Note: API is 1-indexed for page number

        const recordsRes = await api.getAll(page + 1, pageSize);

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

        // Only fetch license plates once on initial load
        if (licensePlates.length === 0) {
          await fetchLicensePlates();
        }

        setError('');
      } catch (err) {
        setError('Không thể tải dữ liệu bảo dưỡng');

      } finally {
        setIsLoading(false);
      }
    },
    [api, fetchLicensePlates, licensePlates.length]
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
        const recordsRes = await api.getAll(page + 1, pageSize, bienSo);
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
        setError('Không thể tải dữ liệu bảo dưỡng');

      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );
  return {
    baoDuongRecords,
    setBaoDuongRecords,
    licensePlates,
    setLicensePlates,
    isLoading,
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
