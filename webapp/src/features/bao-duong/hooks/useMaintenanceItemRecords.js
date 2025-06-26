import { useState, useCallback } from 'react';
import logger from '@services/logger';
import { maintenanceItemsApi } from '@services/api/maintenanceItemsApi';
import { tractorApi } from '@services/api/tractorApi';
import { trailerApi } from '@services/api/trailerApi';
import { extractErrorMessage } from '@utils/errorUtils';

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

  // Fetch license plates from vehicle APIs (tractors + trailers)
  const fetchLicensePlates = useCallback(async () => {
    try {
      // Fetch tractors and trailers in parallel
      const [tractorResponse, trailerResponse] = await Promise.all([
        tractorApi.getAllWithoutPagination(),
        trailerApi.getAllWithoutPagination()
      ]);

      const formattedPlates = [];

      // Add tractors
      if (tractorResponse?.status === 'success' && Array.isArray(tractorResponse.data)) {
        const tractorPlates = tractorResponse.data
          .filter(tractor => tractor.license_plate)
          .map(tractor => ({
            value: tractor.license_plate,
            license_plate: tractor.license_plate,
            type: 'Đầu kéo'
          }));
        formattedPlates.push(...tractorPlates);
      }

      // Add trailers
      if (trailerResponse?.status === 'success' && Array.isArray(trailerResponse.data)) {
        const trailerPlates = trailerResponse.data
          .filter(trailer => trailer.license_plate)
          .map(trailer => ({
            value: trailer.license_plate,
            license_plate: trailer.license_plate,
            type: 'Rơ-moóc'
          }));
        formattedPlates.push(...trailerPlates);
      }

      // Sort by license plate
      formattedPlates.sort((a, b) => a.value.localeCompare(b.value));

      setLicensePlates(formattedPlates);
      
      logger.info(`Fetched license plates from vehicle APIs: ${formattedPlates.length} plates (${tractorResponse?.data?.length || 0} tractors, ${trailerResponse?.data?.length || 0} trailers)`);
    } catch (error) {
      logger.error('Error fetching license plates from vehicle APIs', { error });
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

        // Fetch license plates from vehicle APIs
        await fetchLicensePlates();

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
        setLicensePlates([]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchLicensePlates]
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