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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Vehicle types for dropdown
const vehicleTypes = [
  { value: 'truck', label: 'Xe tải' },
  { value: 'container', label: 'Xe container' },
  { value: 'tractor', label: 'Đầu kéo' },
  { value: 'trailer', label: 'Rơ moóc' },
];

const XeVanChuyen = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    vehicleId: null,
    details: '',
  });

  const [formData, setFormData] = useState({
    licensePlate: '',
    vehicleType: '',
    note: '',
  });

  const [errors, setErrors] = useState({});

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data || []);
      setFilteredVehicles(response.data || []);
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

  // Filter vehicles based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVehicles(vehicles);
    } else {
      const filtered = vehicles.filter(vehicle => {
        const licensePlate = (vehicle.licensePlate || vehicle.bienSo || '').toLowerCase();
        const vehicleTypeLabel = vehicleTypes.find(t => t.value === vehicle.vehicleType)?.label || vehicle.vehicleType || '';
        const note = (vehicle.note || '').toLowerCase();
        const search = searchTerm.toLowerCase();

        return licensePlate.includes(search) ||
               vehicleTypeLabel.toLowerCase().includes(search) ||
               note.includes(search);
      });
      setFilteredVehicles(filtered);
    }
  }, [vehicles, searchTerm]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseDialog = useCallback(() => {
    setFormData({
      licensePlate: '',
      vehicleType: '',
      note: '',
    });
    setErrors({});
    setIsEdit(false);
    setOpenDialog(false);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Vui lòng nhập biển số xe';
    }

    if (!formData.vehicleType) {
      newErrors.vehicleType = 'Vui lòng chọn loại xe';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData({
      licensePlate: '',
      vehicleType: '',
      note: '',
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = vehicle => {
    setIsEdit(true);
    setFormData({
      licensePlate: vehicle.licensePlate || vehicle.bienSo,
      vehicleType: vehicle.vehicleType || 'truck',
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
      [name]: value,
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
      details: `Bạn có chắc chắn muốn xóa phương tiện ${vehicle.licensePlate || vehicle.bienSo}?`,
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
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

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Ghi chú"
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
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
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            searchPlaceholder="Tìm kiếm xe theo biển số, loại xe..."
            headerAction={<AddButton onClick={handleOpenAddDialog} size="small" sx={{ ml: 2 }} />}
            columns={[
              {
                key: 'licensePlate',
                label: 'BIỂN SỐ XE',
                render: (value, row) => value || row.bienSo || '',
              },
              {
                key: 'vehicleType',
                label: 'LOẠI XE',
                render: value => {
                  const type = vehicleTypes.find(t => t.value === value);
                  return type ? type.label : value || '';
                },
              },
              {
                key: 'note',
                label: 'GHI CHÚ',
                render: value => value || '',
              },
            ]}
            data={filteredVehicles}
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
