import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import {
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import StandardTable from '@/components/StandardTable';
// Utility function to format currency
const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};
import ExpenseViewModal from '@/components/ExpenseViewModal';
import { maintenanceApi } from '@services/api/maintenanceApi';
import { Search as SearchIcon } from '@mui/icons-material';
import BaoDuongCard from './components/BaoDuongCard';
import { getBaoDuongTableColumns } from './constants/baoDuongTableColumns.jsx';
import useMaintenanceRecords from './hooks/useMaintenanceRecords';
import { useVehicleData } from '@contexts/VehicleDataContext';
import { extractErrorMessage, isValidationError, extractValidationErrors } from '@utils/errorUtils';
const QuanLyBaoDuong = memo(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [invoiceModal, setInvoiceModal] = useState({ open: false, expenseId: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Removed counts state as we're now using maintenance items directly
  const [selectedPlate, setSelectedPlate] = useState('');
  // Vehicle data from context
  const {
    tractors,
    trailers,
    loading: vehicleLoading,
    errors: vehicleErrors,
  } = useVehicleData();

  // Combine license plates from tractors and trailers
  const licensePlates = React.useMemo(() => {
    const plates = [];
    
    // Add tractor license plates
    tractors.forEach(tractor => {
      if (tractor.license_plate) {
        plates.push({
          value: tractor.license_plate,
          license_plate: tractor.license_plate,
          type: 'Đầu kéo',
          displayText: `${tractor.license_plate} (Đầu kéo)`
        });
      }
    });
    
    // Add trailer license plates
    trailers.forEach(trailer => {
      if (trailer.license_plate) {
        plates.push({
          value: trailer.license_plate,
          license_plate: trailer.license_plate,
          type: 'Rơ-moóc',
          displayText: `${trailer.license_plate} (Rơ-moóc)`
        });
      }
    });
    
    // Remove duplicates based on license_plate
    const uniquePlates = plates.filter((plate, index, self) => 
      index === self.findIndex(p => p.license_plate === plate.license_plate)
    );
    
    return uniquePlates;
  }, [tractors, trailers]);

  // Data fetching
  const {
    maintenanceRecords,
    setMaintenanceRecords,
    isLoading,
    error,
    fetchData,
    fetchByLicensePlate,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    pagination,
  } = useMaintenanceRecords();
  // Extract pagination props for StandardTable
  const {
    page,
    pageSize: rowsPerPage,
    total: totalCount,
    totalPages,
    onPageChange: handlePageChange,
    onRowsPerPageChange: handleRowsPerPageChange,
  } = pagination;
  // Fetch initial data on mount
  useEffect(() => {
    fetchData(0, 100);
  }, []); // Removed fetchData dependency to prevent re-renders

  // Show error notification if vehicle data fails to load
  useEffect(() => {
    const hasVehicleError = vehicleErrors.tractors || vehicleErrors.trailers;
    if (hasVehicleError) {
      const errorMessage = vehicleErrors.tractors || vehicleErrors.trailers;
      setSnackbar({
        open: true,
        message: `Lỗi tải danh sách biển số xe: ${errorMessage}`,
        severity: 'warning',
      });
    }
  }, [vehicleErrors.tractors, vehicleErrors.trailers]);

  const handleInvoiceClick = (maintenanceRecord) => {
    console.log('Invoice button clicked for maintenance record:', maintenanceRecord);
    // Use expense_id from maintenance record to show the related invoice
    const expenseId = maintenanceRecord?.expense_id || maintenanceRecord;
    console.log('Extracted expense_id:', expenseId);
    
    if (expenseId) {
      console.log('Opening invoice modal with expense_id:', expenseId);
      setInvoiceModal({ open: true, expenseId });
    } else {
      console.warn('No expense_id found in maintenance record:', maintenanceRecord);
      setSnackbar({
        open: true,
        message: 'Không có hóa đơn liên kết với bản ghi bảo dưỡng này',
        severity: 'warning',
      });
    }
  };
  const handleInvoiceClose = () => {
    setInvoiceModal({ open: false, expenseId: null });
  };
  // Filter maintenance records based on search term
  const filteredRecords = React.useMemo(() => {
    const records = maintenanceRecords || [];
    if (!searchTerm.trim()) return records;
    const search = searchTerm.toLowerCase();
    return records.filter(
      record =>
        (record.license_plate && record.license_plate.toLowerCase().includes(search)) ||
        (record.ghi_chu && record.ghi_chu.toLowerCase().includes(search))
    );
  }, [maintenanceRecords, searchTerm]);
  // Handler for license plate dropdown
  const handlePlateChange = event => {
    const plate = event.target.value;
    if (plate === 'Tất cả') {
      setSelectedPlate('');
      fetchData(0, pagination.pageSize);
    } else {
      setSelectedPlate(plate);
      fetchByLicensePlate(plate, 0, pagination.pageSize);
    }
  };
  // Render desktop table view
  const renderDesktopView = () => {
    const tableColumns = getBaoDuongTableColumns(handleInvoiceClick);

    const tableProps = {
      columns: tableColumns,
      data: maintenanceRecords || [],
      loading: isLoading,
      error: error?.message || (error ? 'Có lỗi xảy ra khi tải dữ liệu' : null),
      emptyMessage: 'Không có dữ liệu bảo dưỡng',
      showEmptyRows: true,
      pagination: true,
      page: pagination.page,
      totalCount: pagination.total,
      rowKeyField: 'id',
      customRowsPerPageOptions: [100, 200, 500],
    };

    return (
      <StandardTable
        {...tableProps}
        onPageChange={(_, newPage) => {
          fetchData(newPage, pagination.pageSize);
        }}
        onRowsPerPageChange={event => {
          const newPageSize = parseInt(event.target.value, 10);

          fetchData(0, newPageSize);
        }}
      />
    );
  };
  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Main Bao Duong Content */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl sx={{ minWidth: 180 }} size="small" variant="outlined">
          <InputLabel id="plate-select-label">Biển số xe</InputLabel>
          <Select
            labelId="plate-select-label"
            id="plate-select"
            value={selectedPlate || 'Tất cả'}
            onChange={handlePlateChange}
            label="Biển số xe"
            disabled={vehicleLoading.initial || vehicleLoading.tractors || vehicleLoading.trailers}
            renderValue={selected => {
              if (!selected || selected === 'Tất cả') return 'Tất cả';
              return selected;
            }}
          >
            <MenuItem value="Tất cả">
              <em>Tất cả</em>
            </MenuItem>
            {vehicleLoading.initial || vehicleLoading.tractors || vehicleLoading.trailers ? (
              <MenuItem disabled>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Đang tải...
              </MenuItem>
            ) : vehicleErrors.tractors || vehicleErrors.trailers ? (
              <MenuItem disabled>
                <Typography color="error" variant="caption">
                  Lỗi tải danh sách biển số xe
                </Typography>
              </MenuItem>
            ) : (
              licensePlates.map(plate => (
                <MenuItem key={plate.value || plate.license_plate} value={plate.value || plate.license_plate}>
                  {plate.displayText || plate.value || plate.license_plate}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          pb: { xs: 10, sm: 11 },
        }}
      >
        {renderDesktopView()}
      </Box>
      {/* Expense View Modal */}
      <ExpenseViewModal
        open={invoiceModal.open}
        onClose={handleInvoiceClose}
        expenseId={invoiceModal.expenseId}
      />
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});
export default QuanLyBaoDuong;
