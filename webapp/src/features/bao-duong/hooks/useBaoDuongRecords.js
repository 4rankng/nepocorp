import { useState, useCallback, useEffect, useContext } from 'react';
import logger from '@services/logger';
import { tractorApi } from '@services/api/tractorApi';
import { trailerApi } from '@services/api/trailerApi';
import { VehicleDataContext } from '@contexts/VehicleDataContext';

// Utility function to transform expense data back to display format
const transformExpenseToDisplay = (expense, tractors, trailers) => {
  // Find the vehicle by ID to get license plate
  let bien_so = '';
  if (expense.tractor_id) {
    const tractor = tractors.find(t => t.id === expense.tractor_id);
    bien_so = tractor?.license_plate || `Tractor ID: ${expense.tractor_id}`;
  } else if (expense.trailer_id) {
    const trailer = trailers.find(t => t.id === expense.trailer_id);
    bien_so = trailer?.license_plate || `Trailer ID: ${expense.trailer_id}`;
  }

  // Transform to display format - keeping compatibility with existing table columns
  return {
    id: expense.id,
    bien_so: bien_so,
    // For multi-item expenses, show first item or summary
    item_name: expense.items?.[0]?.item_name || 'Nhiều hạng mục',
    so_luong: expense.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
    don_gia: expense.items?.[0]?.price || 0,
    tong_tien: expense.total || 0,
    subtotal: expense.subtotal || 0,
    tax_rate: expense.tax_rate || 0,
    payment_status: expense.payment_status || 'DRAFT',
    payment_proof: expense.payment_proof || '',
    remark: expense.remark || '',
    ghi_chu: expense.remark || '', // For backward compatibility
    ngay_thay: expense.items?.[0]?.install_date || '',
    ngay_het_han: expense.items?.[0]?.expiry_date || '',
    currency: expense.currency || 'VND',
    items: expense.items || [],
    // Add original expense data for editing
    _original: expense
  };
};

export default function useBaoDuongRecords(baoDuongApi) {
  const { tractors, trailers } = useContext(VehicleDataContext);
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
      const allPlates = [...tractorPlates, ...trailerPlates];
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

        // Transform expense data to display format
        const transformedData = (recordsRes.data || []).map(expense => 
          transformExpenseToDisplay(expense, tractors, trailers)
        );
        setBaoDuongRecords(transformedData);

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
    [baoDuongApi, tractors, trailers]
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
        // Transform expense data to display format
        const transformedData = (recordsRes.data || []).map(expense => 
          transformExpenseToDisplay(expense, tractors, trailers)
        );
        setBaoDuongRecords(transformedData);
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
    [baoDuongApi, tractors, trailers]
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
