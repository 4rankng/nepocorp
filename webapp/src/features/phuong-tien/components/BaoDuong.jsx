import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import StandardTable from '@shared/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@shared/components/ActionButtons';
import ConfirmationDialog from '@shared/components/ConfirmationDialog';

// Mock API - Replace with actual API calls
const mockApi = {
  getMaintenanceRecords: async () => ({
    data: [
      {
        id: 1,
        licensePlate: '51A-123.45',
        replacementDate: '2025-05-15',
        warrantyPeriod: 6,
        quantity: 6,
        unitPrice: 2500000,
        total: 15000000,
        note: 'Thay lốp mới toàn bộ',
      },
      {
        id: 2,
        licensePlate: '51B-678.90',
        replacementDate: '2025-04-20',
        warrantyPeriod: 12,
        quantity: 2,
        unitPrice: 3000000,
        total: 6000000,
        note: 'Thay lốp trước',
      },
    ],
  }),
  getLicensePlates: async () => [
    { id: 1, licensePlate: '51A-123.45' },
    { id: 2, licensePlate: '51B-678.90' },
  ],
  addMaintenanceRecord: async data => ({
    id: Date.now(),
    total: data.quantity * data.unitPrice,
    ...data,
  }),
  updateMaintenanceRecord: async (id, data) => ({
    id,
    total: data.quantity * data.unitPrice,
    ...data,
  }),
  deleteMaintenanceRecord: async id => id,
};

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const BaoDuong = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    recordId: null,
    details: null,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    licensePlate: '',
    replacementDate: new Date(),
    warrantyPeriod: 6,
    quantity: 1,
    unitPrice: 0,
    total: 0,
    note: '',
  });

  const [errors, setErrors] = useState({});

  // Calculate total whenever quantity or unitPrice changes
  useEffect(() => {
    const total = (formData.quantity || 0) * (formData.unitPrice || 0);
    setFormData(prev => ({
      ...prev,
      total: total,
    }));
  }, [formData.quantity, formData.unitPrice]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [records, plates] = await Promise.all([
        mockApi.getMaintenanceRecords(),
        mockApi.getLicensePlates(),
      ]);
      setMaintenanceRecords(records.data || []);
      setLicensePlates(plates);
      setError('');
    } catch (err) {
      setError('Không thể tải dữ liệu bảo dưỡng');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData({
      licensePlate: '',
      replacementDate: new Date(),
      warrantyPeriod: 6,
      quantity: 1,
      unitPrice: 0,
      total: 0,
      note: '',
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = record => {
    setIsEdit(true);
    setFormData({
      licensePlate: record.licensePlate,
      replacementDate: new Date(record.replacementDate),
      warrantyPeriod: record.warrantyPeriod,
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.licensePlate) {
      newErrors.licensePlate = 'Vui lòng chọn biển số xe';
    }
    if (!formData.replacementDate) {
      newErrors.replacementDate = 'Vui lòng chọn ngày thay lốp';
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Số lượng phải lớn hơn 0';
    }
    if (!formData.unitPrice || formData.unitPrice < 0) {
      newErrors.unitPrice = 'Đơn giá không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async e => {
    e?.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const data = {
        ...formData,
        replacementDate: formData.replacementDate.toISOString().split('T')[0],
        warrantyPeriod: Number(formData.warrantyPeriod),
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        total: Number(formData.quantity) * Number(formData.unitPrice),
      };

      if (isEdit) {
        await mockApi.updateMaintenanceRecord(formData.id, data);
        showSnackbar('Cập nhật thông tin bảo dưỡng thành công');
      } else {
        await mockApi.addMaintenanceRecord(data);
        showSnackbar('Thêm thông tin bảo dưỡng mới thành công');
      }
      await fetchData();
      handleCloseDialog();
    } catch (err) {
      const errorMessage = isEdit
        ? 'Đã xảy ra lỗi khi cập nhật thông tin bảo dưỡng'
        : 'Đã xảy ra lỗi khi thêm thông tin bảo dưỡng mới';
      showSnackbar(errorMessage, 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = record => {
    setDeleteDialog({
      open: true,
      recordId: record.id,
      details: {
        'Biển số xe': record.licensePlate,
        'Ngày thay lốp': new Date(record.replacementDate).toLocaleDateString('vi-VN'),
        'Số lượng': record.quantity,
        'Đơn giá': formatCurrency(record.unitPrice),
        'Thành tiền': formatCurrency(record.total),
        'Ghi chú': record.note || 'Không có',
      },
    });
  };

  const handleDeleteClose = () => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.recordId) return;

    setIsLoading(true);
    try {
      await mockApi.deleteMaintenanceRecord(deleteDialog.recordId);
      showSnackbar('Xóa thông tin bảo dưỡng thành công');
      await fetchData();
      handleDeleteClose();
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa thông tin bảo dưỡng', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = maintenanceRecords.filter(
    record =>
      !searchTerm ||
      record.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.note && record.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = [
    {
      key: 'licensePlate',
      label: 'Biển số xe',
      sortable: true,
    },
    {
      key: 'replacementDate',
      label: 'Ngày thay lốp',
      render: value => new Date(value).toLocaleDateString('vi-VN'),
      sortable: true,
    },
    {
      key: 'quantity',
      label: 'Số lượng',
      align: 'right',
      sortable: true,
    },
    {
      key: 'unitPrice',
      label: 'Đơn giá',
      render: formatCurrency,
      align: 'right',
      sortable: true,
    },
    {
      key: 'total',
      label: 'Thành tiền',
      render: formatCurrency,
      align: 'right',
      sortable: true,
    },
    {
      key: 'note',
      label: 'Ghi chú',
      render: value => value || 'Không có',
      maxWidth: 300,
      noWrap: true,
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton onClick={() => handleOpenEditDialog(record)} disabled={isLoading} />
          <DeleteButton onClick={() => handleDeleteClick(record)} disabled={isLoading} />
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Quản lý bảo dưỡng phương tiện
        </Typography>
        <AddButton onClick={handleOpenAddDialog} disabled={isLoading} />
      </Box>

      <Paper
        elevation={0}
        sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: 'background.paper' }}
      >
        <StandardTable
          columns={columns}
          data={filteredRecords}
          loading={isLoading}
          error={error}
          searchTerm={searchTerm}
          onSearchChange={e => setSearchTerm(e.target.value)}
          searchPlaceholder="Tìm kiếm theo biển số hoặc ghi chú..."
          emptyMessage="Không có dữ liệu bảo dưỡng nào"
          sx={{
            '& .MuiTableRow-hover:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Paper>

      {/* Add/Edit Dialog */}
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
            {isEdit ? 'Chỉnh sửa thông tin bảo dưỡng' : 'Thêm thông tin bảo dưỡng mới'}
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
            {isEdit
              ? 'Cập nhật thông tin bảo dưỡng phương tiện.'
              : 'Nhập thông tin bảo dưỡng mới cho phương tiện.'}
          </DialogContentText>

          <Box component="form" noValidate autoComplete="off" onSubmit={handleSave}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth size="small" error={!!errors.licensePlate}>
                <InputLabel>Biển số xe *</InputLabel>
                <Select
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleInputChange}
                  label="Biển số xe *"
                  sx={{
                    '& .MuiSelect-select': {
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  {licensePlates.map(plate => (
                    <MenuItem key={plate.id} value={plate.licensePlate}>
                      {plate.licensePlate}
                    </MenuItem>
                  ))}
                </Select>
                {errors.licensePlate && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.licensePlate}
                  </Typography>
                )}
              </FormControl>

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày thay lốp *"
                  value={formData.replacementDate}
                  onChange={date => {
                    setFormData(prev => ({
                      ...prev,
                      replacementDate: date,
                    }));
                    if (errors.replacementDate) {
                      setErrors(prev => ({ ...prev, replacementDate: '' }));
                    }
                  }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      size="small"
                      fullWidth
                      error={!!errors.replacementDate}
                      helperText={errors.replacementDate || ''}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        ...params.inputProps,
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
                  )}
                  components={{
                    OpenPickerIcon: CalendarMonthIcon,
                  }}
                />
              </LocalizationProvider>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Số lượng *"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={e => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    setFormData(prev => ({
                      ...prev,
                      quantity: value,
                    }));
                    if (errors.quantity) {
                      setErrors(prev => ({ ...prev, quantity: '' }));
                    }
                  }}
                  error={!!errors.quantity}
                  helperText={errors.quantity || ''}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: 1,
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

                <TextField
                  fullWidth
                  size="small"
                  label="Đơn giá (VND) *"
                  name="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={e => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    setFormData(prev => ({
                      ...prev,
                      unitPrice: value,
                    }));
                    if (errors.unitPrice) {
                      setErrors(prev => ({ ...prev, unitPrice: '' }));
                    }
                  }}
                  error={!!errors.unitPrice}
                  helperText={errors.unitPrice || ''}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="body2" color="text.secondary">
                          VND
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    min: 0,
                    style: {
                      height: '40px',
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      fontSize: '0.875rem',
                      textAlign: 'right',
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
              </Box>

              <TextField
                fullWidth
                size="small"
                label="Bảo hành (tháng)"
                name="warrantyPeriod"
                type="number"
                value={formData.warrantyPeriod}
                onChange={e => {
                  const value = Math.max(0, parseInt(e.target.value) || 0);
                  setFormData(prev => ({
                    ...prev,
                    warrantyPeriod: value,
                  }));
                }}
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

              <TextField
                fullWidth
                size="small"
                label="Tổng tiền (VND)"
                value={formatCurrency(formData.total || 0)}
                disabled
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="body2" color="text.secondary">
                        VND
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  style: {
                    height: '40px',
                    padding: '8px 12px',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                    textAlign: 'right',
                    color: 'text.primary',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'action.hover',
                    '&.Mui-disabled': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'divider',
                      },
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Ghi chú"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                multiline
                rows={3}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  style: {
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
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            disabled={isLoading}
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || !formData.licensePlate || !formData.replacementDate}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

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
        loading={isLoading}
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
