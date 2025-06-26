import { useState, useCallback } from 'react';
import logger from '@services/logger';
import { maintenanceItemsApi } from '@services/api/maintenanceItemsApi';
import { extractErrorMessage } from '@utils/errorUtils';

export default function useMaintenanceItemRecords() {
  const [maintenanceItemRecords, setMaintenanceItemRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 100,
    total: 0,
    totalPages: 1,
  });


  // Fetch paginated maintenance items data
  const fetchData = useCallback(
    async (page = 0, pageSize = 100) => {
      setIsLoading(true);
      try {
        // Note: API is 1-indexed for page number
        const response = await maintenanceItemsApi.getAll(page + 1, pageSize);

        console.log('Fetched maintenance items data:', {
          count: response.data?.length || 0,
          first_record: response.data?.[0],
          pagination: response.pagination
        });

        // Detailed debugging for date fields
        if (response.data?.[0]) {
          console.log('First record date fields:', {
            install_date: response.data[0].install_date,
            expiry_date: response.data[0].expiry_date,
            install_date_type: typeof response.data[0].install_date,
            expiry_date_type: typeof response.data[0].expiry_date,
            install_date_parsed: response.data[0].install_date ? new Date(response.data[0].install_date) : 'N/A',
            expiry_date_parsed: response.data[0].expiry_date ? new Date(response.data[0].expiry_date) : 'N/A'
          });
        }

        // Use backend data directly without transformation
        const data = response.data || [];
        setMaintenanceItemRecords(data);

        // Update pagination state from API response
        const newPagination = {
          page,
          pageSize,
          total: response.pagination?.records_count || 0,
          totalPages: response.pagination?.total_pages || 1,
        };

        setPagination(prev => ({
          ...prev,
          ...newPagination,
        }));

        setError('');
      } catch (err) {
        logger.error('Error loading maintenance items', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tải dữ liệu bảo dưỡng');
        setError(errorMessage);
        setMaintenanceItemRecords([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
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
    async (licensePlate, page = 0, pageSize = 100) => {
      setIsLoading(true);
      try {
        const response = await maintenanceItemsApi.getByLicensePlate(
          licensePlate, 
          page + 1, 
          pageSize
        );
        
        const data = response.data || [];
        setMaintenanceItemRecords(data);
        
        setPagination(prev => ({
          ...prev,
          page,
          pageSize,
          total: response.pagination?.records_count || 0,
          totalPages: response.pagination?.total_pages || 1,
        }));
        
        setError('');
      } catch (err) {
        logger.error('Error loading maintenance items by license plate', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tải dữ liệu bảo dưỡng');
        setError(errorMessage);
        setMaintenanceItemRecords([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    baoDuongRecords: maintenanceItemRecords, // Keep same name for backward compatibility
    setBaoDuongRecords: setMaintenanceItemRecords,
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