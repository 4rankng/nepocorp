import { useState, useCallback, useEffect, useContext, useRef } from 'react';
import logger from '@services/logger';
import { VehicleDataContext } from '@contexts/VehicleDataContext';

// Utility function to transform expense data back to display format
const _transformExpenseToDisplay = (expense, tractors, trailers) => {
  // Find the vehicle by ID to get license plate
  let license_plate = '';
  
  // Add debugging info
  console.log('Transform expense:', {
    expense_id: expense.id,
    tractor_id: expense.tractor_id,
    trailer_id: expense.trailer_id,
    tractors_count: tractors?.length || 0,
    trailers_count: trailers?.length || 0,
    first_tractor: tractors?.[0],
    first_trailer: trailers?.[0]
  });
  
  if (expense.tractor_id) {
    // Handle both string and number IDs
    const tractorId = parseInt(expense.tractor_id);
    const tractor = tractors.find(t => parseInt(t.id) === tractorId);
    
    console.log('Tractor lookup:', {
      looking_for: tractorId,
      found: tractor,
      all_tractor_ids: tractors.map(t => ({ id: t.id, license: t.license_plate }))
    });
    
    if (tractor?.license_plate) {
      license_plate = tractor.license_plate;
    } else {
      // More informative fallback
      license_plate = `Tractor ID: ${expense.tractor_id} (not found in cache)`;
    }
  } else if (expense.trailer_id) {
    // Handle both string and number IDs
    const trailerId = parseInt(expense.trailer_id);
    const trailer = trailers.find(t => parseInt(t.id) === trailerId);
    
    console.log('Trailer lookup:', {
      looking_for: trailerId,
      found: trailer,
      all_trailer_ids: trailers.map(t => ({ id: t.id, license: t.license_plate }))
    });
    
    if (trailer?.license_plate) {
      license_plate = trailer.license_plate;
    } else {
      // More informative fallback
      license_plate = `Trailer ID: ${expense.trailer_id} (not found in cache)`;
    }
  } else {
    license_plate = 'Không có thông tin xe';
  }

  // Transform to display format - keeping compatibility with existing table columns
  return {
    id: expense.id,
    license_plate: license_plate,
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
  const { tractors, trailers, fetchAllVehicleData, loading } = useContext(VehicleDataContext);
  const [baoDuongRecords, setBaoDuongRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlates, setIsLoadingPlates] = useState(true);
  const initialLoadRef = useRef(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Build license plates from VehicleDataContext data
  const buildLicensePlates = useCallback(() => {
    try {
      // Use cached data from VehicleDataContext
      const tractorPlates = tractors
        .filter(item => item?.license_plate)
        .map(item => ({
          value: item.license_plate,
          type: 'Đầu kéo',
        }));

      const trailerPlates = trailers
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
      
      logger.info(`Built license plates from context: ${uniquePlates.length} plates`, { 
        tractorCount: tractors.length,
        trailerCount: trailers.length
      });
    } catch (error) {
      logger.error('Error building license plates from context', { error });
      // Set some default plates for testing if context fails
      setLicensePlates([
        { value: '51C-001.01', type: 'Đầu kéo' },
        { value: '29H-111.22', type: 'Đầu kéo' },
        { value: '51R-001.11', type: 'Rơ moóc' },
        { value: '51R-002.22', type: 'Rơ moóc' },
      ]);
    }
  }, [tractors, trailers]);

  // Handle loading state based on VehicleDataContext
  useEffect(() => {
    setIsLoadingPlates(loading.initial || loading.tractors || loading.trailers);
  }, [loading]);

  // Initial load effect - only runs once
  useEffect(() => {
    const initialLoad = async () => {
      if (!initialLoadRef.current && fetchAllVehicleData) {
        initialLoadRef.current = true;
        await fetchAllVehicleData();
      }
    };
    
    initialLoad();
  }, [fetchAllVehicleData]);

  // Build license plates when data changes
  useEffect(() => {
    buildLicensePlates();
  }, [buildLicensePlates]);

  // Fetch paginated data
  const fetchData = useCallback(
    async (page = 0, pageSize = 10) => {
      setIsLoading(true);
      try {
        // Ensure vehicle data is loaded before transforming expense data
        if (tractors.length === 0 && trailers.length === 0) {
          console.log('Vehicle data not loaded, fetching...');
          await fetchAllVehicleData();
        }
        
        // Note: API is 1-indexed for page number
        const recordsRes = await baoDuongApi.getAll(page + 1, pageSize);

        console.log('Fetched expense data:', {
          count: recordsRes.data?.length || 0,
          first_record: recordsRes.data?.[0],
          tractors_available: tractors.length,
          trailers_available: trailers.length
        });

        // Use backend data directly without transformation
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
    [baoDuongApi, tractors, trailers, fetchAllVehicleData]
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
        // Ensure vehicle data is loaded before transforming expense data
        if (tractors.length === 0 && trailers.length === 0) {
          console.log('Vehicle data not loaded, fetching...');
          await fetchAllVehicleData();
        }
        
        const recordsRes = await baoDuongApi.getAll(page + 1, pageSize, { license_plate: bienSo });
        // Use backend data directly without transformation
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
    [baoDuongApi, tractors, trailers, fetchAllVehicleData]
  );
  return {
    baoDuongRecords,
    setBaoDuongRecords,
    licensePlates,
    setLicensePlates,
    tractors,
    trailers,
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
