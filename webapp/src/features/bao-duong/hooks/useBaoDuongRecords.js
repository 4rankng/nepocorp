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

  const fetchData = useCallback(
    async (page = 0, pageSize = 10) => {
      setIsLoading(true);
      try {
        // Note: API is 1-indexed for page number
        const recordsRes = await api.getAll(page + 1, pageSize);

        setBaoDuongRecords(recordsRes.data || []);

        // Update pagination state from API response
        setPagination(prev => ({
          ...prev,
          page,
          pageSize,
          total: recordsRes.meta?.total || 0,
          totalPages: recordsRes.meta?.totalPages || 1,
        }));

        // Extract unique license plates from all records (not just current page)
        const allRecordsRes = await api.getAll(1, 1000); // Get all records for license plates
        const licensePlateOptions = Array.from(
          new Set((allRecordsRes.data || []).map(r => r.bien_so))
        ).map(plate => ({ id: plate, bien_so: plate }));

        setLicensePlates(licensePlateOptions);
        setError('');
      } catch (err) {
        setError('Không thể tải dữ liệu bảo dưỡng');
        console.error('Error fetching bao duong data:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [api]
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

  return {
    baoDuongRecords,
    setBaoDuongRecords,
    licensePlates,
    setLicensePlates,
    isLoading,
    error,
    fetchData,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onRowsPerPageChange: handlePageSizeChange,
    },
  };
}
