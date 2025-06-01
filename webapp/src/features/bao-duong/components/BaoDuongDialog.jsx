import React, { useState, useEffect } from 'react';
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
  useMediaQuery,
  useTheme,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from '@mui/material';
import { dauKeoApi, roMoocApi } from '@services/mockApi';
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
const BaoDuongDialog = ({
  open,
  isEdit,
  isLoading,
  formData,
  errors = {},
  onClose,
  onChange,
  onSave,
  licensePlates = [],
  isLoadingPlates = false,
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const handleBienSoChange = event => {
    onChange({
      target: {
        name: 'bien_so',
        value: event.target.value,
      },
    });
  };
  // Convert string date to Date object for DatePicker
  const parseDate = dateString => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isDesktop ? 'md' : 'sm'}
      fullWidth
      PaperProps={{
        sx: {
          height: isDesktop ? 'auto' : '90vh',
          maxHeight: isDesktop ? '90vh' : 'none',
        },
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        {isDesktop ? (
          // Desktop layout - Two columns
          <Box sx={{ display: 'flex', gap: 3, minHeight: '400px' }}>
            {/* Left Column - Basic Information */}
            <Paper
              elevation={2}
              sx={{
                flex: 1,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Typography variant="h6" sx={{ mb: 1, color: theme.palette.primary.main }}>
                Thông tin cơ bản
              </Typography>
              <FormControl fullWidth size="small" error={!!errors.bien_so} required>
                <InputLabel id="bien-so-label">Biển số xe</InputLabel>
                <Select
                  labelId="bien-so-label"
                  id="bien_so"
                  name="bien_so"
                  value={formData.bien_so || ''}
                  onChange={handleBienSoChange}
                  label="Biển số xe"
                  disabled={isLoadingPlates}
                >
                  {isLoadingPlates ? (
                    <MenuItem disabled>
                      <Box display="flex" alignItems="center" width="100%">
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Đang tải danh sách biển số...
                      </Box>
                    </MenuItem>
                  ) : (
                    licensePlates.map(plate => (
                      <MenuItem key={plate.value} value={plate.value}>
                        {plate.value} ({plate.type})
                      </MenuItem>
                    ))
                  )}
                </Select>
                {errors.bien_so && <FormHelperText>{errors.bien_so}</FormHelperText>}
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Hạng mục"
                name="item_name"
                value={formData.item_name || ''}
                onChange={onChange}
                error={!!errors.item_name}
                helperText={errors.item_name}
                required
              />
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày thay thế"
                  value={parseDate(formData.ngay_thay)}
                  onChange={date => {
                    onChange({
                      target: {
                        name: 'ngay_thay',
                        value: date,
                      },
                    });
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                      error: !!errors.ngay_thay,
                      helperText: errors.ngay_thay,
                      required: true,
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
                name="so_thang_bao_hanh"
                type="number"
                value={formData.so_thang_bao_hanh || ''}
                onChange={onChange}
                error={!!errors.so_thang_bao_hanh}
                helperText={errors.so_thang_bao_hanh}
                required
                InputProps={{
                  endAdornment: <InputAdornment position="end">tháng</InputAdornment>,
                }}
              />
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày hết hạn (tự động tính)"
                  value={parseDate(formData.ngay_het_han)}
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
            </Paper>
            {/* Right Column - Pricing & Notes */}
            <Paper
              elevation={2}
              sx={{
                flex: 1,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Typography variant="h6" sx={{ mb: 1, color: theme.palette.primary.main }}>
                Chi phí & Ghi chú
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Số lượng"
                name="so_luong"
                type="number"
                value={formData.so_luong || ''}
                onChange={onChange}
                error={!!errors.so_luong}
                helperText={errors.so_luong}
                required
                inputProps={{ min: 1 }}
                onWheel={e => e.target.blur()}
              />
              <TextField
                fullWidth
                size="small"
                label="Đơn giá"
                name="don_gia"
                type="number"
                value={formData.don_gia || ''}
                onChange={onChange}
                error={!!errors.don_gia}
                helperText={errors.don_gia}
                required
                inputProps={{ min: 0 }}
                onWheel={e => e.target.blur()}
                InputProps={{
                  endAdornment: <InputAdornment position="end">VND</InputAdornment>,
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Tổng tiền"
                name="tong_tien"
                value={formData.tong_tien ? formatCurrency(formData.tong_tien) : '0 VND'}
                disabled
                InputProps={{
                  endAdornment: <InputAdornment position="end">VND</InputAdornment>,
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Ghi chú"
                name="ghi_chu"
                value={formData.ghi_chu || ''}
                onChange={onChange}
                error={!!errors.ghi_chu}
                helperText={errors.ghi_chu}
                multiline
                rows={3}
              />
            </Paper>
          </Box>
        ) : (
          // Mobile layout - Single column
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small" error={!!errors.bien_so} required>
              <InputLabel id="bien-so-mobile-label">Biển số xe</InputLabel>
              <Select
                labelId="bien-so-mobile-label"
                id="bien_so_mobile"
                name="bien_so"
                value={formData.bien_so || ''}
                onChange={handleBienSoChange}
                label="Biển số xe"
                disabled={isLoadingPlates}
              >
                {isLoadingPlates ? (
                  <MenuItem disabled>
                    <Box display="flex" alignItems="center" width="100%">
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Đang tải danh sách biển số...
                    </Box>
                  </MenuItem>
                ) : (
                  licensePlates.map(plate => (
                    <MenuItem key={`mobile-${plate.value}`} value={plate.value}>
                      {plate.value} ({plate.type})
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.bien_so && <FormHelperText>{errors.bien_so}</FormHelperText>}
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker
                label="Ngày thay thế"
                value={parseDate(formData.ngay_thay)}
                onChange={date => {
                  onChange({
                    target: {
                      name: 'ngay_thay',
                      value: date,
                    },
                  });
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    error: !!errors.ngay_thay,
                    helperText: errors.ngay_thay,
                    required: true,
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
              name="so_thang_bao_hanh"
              type="number"
              value={formData.so_thang_bao_hanh || ''}
              onChange={onChange}
              error={!!errors.so_thang_bao_hanh}
              helperText={errors.so_thang_bao_hanh}
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">tháng</InputAdornment>,
              }}
              inputProps={{ min: 1 }}
              onWheel={e => e.target.blur()}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker
                label="Ngày hết hạn (tự động tính)"
                value={parseDate(formData.ngay_het_han)}
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
              name="so_luong"
              type="number"
              value={formData.so_luong || ''}
              onChange={onChange}
              error={!!errors.so_luong}
              helperText={errors.so_luong}
              required
              inputProps={{ min: 1 }}
              onWheel={e => e.target.blur()}
            />
            <TextField
              fullWidth
              size="small"
              label="Đơn giá"
              name="don_gia"
              type="number"
              value={formData.don_gia || ''}
              onChange={e => {
                const value = e.target.value;
                onChange(e);
                if (formData.so_luong) {
                  onChange({
                    target: {
                      name: 'tong_tien',
                      value: value * formData.so_luong,
                    },
                  });
                }
              }}
              error={!!errors.don_gia}
              helperText={errors.don_gia}
              required
              inputProps={{ min: 0 }}
              onWheel={e => e.target.blur()}
              InputProps={{
                endAdornment: <InputAdornment position="end">VND</InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Tổng tiền"
              value={formData.tong_tien ? formatCurrency(formData.tong_tien) : '0 VND'}
              disabled
              InputProps={{
                endAdornment: <InputAdornment position="end">VND</InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Ghi chú"
              name="ghi_chu"
              multiline
              rows={3}
              value={formData.ghi_chu || ''}
              onChange={onChange}
              error={!!errors.ghi_chu}
              helperText={errors.ghi_chu}
              placeholder="Nhập ghi chú nếu có"
            />
          </Box>
        )}
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
          {isLoading ? 'Đang lưu...' : isEdit ? 'Sửa' : 'Thêm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default BaoDuongDialog;
