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
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { baoDuongApi } from '@services/mockApi';
import { Search as SearchIcon } from '@mui/icons-material';
import BaoDuongCard from './components/BaoDuongCard';
import BaoDuongDialog from './components/BaoDuongDialog';
import { getBaoDuongTableColumns } from './constants/baoDuongTableColumns.jsx';
import useBaoDuongForm from './hooks/useBaoDuongForm';
import useBaoDuongRecords from './hooks/useBaoDuongRecords';
const initialFormData = {
  bien_so: '',
  item_name: '',
  ngay_thay: new Date(),
  so_thang_bao_hanh: 6,
  ngay_het_han: null,
  so_luong: 1,
  don_gia: 0,
  currency: 'VND',
  tong_tien: 0,
  ghi_chu: '',
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
  const [counts, setCounts] = useState({ tire: 0 });
  const [selectedPlate, setSelectedPlate] = useState('');
  // Data fetching
  const {
    baoDuongRecords: maintenanceRecords,
    setBaoDuongRecords: setMaintenanceRecords,
    licensePlates,
    setLicensePlates,
    isLoading,
    error,
    fetchData,
    fetchByLicensePlate,
    pagination,
  } = useBaoDuongRecords(baoDuongApi);
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
  } = useBaoDuongForm({
    initialFormData,
    isEdit,
    api: baoDuongApi,
    fetchData,
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
  // Fetch count and data on mount
  useEffect(() => {
    baoDuongApi.getCount().then(count => setCounts(c => ({ ...c, tire: count })));
    // Also fetch initial data with pagination
    fetchData(0, 10);
  }, []); // Empty dependency array for mount only
  // Helper to refetch count
  const refetchCount = useCallback(() => {
    baoDuongApi.getCount().then(count => setCounts(c => ({ ...c, tire: count })));
  }, []);
  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData({
      bien_so: '',
      item_name: '',
      ngay_thay: '',
      ngay_het_han: '',
      so_thang_bao_hanh: 0,
      so_luong: 1,
      don_gia: 0,
      tong_tien: 0,
      ghi_chu: '',
      id: undefined,
    });
    setErrors({});
    setOpenDialog(true);
  };
  const handleOpenEditDialog = record => {
    setIsEdit(true);
    setFormData({
      bien_so: record.bien_so,
      item_name: record.item_name,
      ngay_thay: record.ngay_thay,
      ngay_het_han: record.ngay_het_han,
      so_thang_bao_hanh: record.so_thang_bao_hanh,
      so_luong: record.so_luong,
      don_gia: record.don_gia,
      tong_tien: record.tong_tien,
      ghi_chu: record.ghi_chu || '',
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
        'Biển số xe': record.bien_so,
        'Hạng mục': record.item_name,
        'Ngày thay': record.ngay_thay
          ? new Date(record.ngay_thay).toLocaleDateString('vi-VN')
          : 'N/A',
        'Ngày hết hạn': record.ngay_het_han
          ? new Date(record.ngay_het_han).toLocaleDateString('vi-VN')
          : 'N/A',
        'Số lượng': record.so_luong,
        'Đơn giá': formatCurrency(record.don_gia),
        'Tổng tiền': formatCurrency(record.tong_tien),
        'Ghi chú': record.ghi_chu || 'Không có',
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
      refetchCount();
      handleDeleteClose();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Đã xảy ra lỗi khi xóa thông tin bảo dưỡng',
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
        refetchCount();
        setOpenDialog(false);
      } catch (error) {

        // Extract detailed error information
        const errorDetails = error.response?.error?.details || {};
        const errorMessage = error.message || 'Đã xảy ra lỗi khi lưu thông tin bảo dưỡng';
        // If there are validation errors, set them in the form
        if (error.validationError && errorDetails) {
          setErrors(errorDetails);
        }
        // Show error message to user if not a validation error
        // (validation errors are shown in the form fields)
        if (!error.validationError) {
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
    [formData, isEdit, fetchData, refetchCount, handleFormSave]
  );
  // Filter maintenance records based on search term
  const filteredRecords = React.useMemo(() => {
    if (!searchTerm.trim()) return maintenanceRecords;
    const search = searchTerm.toLowerCase();
    return maintenanceRecords.filter(
      record =>
        (record.bien_so && record.bien_so.toLowerCase().includes(search)) ||
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
      rows: maintenanceRecords, // data -> rows
      loading: isLoading,
      error: error?.message || (error ? 'Có lỗi xảy ra khi tải dữ liệu' : null),
      emptyMessage: 'Không có dữ liệu bảo dưỡng',
      pagination: true,
      page: pagination.page,
      rowsPerPage: pagination.pageSize,
      totalCount: pagination.total,
      rowKeyField: 'id',
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
        <TextField
          sx={{ width: '50%' }}
          variant="outlined"
          placeholder="Tìm kiếm theo biển số hoặc ghi chú..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: {
              borderRadius: '6px',
              height: 36,
              minHeight: 36,
              fontSize: '0.95rem',
            },
          }}
        />
        <FormControl sx={{ minWidth: 180 }} size="small" variant="outlined">
          <InputLabel id="plate-select-label">Biển số xe</InputLabel>
          <Select
            labelId="plate-select-label"
            id="plate-select"
            value={selectedPlate || 'Tất cả'}
            onChange={handlePlateChange}
            label="Biển số xe"
            renderValue={selected => {
              if (!selected || selected === 'Tất cả') return 'Tất cả';
              return selected;
            }}
          >
            <MenuItem value="Tất cả">
              <em>Tất cả</em>
            </MenuItem>
            {licensePlates.map(plate => (
              <MenuItem key={plate.id} value={plate.bien_so}>
                {plate.bien_so}
              </MenuItem>
            ))}
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
      />
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
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
      <Zoom in={!isFormLoading}>
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
