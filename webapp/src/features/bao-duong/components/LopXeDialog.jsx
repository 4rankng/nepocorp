import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Box,
  InputAdornment,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const LopXeDialog = ({
  open,
  isEdit,
  isLoading,
  formData,
  errors = {},
  onClose,
  onChange,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Chỉnh sửa thông tin lốp xe' : 'Thêm thông tin lốp xe'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Biển số xe"
            name="licensePlate"
            value={formData.licensePlate}
            onChange={onChange}
            error={!!errors.licensePlate}
            helperText={errors.licensePlate}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <DatePicker
              label="Ngày thay lốp"
              value={formData.replacementDate}
              onChange={date => {
                onChange({
                  target: {
                    name: 'replacementDate',
                    value: date,
                  },
                });
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  error: !!errors.replacementDate,
                  helperText: errors.replacementDate,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonthIcon />
                      </InputAdornment>
                    ),
                  },
                },
              }}
            />
          </LocalizationProvider>

          <TextField
            fullWidth
            size="small"
            label="Thời hạn bảo hành (tháng)"
            name="warrantyPeriod"
            type="number"
            value={formData.warrantyPeriod}
            onChange={onChange}
            error={!!errors.warrantyPeriod}
            helperText={errors.warrantyPeriod}
            InputProps={{
              endAdornment: <InputAdornment position="end">tháng</InputAdornment>,
            }}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
            <DatePicker
              label="Ngày hết hạn (tự động tính)"
              value={formData.ngayHetHan}
              disabled
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonthIcon />
                      </InputAdornment>
                    ),
                  },
                },
              }}
            />
          </LocalizationProvider>

          <TextField
            fullWidth
            size="small"
            label="Số lượng"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={onChange}
            error={!!errors.quantity}
            helperText={errors.quantity}
          />

          <TextField
            fullWidth
            size="small"
            label="Đơn giá"
            name="unitPrice"
            type="number"
            value={formData.unitPrice}
            onChange={onChange}
            error={!!errors.unitPrice}
            helperText={errors.unitPrice}
            InputProps={{
              endAdornment: <InputAdornment position="end">VND</InputAdornment>,
            }}
          />

          <TextField
            fullWidth
            size="small"
            label="Thành tiền (tự động tính)"
            value={formatCurrency(formData.quantity * formData.unitPrice)}
            disabled
          />

          <TextField
            fullWidth
            size="small"
            label="Ghi chú"
            name="note"
            multiline
            rows={3}
            value={formData.note}
            onChange={onChange}
            placeholder="Nhập ghi chú nếu có"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>
          Hủy
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          color="primary"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LopXeDialog;
