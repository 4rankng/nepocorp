import React, { useState, useEffect, useCallback } from 'react';
import ConfirmationDialog from '@shared/components/ConfirmationDialog';
import StandardTable from '@shared/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@shared/components/ActionButtons';
import { vehicleApi } from '@services/mockApi';

import {
  Box,
  Button,
  Paper,
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
  Grid,
  IconButton,
  Collapse,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ChevronDownIcon, ChevronUpIcon } from '@assets/icons';
import { alpha } from '@mui/material/styles';

// Theme variables
const theme = {
  spacing: 8,
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h6: { fontSize: '1rem', fontWeight: 600 },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem', color: 'text.secondary' },
  },
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f5f7fa', paper: '#ffffff' },
    text: { primary: '#1a1a1a', secondary: '#6b7280' },
    grey: { 100: '#f3f4f6', 200: '#e5e7eb' },
    success: { light: '#4caf50', main: '#2e7d32' },
    warning: { light: '#ff9800', main: '#ed6c02' },
    error: { main: '#d32f2f' },
  },
  shape: { borderRadius: 6 },
  shadows: [
    'none',
    '0px 2px 8px rgba(0, 0, 0, 0.08)',
    '0px 4px 12px rgba(0, 0, 0, 0.1)',
    '0px 6px 16px rgba(0, 0, 0, 0.12)',
    '0px 8px 24px rgba(0, 0, 0, 0.15)',
  ],
};

// Helper functions
const spacing = value => `${value * theme.spacing}px`;

// Vehicle types for dropdown
const vehicleTypes = [
  { value: 'truck', label: 'Xe tải' },
  { value: 'container', label: 'Xe container' },
  { value: 'tractor', label: 'Đầu kéo' },
  { value: 'trailer', label: 'Rơ moóc' },
];

const XeVanChuyen = () => {
  const [vehicles, setVehicles] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    vehicleId: null,
    details: '',
  });

  const [formData, setFormData] = useState({
    licensePlate: '',
    vehicleType: '',
    capacity: '',
    containerCount: 1,
    note: '',
  });

  const [errors, setErrors] = useState({});

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data || []);
      setError('');
    } catch (err) {
      setError('Không thể tải danh sách phương tiện');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseDialog = useCallback(() => {
    setFormData({
      licensePlate: '',
      vehicleType: '',
      capacity: '',
      containerCount: 1,
      note: '',
    });
    setErrors({});
    setIsEdit(false);
    setOpenDialog(false);
  }, []);

  // Handle ESC key press to close dialog
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && openDialog) {
        handleCloseDialog();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDialog, handleCloseDialog]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Vui lòng nhập biển số xe';
    }

    if (!formData.vehicleType) {
      newErrors.vehicleType = 'Vui lòng chọn loại xe';
    }

    if (!formData.capacity) {
      newErrors.capacity = 'Vui lòng nhập trọng tải';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData({
      licensePlate: '',
      vehicleType: '',
      capacity: '',
      containerCount: 1,
      note: '',
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = vehicle => {
    setIsEdit(true);
    setFormData({
      licensePlate: vehicle.licensePlate || vehicle.bienSoXe,
      vehicleType: vehicle.vehicleType || 'truck',
      capacity: vehicle.capacity || '',
      containerCount: vehicle.containerCount || 1,
      note: vehicle.note || '',
      id: vehicle.id,
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'containerCount' ? parseInt(value) || 0 : value,
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isEdit) {
        await vehicleApi.update(formData.id, formData);
        showSnackbar('Cập nhật thông tin xe thành công');
      } else {
        await vehicleApi.create(formData);
        showSnackbar('Thêm xe mới thành công');
      }
      await fetchVehicles();
      handleCloseDialog();
    } catch (err) {
      const errorMessage = isEdit
        ? 'Đã xảy ra lỗi khi cập nhật thông tin xe'
        : 'Đã xảy ra lỗi khi thêm xe mới';
      showSnackbar(errorMessage, 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = vehicle => {
    setDeleteDialog({
      open: true,
      vehicleId: vehicle.id,
      details: `Bạn có chắc chắn muốn xóa phương tiện ${vehicle.licensePlate || vehicle.bienSoXe}?`,
    });
  };

  const handleDeleteClose = () => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.vehicleId) return;

    setIsLoading(true);
    try {
      await vehicleApi.delete(deleteDialog.vehicleId);
      showSnackbar('Xóa phương tiện thành công');
      await fetchVehicles();
      handleDeleteClose();
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa phương tiện', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDialog = () => {
    return (
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <DialogTitle
          sx={{
            p: '16px 24px',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {isEdit ? 'Chỉnh sửa thông tin xe' : 'Thêm xe mới'}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: '24px' }}>
          <DialogContentText
            sx={{
              mb: 3,
              color: 'text.primary',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            {isEdit ? 'Cập nhật thông tin phương tiện.' : 'Nhập thông tin phương tiện mới.'}
          </DialogContentText>

          <Box component="form" noValidate autoComplete="off" sx={{ '& > :not(style)': { mb: 2 } }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Biển số xe"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleInputChange}
                  error={!!errors.licensePlate}
                  helperText={errors.licensePlate || ''}
                  variant="outlined"
                  margin="none"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    style: {
                      height: '40px',
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      fontSize: '0.875rem',
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="vehicle-type-label" shrink>
                    Loại xe
                  </InputLabel>
                  <Select
                    labelId="vehicle-type-label"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    error={!!errors.vehicleType}
                    displayEmpty
                    notched
                    sx={{
                      '& .MuiSelect-select': {
                        height: '40px',
                        padding: '8px 12px',
                        boxSizing: 'border-box',
                        fontSize: '0.875rem',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: errors.vehicleType ? 'error.main' : 'rgba(0, 0, 0, 0.23)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: errors.vehicleType ? 'error.main' : 'text.secondary',
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Chọn loại xe</em>
                    </MenuItem>
                    {vehicleTypes.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.vehicleType && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      {errors.vehicleType}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Trọng tải"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  error={!!errors.capacity}
                  helperText={errors.capacity || ''}
                  variant="outlined"
                  margin="none"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    style: {
                      height: '40px',
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      fontSize: '0.875rem',
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Số container"
                  name="containerCount"
                  type="number"
                  value={formData.containerCount}
                  onChange={handleInputChange}
                  variant="outlined"
                  margin="none"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: 0,
                    style: {
                      height: '40px',
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      fontSize: '0.875rem',
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Ghi chú (tùy chọn)"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  variant="outlined"
                  margin="none"
                  multiline
                  rows={3}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    style: {
                      padding: '12px',
                      boxSizing: 'border-box',
                      fontSize: '0.875rem',
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p: '16px 24px',
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'flex-end',
            gap: '12px',
            '& > *': {
              margin: '0 !important',
            },
          }}
        >
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            color="inherit"
            size="small"
            sx={{
              height: '36px',
              px: '16px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'text.primary',
              borderColor: 'action.disabled',
              borderRadius: '6px',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'text.secondary',
                backgroundColor: 'action.hover',
              },
              '&:active': {
                backgroundColor: 'action.selected',
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            size="small"
            disabled={isLoading}
            sx={{
              height: '36px',
              px: '20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '6px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                backgroundColor: 'primary.dark',
              },
              '&:active': {
                boxShadow: 'none',
                backgroundColor: 'primary.dark',
              },
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'text.disabled',
              },
            }}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {isLoading ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Quản Lý Xe Vận Chuyển
        </Typography>
        <AddButton onClick={handleOpenAddDialog} />
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <StandardTable
            columns={[
              {
                key: 'licensePlate',
                label: 'Biển số xe',
              },
              {
                key: 'vehicleType',
                label: 'Loại xe',
                render: value => {
                  const type = vehicleTypes.find(t => t.value === value);
                  return type ? type.label : value;
                },
              },
              {
                key: 'capacity',
                label: 'Trọng tải',
              },
              {
                key: 'containerCount',
                label: 'Số container',
                align: 'center',
              },
              {
                key: 'note',
                label: 'Ghi chú',
                maxWidth: 200,
                noWrap: true,
                render: value => value || 'Không có ghi chú',
                getColor: value => (value ? 'text.primary' : 'text.disabled'),
              },
            ]}
            data={vehicles}
            loading={isLoading}
            emptyMessage="Không có dữ liệu xe vận chuyển"
            renderActions={row => (
              <>
                <EditButton
                  onClick={e => {
                    e.stopPropagation();
                    handleOpenEditDialog(row);
                  }}
                />
                <DeleteButton
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteClick(row);
                  }}
                />
              </>
            )}
          />
        </Paper>
      )}

      {/* Render dialogs */}
      {renderDialog()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmationDialog
        open={deleteDialog.open}
        onCancel={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa xe vận chuyển"
        message={deleteDialog.details}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />
    </Box>
  );
};

export default XeVanChuyen;
