import React, { useState, useEffect, useCallback } from 'react';
import ConfirmationDialog from '../../../shared/components/ConfirmationDialog';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  CircularProgress,
  Alert,
  Snackbar,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  TablePagination,
  IconButton,
} from '@mui/material';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon } from '../../../assets/icons';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';

// Mock data service - Replace with actual API calls
const mockApi = {
  getMaintenanceRecords: async () => [
    {
      id: 1,
      licensePlate: '51A-123.45',
      replacementDate: '2025-05-15',
      warrantyPeriod: 6, // months
      quantity: 6,
      unitPrice: 2500000,
      total: 15000000,
      note: 'Thay lốp mới toàn bộ',
    },
    {
      id: 2,
      licensePlate: '51B-678.90',
      replacementDate: '2025-04-20',
      warrantyPeriod: 12, // months
      quantity: 2,
      unitPrice: 3000000,
      total: 6000000,
      note: 'Thay lốp trước',
    },
  ],
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
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [formData, setFormData] = useState({
    licensePlate: '',
    replacementDate: new Date(),
    warrantyPeriod: 6,
    quantity: 1,
    unitPrice: 0,
    total: 0,
    note: '',
  });

  // Calculate total whenever quantity or unitPrice changes
  useEffect(() => {
    const total = (formData.quantity || 0) * (formData.unitPrice || 0);
    setFormData(prev => ({
      ...prev,
      total: total
    }));
  }, [formData.quantity, formData.unitPrice]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    details: null,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [records, plates] = await Promise.all([
        mockApi.getMaintenanceRecords(),
        mockApi.getLicensePlates(),
      ]);
      setMaintenanceRecords(records);
      setFilteredRecords(records);
      setLicensePlates(plates);
    } catch (err) {
      setError('Không thể tải dữ liệu bảo dưỡng');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Apply search filter
    if (!searchTerm) {
      setFilteredRecords(maintenanceRecords);
    } else {
      const filtered = maintenanceRecords.filter(record =>
        record.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRecords(filtered);
    }
    setPage(0); // Reset to first page when search changes
  }, [searchTerm, maintenanceRecords]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenAddDialog = () => {
    setEditingId(null);
    setFormData({
      licensePlate: '',
      replacementDate: new Date(),
      warrantyPeriod: 6,
      quantity: 1,
      unitPrice: 0,
      note: '',
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = record => {
    setEditingId(record.id);
    setFormData({
      licensePlate: record.licensePlate,
      replacementDate: new Date(record.replacementDate),
      warrantyPeriod: record.warrantyPeriod,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      note: record.note || '',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = date => {
    setFormData(prev => ({
      ...prev,
      replacementDate: date,
    }));
  };

  const calculateTotal = (quantity, unitPrice) => {
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    return qty * price;
  };

  const validateForm = () => {
    if (!formData.licensePlate) {
      setError('Vui lòng chọn biển số xe');
      return false;
    }
    if (!formData.replacementDate) {
      setError('Vui lòng chọn ngày thay lốp');
      return false;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      setError('Số lượng phải lớn hơn 0');
      return false;
    }
    if (!formData.unitPrice || formData.unitPrice < 0) {
      setError('Đơn giá không hợp lệ');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const data = {
        ...formData,
        replacementDate: formData.replacementDate.toISOString().split('T')[0],
        warrantyPeriod: Number(formData.warrantyPeriod),
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        total: calculateTotal(formData.quantity, formData.unitPrice),
      };

      if (editingId) {
        await mockApi.updateMaintenanceRecord(editingId, data);
        showSnackbar('Cập nhật thông tin bảo dưỡng thành công');
      } else {
        await mockApi.addMaintenanceRecord(data);
        showSnackbar('Thêm thông tin bảo dưỡng thành công');
      }
      await fetchData();
      handleCloseDialog();
    } catch (err) {
      setError('Đã xảy ra lỗi khi lưu thông tin bảo dưỡng');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = useCallback(
    id => {
      const recordToDelete = maintenanceRecords.find(record => record.id === id);
      if (!recordToDelete) return;

      setDeleteDialog({
        open: true,
        id,
        details: {
          'Biển số xe': recordToDelete.licensePlate,
          'Ngày thay lốp': new Date(recordToDelete.replacementDate).toLocaleDateString('vi-VN'),
          'Số lượng': recordToDelete.quantity,
          'Đơn giá': formatCurrency(recordToDelete.unitPrice),
          'Thành tiền': formatCurrency(recordToDelete.total),
          'Ghi chú': recordToDelete.note || 'Không có',
        },
      });
    },
    [maintenanceRecords]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.id) return;

    setIsLoading(true);
    try {
      await mockApi.deleteMaintenanceRecord(deleteDialog.id);
      showSnackbar('Xóa thông tin bảo dưỡng thành công');
      await fetchData();
      setDeleteDialog(prev => ({ ...prev, open: false }));
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa thông tin bảo dưỡng', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [deleteDialog.id]);

  const handleDeleteClose = useCallback(() => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate warranty end date
  const getWarrantyEndDate = (startDate, months) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}
      >
        <TextField
          variant="outlined"
          size="small"
          placeholder="Tìm kiếm theo biển số xe..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300, flex: 1 }}
        />
        <Button
          variant="contained"
          startIcon={<PlusIcon className="w-5 h-5" />}
          onClick={handleOpenAddDialog}
          disabled={isLoading}
          sx={{ minWidth: 200 }}
        >
          Thêm
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Biển Số Xe</TableCell>
              <TableCell>Ngày Thay Lốp</TableCell>
              <TableCell>Thời Hạn Bảo Hành</TableCell>
              <TableCell align="right">Số Lượng</TableCell>
              <TableCell align="right">Đơn Giá</TableCell>
              <TableCell align="right">Thành Tiền</TableCell>
              <TableCell>Ghi Chú</TableCell>
              <TableCell align="right">Thao Tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((record, index) => (
                  <TableRow key={record.id}>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>{record.licensePlate}</TableCell>
                    <TableCell>
                      {new Date(record.replacementDate).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      {getWarrantyEndDate(record.replacementDate, record.warrantyPeriod)}
                    </TableCell>
                    <TableCell align="right">{record.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(record.unitPrice)}</TableCell>
                    <TableCell align="right">{formatCurrency(record.total)}</TableCell>
                    <TableCell>{record.note || '-'}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditDialog(record)}
                          disabled={isLoading}
                          color="primary"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(record.id)}
                          disabled={isLoading}
                          color="error"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRecords.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} trong ${count !== -1 ? count : `hơn ${to}`}`
          }
        />
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        onKeyDown={(e) => e.key === 'Escape' && handleCloseDialog()}
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            paddingTop: '64px',
          },
          '& .MuiPaper-root': {
            margin: '16px',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
          '& .MuiDialogTitle-root': {
            padding: '16px 24px',
            fontSize: '1.1rem',
            fontWeight: 500,
            color: '#111827',
            borderBottom: '1px solid #E5E7EB',
          },
          '& .MuiDialogContent-root': {
            padding: '24px',
            '&:first-of-type': {
              paddingTop: '24px',
            },
          },
          '& .MuiDialogActions-root': {
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            justifyContent: 'flex-end',
            gap: '8px',
          },
        }}
      >
        <DialogTitle>
          {editingId ? 'Cập nhật thông tin bảo dưỡng' : 'Thêm thông tin bảo dưỡng'}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel 
                id="license-plate-label" 
                sx={{ 
                  fontSize: '0.875rem',
                  '&.Mui-focused': {
                    color: '#4F46E5',
                  },
                }}
              >
                Biển số xe *
              </InputLabel>
              <Select
                id="licensePlate"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleInputChange}
                error={!!error && !formData.licensePlate}
                disabled={isLoading}
                label="Biển số xe *"
                sx={{
                  '& .MuiSelect-select': { 
                    py: '8px',
                    fontSize: '0.875rem',
                  },
                  '& .MuiOutlinedInput-notchedOutline': { 
                    borderColor: '#E5E7EB',
                    '&:hover': {
                      borderColor: '#9CA3AF',
                    },
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4F46E5',
                    borderWidth: '1px',
                  },
                }}
              >
                {licensePlates.map(plate => (
                  <MenuItem 
                    key={plate.id} 
                    value={plate.licensePlate} 
                    sx={{ 
                      fontSize: '0.875rem',
                      '&:hover': {
                        backgroundColor: '#F3F4F6',
                      },
                      '&.Mui-selected': {
                        backgroundColor: '#EEF2FF',
                        '&:hover': {
                          backgroundColor: '#E0E7FF',
                        },
                      },
                    }}
                  >
                    {plate.licensePlate}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, '& > *': { flex: 1 } }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày thay lốp *"
                  inputFormat="dd/MM/yyyy"
                  value={formData.replacementDate}
                  onChange={(date) => {
                    setFormData(prev => ({
                      ...prev,
                      replacementDate: date,
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      fullWidth
                      sx={{
                        '& .MuiInputBase-root': {
                          height: 40,
                          '& input': {
                            py: '8px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                          },
                          '& .MuiInputAdornment-root .MuiSvgIcon-root': {
                            fontSize: '1.1rem',
                            color: 'text.secondary',
                          },
                        },
                        '& .MuiOutlinedInput-root': {
                          '&:hover fieldset': {
                            borderColor: '#9CA3AF',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#4F46E5',
                            borderWidth: '1px',
                          },
                        },
                      }}
                    />
                  )}
                  components={{
                    OpenPickerIcon: () => <CalendarMonthIcon fontSize="small" />,
                  }}
                />
              </LocalizationProvider>

              <TextField
                name="warrantyPeriod"
                type="number"
                label="Bảo hành (tháng)"
                value={formData.warrantyPeriod || 0}
                onChange={e => {
                  const value = Math.max(0, parseInt(e.target.value) || 0);
                  setFormData(prev => ({
                    ...prev,
                    warrantyPeriod: value,
                  }));
                }}
                size="small"
                fullWidth
                inputProps={{
                  min: 0,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  style: {
                    textAlign: 'right',
                    paddingRight: '8px',
                  }
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: 40,
                    '& input': {
                      py: '8px',
                      fontSize: '0.875rem',
                    },
                    '& input[type=number]': {
                      '-moz-appearance': 'textfield',
                      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0,
                      },
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9CA3AF',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4F46E5',
                      borderWidth: '1px',
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ color: '#6B7280', mr: 0.5 }}>
                      tháng
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, '& > *': { flex: 1 } }}>
              <TextField
                name="quantity"
                type="number"
                label="Số lượng"
                value={formData.quantity || 0}
                onChange={e => {
                  const value = Math.max(0, parseInt(e.target.value) || 0);
                  setFormData(prev => ({
                    ...prev,
                    quantity: value
                  }));
                }}
                size="small"
                fullWidth
                inputProps={{
                  min: 0,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  style: {
                    textAlign: 'right',
                    paddingRight: '8px',
                  },
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: 40,
                    '& input': {
                      py: '8px',
                      fontSize: '0.875rem',
                    },
                    '& input[type=number]': {
                      '-moz-appearance': 'textfield',
                      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0,
                      },
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9CA3AF',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4F46E5',
                      borderWidth: '1px',
                    },
                  },
                }}
              />

              <TextField
                name="unitPrice"
                type="number"
                label="Đơn giá (VND)"
                value={formData.unitPrice || 0}
                onChange={e => {
                  const value = Math.max(0, parseInt(e.target.value) || 0);
                  setFormData(prev => ({
                    ...prev,
                    unitPrice: value
                  }));
                }}
                size="small"
                fullWidth
                inputProps={{
                  min: 0,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  style: {
                    textAlign: 'right',
                    paddingRight: '8px',
                  },
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: 40,
                    '& input': {
                      py: '8px',
                      fontSize: '0.875rem',
                    },
                    '& input[type=number]': {
                      '-moz-appearance': 'textfield',
                      '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0,
                      },
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9CA3AF',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4F46E5',
                      borderWidth: '1px',
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ color: '#6B7280', mr: 0.5 }}>
                      đ
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, '& > *': { flex: 1 } }}>
              <TextField
                name="total"
                type="text"
                label="Tổng tiền (VND)"
                value={formatCurrency(formData.total || 0)}
                size="small"
                fullWidth
                inputProps={{
                  readOnly: true,
                  style: {
                    textAlign: 'right',
                    paddingRight: '8px',
                  },
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: 40,
                    '& input': {
                      py: '8px',
                      fontSize: '0.875rem',
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ color: '#6B7280', mr: 0.5 }}>
                      đ
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            size="small"
            disabled={isLoading}
            sx={{
              borderColor: '#D1D5DB',
              color: '#374151',
              '&:hover': {
                borderColor: '#9CA3AF',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            size="small"
            disabled={isLoading || !formData.licensePlate || !formData.replacementDate}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{
              backgroundColor: '#3B82F6',
              '&:hover': {
                backgroundColor: '#2563EB',
              },
              '&.Mui-disabled': {
                backgroundColor: '#E5E7EB',
                color: '#9CA3AF',
              },
            }}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

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
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity || 'success'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

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
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default BaoDuong;
