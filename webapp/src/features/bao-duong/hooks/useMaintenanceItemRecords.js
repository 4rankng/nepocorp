import { useState, useCallback, useRef } from 'react';
import logger from '@services/logger';
import { maintenanceItemsApi } from '@services/api/maintenanceItemsApi';

export default function useMaintenanceItemRecords() {
  const [maintenanceItemRecords, setMaintenanceItemRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Removed initialLoadRef as we don't need it for this simplified implementation
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Build license plates from maintenance items data
  const buildLicensePlates = useCallback((data) => {
    try {
      // Extract unique license plates from maintenance items
      const uniquePlates = [...new Set(
        data
          .filter(item => item.license_plate)
          .map(item => item.license_plate)
      )].sort();

      const formattedPlates = uniquePlates.map(plate => ({
        value: plate,
        bien_so: plate, // For backward compatibility
        type: 'Vehicle' // We don't distinguish tractor/trailer in this view
      }));

      setLicensePlates(formattedPlates);
      
      logger.info(`Built license plates from maintenance items: ${formattedPlates.length} plates`);
    } catch (error) {
      logger.error('Error building license plates from maintenance items', { error });
      setLicensePlates([]);
    }
  }, []);

  // Fetch paginated maintenance items data
  const fetchData = useCallback(
    async (page = 0, pageSize = 10) => {
      setIsLoading(true);
      try {
        // Note: API is 1-indexed for page number
        const response = await maintenanceItemsApi.getAll(page + 1, pageSize);

        console.log('Fetched maintenance items data:', {
          count: response.data?.length || 0,
          first_record: response.data?.[0],
          pagination: response.pagination
        });

        // Use backend data directly without transformation
        const data = response.data || [];
        setMaintenanceItemRecords(data);

        // Build license plates from the data
        buildLicensePlates(data);

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
        setError('Không thể tải dữ liệu bảo dưỡng');
        setMaintenanceItemRecords([]);
        setLicensePlates([]);
      } finally {
        setIsLoading(false);
      }
    },
    [buildLicensePlates]
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
    async (licensePlate, page = 0, pageSize = 10) => {
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
        setError('Không thể tải dữ liệu bảo dưỡng');
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