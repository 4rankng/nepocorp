import { useState, useCallback } from 'react';
import logger from '@services/logger';
import { maintenanceApi } from '@services/api/maintenanceApi';
import { extractErrorMessage } from '@utils/errorUtils';

export default function useMaintenanceRecords() {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
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
        const response = await maintenanceApi.getAll(page + 1, pageSize);

        console.log('Fetched maintenance data:', {
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
        setMaintenanceRecords(data);

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
        logger.error('Error loading maintenance records', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tải dữ liệu bảo dưỡng');
        setError(errorMessage);
        setMaintenanceRecords([]);
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
        const response = await maintenanceApi.getByLicensePlate(
          licensePlate, 
          page + 1, 
          pageSize
        );
        
        const data = response.data || [];
        setMaintenanceRecords(data);
        
        setPagination(prev => ({
          ...prev,
          page,
          pageSize,
          total: response.pagination?.records_count || 0,
          totalPages: response.pagination?.total_pages || 1,
        }));
        
        setError('');
      } catch (err) {
        logger.error('Error loading maintenance records by license plate', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tải dữ liệu bảo dưỡng');
        setError(errorMessage);
        setMaintenanceRecords([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Create new maintenance record
  const createMaintenance = useCallback(
    async (maintenanceData) => {
      setIsLoading(true);
      try {
        const response = await maintenanceApi.create(maintenanceData);
        
        // Refresh the data after creation
        await fetchData(pagination.page, pagination.pageSize);
        
        return response;
      } catch (err) {
        logger.error('Error creating maintenance record', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tạo bản ghi bảo dưỡng');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Update maintenance record
  const updateMaintenance = useCallback(
    async (id, maintenanceData) => {
      setIsLoading(true);
      try {
        const response = await maintenanceApi.update(id, maintenanceData);
        
        // Refresh the data after update
        await fetchData(pagination.page, pagination.pageSize);
        
        return response;
      } catch (err) {
        logger.error('Error updating maintenance record', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể cập nhật bản ghi bảo dưỡng');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Delete maintenance record
  const deleteMaintenance = useCallback(
    async (id) => {
      setIsLoading(true);
      try {
        const response = await maintenanceApi.delete(id);
        
        // Refresh the data after deletion
        await fetchData(pagination.page, pagination.pageSize);
        
        return response;
      } catch (err) {
        logger.error('Error deleting maintenance record', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể xóa bản ghi bảo dưỡng');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchData, pagination.page, pagination.pageSize]
  );

  // Get maintenance record by ID
  const getMaintenanceById = useCallback(
    async (id) => {
      setIsLoading(true);
      try {
        const response = await maintenanceApi.getById(id);
        return response;
      } catch (err) {
        logger.error('Error fetching maintenance record by ID', { error: err });
        const errorMessage = extractErrorMessage(err, 'Không thể tải bản ghi bảo dưỡng');
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    maintenanceRecords,
    setMaintenanceRecords,
    isLoading,
    error,
    fetchData,
    fetchByLicensePlate,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    getMaintenanceById,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onRowsPerPageChange: handlePageSizeChange,
    },
  };
}