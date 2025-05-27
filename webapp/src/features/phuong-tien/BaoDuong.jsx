import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { lopXeApi } from '@services/mockApi';
import { Search as SearchIcon } from '@mui/icons-material';
import MaintenanceCard from './components/MaintenanceCard';
import MaintenanceDialog from './components/MaintenanceDialog';
import BaoDuongSection from './components/BaoDuongSection';
import { maintenanceTableColumns } from './constants/maintenanceTableColumns';
import useMaintenanceForm from './hooks/useMaintenanceForm';
import useMaintenanceRecords from './hooks/useMaintenanceRecords';

const initialFormData = {
  licensePlate: '',
  replacementDate: new Date(),
  warrantyPeriod: 6,
  ngayHetHan: null,
  quantity: 1,
  unitPrice: 0,
  total: 0,
  note: '',
};

const BaoDuong = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedSections, setExpandedSections] = useState({ tire: false });
  const [loadedSections, setLoadedSections] = useState({ tire: false });
  const [isEdit, setIsEdit] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, recordId: null, details: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [counts, setCounts] = useState({ tire: 0 });

  // Data fetching
  const {
    maintenanceRecords,
    setMaintenanceRecords,
    licensePlates,
    setLicensePlates,
    isLoading,
    error,
    fetchData,
  } = useMaintenanceRecords(lopXeApi);

  // Form state/handlers
  const {
    formData,
    setFormData,
    errors,
    setErrors,
    isLoading: isFormLoading,
    setIsLoading: setFormLoading,
    handleInputChange,
    validateForm,
    handleSave,
  } = useMaintenanceForm({
    initialFormData,
    isEdit,
    api: lopXeApi,
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
      console.error(err);
    },
  });

  // Fetch count on mount
  useEffect(() => {
    lopXeApi.getCount().then(count => setCounts(c => ({ ...c, tire: count })));
  }, []);

  // Helper to refetch count
  const refetchCount = useCallback(() => {
    lopXeApi.getCount().then(count => setCounts(c => ({ ...c, tire: count })));
  }, []);

  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData({ ...initialFormData, replacementDate: new Date(), ngayHetHan: null });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = record => {
    setIsEdit(true);
    setFormData({
      licensePlate: record.licensePlate,
      replacementDate: new Date(record.replacementDate),
      warrantyPeriod: record.warrantyPeriod,
      ngayHetHan: record.ngayHetHan ? new Date(record.ngayHetHan) : null,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      total: record.total,
      note: record.note || '',
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
        'Biển số xe': record.licensePlate,
        'Ngày thay lốp': new Date(record.replacementDate).toLocaleDateString('vi-VN'),
        'Số lượng': record.quantity,
        'Đơn giá': record.unitPrice,
        'Thành tiền': record.total,
        'Ghi chú': record.note || 'Không có',
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
      await lopXeApi.delete(deleteDialog.recordId);
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
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  // Filter maintenance records based on search term
  const filteredRecords = React.useMemo(() => {
    if (!searchTerm.trim()) return maintenanceRecords;
    const search = searchTerm.toLowerCase();
    return maintenanceRecords.filter(
      record =>
        (record.licensePlate && record.licensePlate.toLowerCase().includes(search)) ||
        (record.note && record.note.toLowerCase().includes(search))
    );
  }, [maintenanceRecords, searchTerm]);

  const toggleSection = section => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
    // Lazy load: only fetch if not loaded yet and expanding
    if (!loadedSections[section] && !expandedSections[section]) {
      fetchData();
      setLoadedSections(prev => ({ ...prev, [section]: true }));
    }
  };

  const handleAddNew = (type = 'tire') => {
    setIsEdit(false);
    setFormData({ ...initialFormData, replacementDate: new Date(), ngayHetHan: null, type });
    setErrors({});
    setOpenDialog(true);
  };

  // Render mobile card view
  const renderMobileView = () => (
    <Box>
      {filteredRecords.map(record => (
        <MaintenanceCard
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
  const renderDesktopView = () => (
    <StandardTable
      columns={maintenanceTableColumns}
      data={filteredRecords}
      loading={isLoading}
      error={error}
      emptyMessage="Không có dữ liệu bảo dưỡng nào"
      sx={{
        '& .MuiTableRow-hover:hover': {
          backgroundColor: 'action.hover',
        },
      }}
      renderActions={record => (
        <>
          <EditButton onClick={() => handleOpenEditDialog(record)} tooltip="Chỉnh sửa" />
          <DeleteButton onClick={() => handleDeleteClick(record)} tooltip="Xóa" />
        </>
      )}
    />
  );

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
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
      </Box>

      {/* Loading state */}
      {isLoading && (
        <Box textAlign="center" py={4}>
          <Typography>Đang tải dữ liệu...</Typography>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Box color="error.main" py={2}>
          <Typography>{error}</Typography>
        </Box>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <Box>
          {/* Lốp Xe Section */}
          <BaoDuongSection
            title="Lốp Xe"
            count={counts.tire}
            expanded={expandedSections.tire}
            onToggle={() => toggleSection('tire')}
            onAdd={() => handleAddNew('tire')}
          >
            {isLoading && !loadedSections.tire ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : isMobile ? (
              renderMobileView()
            ) : (
              renderDesktopView()
            )}
          </BaoDuongSection>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <MaintenanceDialog
        open={openDialog}
        isEdit={isEdit}
        isLoading={isFormLoading}
        formData={formData}
        errors={errors}
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
    </Box>
  );
};

export default BaoDuong;
