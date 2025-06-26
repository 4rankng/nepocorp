import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper,
  Card,
  CardContent,
  Chip,
  Collapse,
  useMediaQuery,
  useTheme,
  Divider,
  Fab,
  Zoom,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add'; // This AddIcon will be used for the FAB
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton } from '@/components/ActionButtons';
// Utility function to format currency
const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};
import DeleteDialog from '@/components/DeleteDialog';
import { baoDuongApi } from '@services/api/expenseApi';
import { Search as SearchIcon } from '@mui/icons-material';
import BaoDuongCard from './components/BaoDuongCard';
import BaoDuongDialog from './components/BaoDuongDialog';
import { getBaoDuongTableColumns } from './constants/baoDuongTableColumns.jsx';
import { useExpenseForm } from '@components/shared';
import useMaintenanceItemRecords from './hooks/useMaintenanceItemRecords';
import { useVehicleData } from '@contexts/VehicleDataContext';
import { extractErrorMessage, isValidationError, extractValidationErrors } from '@utils/errorUtils';
const initialFormData = {
  license_plate: '',
  vendor_name: '',
  payment_status: 'DRAFT',
  payment_proof: '',
  items: [{
    item_name: '',
    price: '',
    quantity: '',
    install_date: '',
    expiry_date: ''
  }],
  remark: '',
  tax_rate: 10,
  currency: 'VND',
};
const QuanLyBaoDuong = memo(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isEdit, setIsEdit] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, recordId: null, details: null });
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
    baoDuongRecords: maintenanceRecords,
    setBaoDuongRecords: setMaintenanceRecords,
    isLoading,
    error,
    fetchData,
    fetchByLicensePlate,
    pagination,
  } = useMaintenanceItemRecords();
  // Extract pagination props for StandardTable
  const {
    page,
    pageSize: rowsPerPage,
    total: totalCount,
    totalPages,
    onPageChange: handlePageChange,
    onRowsPerPageChange: handleRowsPerPageChange,
  } = pagination;
  // Form state/handlers
  const {
    formData,
    setFormData,
    errors: formErrors,
    setErrors,
    handleSave: handleFormSave,
    isLoading: isFormSubmitting,
    isLoading: isFormLoading,
    setIsLoading: setFormLoading,
    handleInputChange,
    validateForm,
    handleSave: handleSaveForm,
  } = useExpenseForm({
    initialFormData,
    isEdit,
    api: baoDuongApi,
    fetchData,
    expenseCategoryId: 1, // Fixed category for BaoDuong (maintenance)
    onSuccess: msg => {
      setSnackbar({ open: true, message: msg, severity: 'success' });
      handleCloseDialog();
    },
    onError: err => {
      setSnackbar({
        open: true,
        message: 'Đã xảy ra lỗi khi lưu thông tin bảo dưỡng',
        severity: 'error',
      });
    },
  });
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

  // Removed refetchCount as we're working with maintenance items directly
  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData(initialFormData);
    setErrors({});
    setOpenDialog(true);
  };
  const handleOpenEditDialog = record => {
    setIsEdit(true);
    setFormData({
      license_plate: record.license_plate,
      vendor_name: record.vendor_name || '',
      payment_status: record.payment_status || 'DRAFT',
      payment_proof: record.payment_proof || '',
      items: [{
        item_name: record.item_name || '',
        price: record.price || '',
        quantity: record.quantity || '',
        install_date: record.install_date || '',
        expiry_date: record.expiry_date || ''
      }],
      remark: record.remark || '',
      tax_rate: 10,
      currency: 'VND',
      id: record.id,
    });
    setErrors({});
    setOpenDialog(true);
  };
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setErrors({});
  }, []);
  const handleDeleteClick = record => {
    setDeleteDialog({
      open: true,
      recordId: record.id,
      details: {
        'Biển số xe': record.license_plate,
        'Hạng mục': record.item_name,
        'Ngày lắp đặt': record.install_date
          ? new Date(record.install_date).toLocaleDateString('vi-VN')
          : 'N/A',
        'Ngày hết hạn': record.expiry_date
          ? new Date(record.expiry_date).toLocaleDateString('vi-VN')
          : 'N/A',
        'Số lượng': record.quantity,
        'Đơn giá': formatCurrency(record.price),
        'Tổng tiền': formatCurrency(record.total),
        'Ghi chú': record.remark || 'Không có',
      },
    });
  };
  const handleDeleteClose = () => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  };
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.recordId) return;
    setFormLoading(true);
    try {
      await baoDuongApi.delete(deleteDialog.recordId);
      setSnackbar({
        open: true,
        message: 'Xóa thông tin bảo dưỡng thành công',
        severity: 'success',
      });
      fetchData();
      handleDeleteClose();
    } catch (err) {
      const errorMessage = extractErrorMessage(err, 'Đã xảy ra lỗi khi xóa thông tin bảo dưỡng');
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setFormLoading(false);
    }
  };
  // Handle save from dialog with proper error handling and pagination
  const handleSave = useCallback(
    async e => {
      try {
        setFormLoading(true);
        // Pass current pagination state to handleFormSave
        await handleFormSave(e, pagination.page, pagination.pageSize);
        // If we get here, the save was successful
        setSnackbar({
          open: true,
          message: isEdit
            ? 'Cập nhật thông tin bảo dưỡng thành công'
            : 'Thêm thông tin bảo dưỡng thành công',
          severity: 'success',
        });
        // Refresh data with current pagination and close dialog
        await fetchData(pagination.page, pagination.pageSize);
        setOpenDialog(false);
      } catch (error) {
        // Extract detailed error information using utility
        const errorMessage = extractErrorMessage(error, 'Đã xảy ra lỗi khi lưu thông tin bảo dưỡng');
        const validationError = isValidationError(error);
        const errorDetails = extractValidationErrors(error);
        
        // If there are validation errors, set them in the form
        if (validationError && Object.keys(errorDetails).length > 0) {
          setErrors(errorDetails);
        }
        
        // Show error message to user if not a validation error
        // (validation errors are shown in the form fields)
        if (!validationError) {
          setSnackbar({
            open: true,
            message: errorMessage,
            severity: 'error',
          });
        }
      } finally {
        setFormLoading(false);
      }
    },
    [formData, isEdit, fetchData, handleFormSave, pagination.page, pagination.pageSize]
  );
  // Filter maintenance records based on search term
  const filteredRecords = React.useMemo(() => {
    if (!searchTerm.trim()) return maintenanceRecords;
    const search = searchTerm.toLowerCase();
    return maintenanceRecords.filter(
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
  // Render mobile card view
  const renderMobileView = () => (
    <Box>
      {filteredRecords.map(record => (
        <BaoDuongCard
          key={record.id}
          record={record}
          onEdit={handleOpenEditDialog}
          onDelete={handleDeleteClick}
          isLoading={isLoading}
        />
      ))}
      {!isLoading && filteredRecords.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          {searchTerm ? 'Không tìm thấy bảo dưỡng phù hợp' : 'Không có dữ liệu bảo dưỡng'}
        </Typography>
      )}
    </Box>
  );
  // Render desktop table view
  const renderDesktopView = () => {
    const tableColumns = getBaoDuongTableColumns();

    const tableProps = {
      columns: tableColumns,
      data: maintenanceRecords,
      loading: isLoading,
      error: error?.message || (error ? 'Có lỗi xảy ra khi tải dữ liệu' : null),
      emptyMessage: 'Không có dữ liệu bảo dưỡng',
      showEmptyRows: true,
      pagination: true,
      page: pagination.page,
      rowsPerPage: pagination.pageSize,
      totalCount: pagination.total,
      rowKeyField: 'id',
      customRowsPerPageOptions: [100, 200, 500],
    };

    return (
      <StandardTable
        {...tableProps}
        renderActions={row => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <EditButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                handleOpenEditDialog(row);
              }}
            />
            <DeleteButton
              size="small"
              color="error"
              onClick={e => {
                e.stopPropagation();
                handleDeleteClick(row);
              }}
            />
          </Box>
        )}
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
          p: isMobile ? 1 : 2,
          pb: { xs: 10, sm: 11 },
        }}
      >
        {isMobile ? renderMobileView() : renderDesktopView()}
      </Box>
      {/* Add/Edit Dialog */}
      <BaoDuongDialog
        open={openDialog}
        isEdit={isEdit}
        isLoading={isFormLoading}
        formData={formData}
        errors={formErrors}
        onClose={handleCloseDialog}
        onChange={handleInputChange}
        onSave={handleSave}
        licensePlates={licensePlates}
        isLoadingPlates={vehicleLoading.initial || vehicleLoading.tractors || vehicleLoading.trailers}
      />
      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={deleteDialog.open}
        onCancel={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa thông tin bảo dưỡng"
        message="Bạn có chắc chắn muốn xóa thông tin bảo dưỡng này?"
        details={deleteDialog.details}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
        loading={isFormLoading}
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
      {/* Floating Action Button */}
      <Zoom in={!isFormLoading && !openDialog}>
        <Fab
          color="primary"
          aria-label="Thêm mới"
          onClick={handleOpenAddDialog}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6,
            },
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>
    </Box>
  );
});
export default QuanLyBaoDuong;
