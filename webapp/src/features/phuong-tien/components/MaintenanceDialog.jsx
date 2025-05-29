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
const MaintenanceDialog = ({
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
      <DialogTitle>
        {isEdit ? 'Chỉnh sửa thông tin bảo dưỡng' : 'Thêm thông tin bảo dưỡng'}
      </DialogTitle>
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
            InputLabelProps={{ shrink: true }}
            inputProps={{ style: { height: '40px', padding: '8px 12px', fontSize: '0.875rem' } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ width: '50%' }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày thay thế"
                  value={formData.replacementDate}
                  onChange={date => onChange({ target: { name: 'replacementDate', value: date } })}
                  renderInput={params => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.replacementDate}
                      helperText={errors.replacementDate}
                      inputProps={{
                        ...params.inputProps,
                        style: {
                          height: '40px',
                          padding: '8px 12px',
                          fontSize: '0.875rem',
                        },
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                    />
                  )}
                  components={{ OpenPickerIcon: CalendarMonthIcon }}
                  enableAccessibleFieldDOMStructure={false}
                />
              </LocalizationProvider>
            </Box>
            <Box sx={{ width: '50%' }}>
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
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: 1,
                  style: { height: '40px', padding: '8px 12px', fontSize: '0.875rem' },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ width: '50%' }}>
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
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: 1,
                  style: { height: '40px', padding: '8px 12px', fontSize: '0.875rem' },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>
            <Box sx={{ width: '50%' }}>
              <TextField
                fullWidth
                size="small"
                label="Đơn giá (VND)"
                name="unitPrice"
                type="number"
                value={formData.unitPrice}
                onChange={onChange}
                error={!!errors.unitPrice}
                helperText={errors.unitPrice}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: 0,
                  style: { height: '40px', padding: '8px 12px', fontSize: '0.875rem' },
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ width: '50%' }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày hết hạn"
                  value={formData.ngayHetHan}
                  readOnly
                  renderInput={params => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        ...params.inputProps,
                        style: {
                          height: '40px',
                          padding: '8px 12px',
                          fontSize: '0.875rem',
                          backgroundColor: 'action.hover',
                        },
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                    />
                  )}
                  components={{ OpenPickerIcon: CalendarMonthIcon }}
                  enableAccessibleFieldDOMStructure={false}
                />
              </LocalizationProvider>
            </Box>
          </Box>
          <TextField
            fullWidth
            size="small"
            label="Tổng tiền (VND)"
            value={formatCurrency(formData.total || 0)}
            disabled
            InputLabelProps={{ shrink: true }}
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
                fontSize: '0.875rem',
                textAlign: 'right',
                color: 'text.primary',
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'action.hover' } }}
          />
          <TextField
            fullWidth
            size="small"
            label="Ghi chú"
            name="note"
            value={formData.note}
            onChange={onChange}
            multiline
            rows={3}
            InputLabelProps={{ shrink: true }}
            inputProps={{ style: { padding: '8px 12px', fontSize: '0.875rem' } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={isLoading}
          sx={{
            minWidth: '100px',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          variant="contained"
          onClick={onSave}
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
  );
};
export default MaintenanceDialog;
