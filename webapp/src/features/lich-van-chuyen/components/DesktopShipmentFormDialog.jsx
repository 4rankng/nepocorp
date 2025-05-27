import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  LocalShipping as ShippingIcon,
  AttachMoney as MoneyIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

const DesktopShipmentFormDialog = ({
  open,
  onClose,
  editing, // Renamed from editingPlan
  formData,
  onFormChange,
  onSubmit, // Changed from onSave to match parent prop
  isLoading,
  error,
  selectOptions,
}) => {
  const handleSubmit = e => {
    e.preventDefault();
    onSubmit(); // Use onSubmit prop
  };

  // Auto-fill nhan_vien_lai_xe_id when bien_so_xe_id changes
  useEffect(() => {
    if (formData.bien_so_xe_id && selectOptions?.vehicles) {
      const selectedVehicle = selectOptions.vehicles.find(v => v.value === formData.bien_so_xe_id);
      if (selectedVehicle && selectedVehicle.default_nhan_vien_lai_xe_id) {
        onFormChange({
          target: { name: 'nhan_vien_lai_xe_id', value: selectedVehicle.default_nhan_vien_lai_xe_id },
        });
      } else {
        // Optionally clear if no default driver or vehicle unselected
        // onFormChange({ target: { name: 'nhan_vien_lai_xe_id', value: '' } });
      }
    }
    // Do not clear if formData.bien_so_xe_id is empty, allow manual selection
  }, [formData.bien_so_xe_id, selectOptions?.vehicles, onFormChange]);

  const currentFormData = {
    ngay_van_chuyen: new Date().toISOString().split('T')[0],
    ma_chuyen: '',
    khach_hang_id: '',
    diem_xuat_phat: '',
    diem_tra_hang: '',
    bien_so_xe_id: '',
    container_id: '',
    nhan_vien_giao_nhan_id: '',
    nhan_vien_lai_xe_id: '',
    trang_thai: 'chua_thuc_hien', // Default status
    ghi_chu: '',
    ...formData, // Spread the passed formData to override defaults
  };

  const trangThaiOptions = [
    { value: 'chua_thuc_hien', label: 'Chưa thực hiện' },
    { value: 'dang_thuc_hien', label: 'Đang thực hiện' },
    { value: 'hoan_thanh', label: 'Hoàn thành' },
    { value: 'huy_bo', label: 'Hủy bỏ' },
  ];

  const nhanVienLaiXeOptions = selectOptions?.employees?.filter(emp => emp.chuc_vu === 'lai-xe') || [];
  const nhanVienGiaoNhanOptions = selectOptions?.employees?.filter(emp => emp.chuc_vu === 'giao-nhan') || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2, // Nepocorp Design Guide: 16px vertical padding
          pt: 2,
          px: 3, // Nepocorp Design Guide: 24px horizontal padding
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}> {/* Nepocorp Design Guide */}
          {editing ? 'Chỉnh sửa Lịch Vận Chuyển' : 'Tạo Lịch Vận Chuyển Mới'}
        </Typography>
        <IconButton onClick={onClose} size="medium" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: '24px' }}>
          <Typography
            variant="body2"
            sx={{
              mb: 3,
              color: 'text.secondary', // Per design guide
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            {editing
              ? 'Chỉnh sửa thông tin lịch vận chuyển.'
              : 'Nhập thông tin lịch vận chuyển mới.'}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2.5}>
            <Grid container spacing={3}> {/* Main container for all sections */}
            {/* Section 1: Thông tin cơ bản */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Thông tin cơ bản</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth type="date" name="ngay_van_chuyen" label="Ngày vận chuyển" value={currentFormData.ngay_van_chuyen} onChange={onFormChange} InputLabelProps={{ shrink: true }} variant="outlined" size="small" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth name="ma_chuyen" label="Mã chuyến" value={currentFormData.ma_chuyen} onChange={onFormChange} variant="outlined" size="small" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Khách hàng</InputLabel>
                      <Select name="khach_hang_id" value={currentFormData.khach_hang_id} onChange={onFormChange} label="Khách hàng" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}>
                        <MenuItem value=""><em>Chọn khách hàng</em></MenuItem>
                        {selectOptions?.customers?.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Trạng thái</InputLabel>
                      <Select name="trang_thai" value={currentFormData.trang_thai} onChange={onFormChange} label="Trạng thái" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}>
                        {trangThaiOptions.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Section 2: Thông tin Tuyến đường */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Thông tin Tuyến đường</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth name="diem_xuat_phat" label="Điểm xuất phát" value={currentFormData.diem_xuat_phat} onChange={onFormChange} variant="outlined" size="small" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth name="diem_tra_hang" label="Điểm trả hàng" value={currentFormData.diem_tra_hang} onChange={onFormChange} variant="outlined" size="small" required sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }} />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Section 3: Phương tiện & Nhân sự */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ShippingIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Phương tiện & Nhân sự</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Biển số xe</InputLabel>
                      <Select name="bien_so_xe_id" value={currentFormData.bien_so_xe_id} onChange={onFormChange} label="Biển số xe" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}>
                        <MenuItem value=""><em>Chọn biển số xe</em></MenuItem>
                        {selectOptions?.vehicles?.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Container</InputLabel>
                      <Select name="container_id" value={currentFormData.container_id} onChange={onFormChange} label="Container" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}>
                        <MenuItem value=""><em>Chọn container</em></MenuItem>
                        {selectOptions?.containerTypes?.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Nhân viên lái xe</InputLabel>
                      <Select name="nhan_vien_lai_xe_id" value={currentFormData.nhan_vien_lai_xe_id} onChange={onFormChange} label="Nhân viên lái xe" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}>
                        <MenuItem value=""><em>Chọn lái xe</em></MenuItem>
                        {nhanVienLaiXeOptions.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Nhân viên giao nhận</InputLabel>
                      <Select name="nhan_vien_giao_nhan_id" value={currentFormData.nhan_vien_giao_nhan_id} onChange={onFormChange} label="Nhân viên giao nhận" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}>
                        <MenuItem value=""><em>Chọn nhân viên giao nhận</em></MenuItem>
                        {nhanVienGiaoNhanOptions.map(option => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Section 4: Ghi chú */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <InfoIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Ghi chú</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="ghi_chu"
                      label="Ghi chú"
                      value={currentFormData.ghi_chu}
                      onChange={onFormChange}
                      variant="outlined"
                      size="small"
                      multiline
                      rows={3}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {/* Section 5: Chi phí & Thanh toán */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MoneyIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Chi phí & Thanh toán
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="cuocVanChuyen"
                      label="Cước vận chuyển (thu khách)"
                      value={currentFormData.cuocVanChuyen}
                      onChange={onFormChange}
                      InputProps={{
                        inputProps: { min: 0, step: 1000 },
                        endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>,
                      }}
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        min: 0,
                        step: 1000,
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
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      name="cuocThueVanChuyen"
                      label="Cước thuê vận chuyển (trả đối tác)"
                      value={currentFormData.cuocThueVanChuyen}
                      onChange={onFormChange}
                      InputProps={{
                        inputProps: { min: 0, step: 1000 },
                        endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>,
                      }}
                      variant="outlined"
                      size="small"
                      helperText={
                        currentFormData.loaiXe === 'xe-cong-ty'
                          ? 'Không áp dụng cho xe công ty'
                          : ''
                      }
                      disabled={currentFormData.loaiXe === 'xe-cong-ty'}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        min: 0,
                        step: 1000,
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
                          backgroundColor: currentFormData.loaiXe === 'xe-cong-ty' ? 'action.hover' : 'background.paper',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'text.secondary',
                          },
                          '&.Mui-disabled': {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'divider',
                            },
                          },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {/* Section 6: Trạng thái - chỉ hiển thị khi edit */}
            {editing && (
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <InfoIcon sx={{ mr: 1.5, color: 'secondary.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Trạng thái
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" required>
                        <InputLabel>Trạng thái kế hoạch</InputLabel>
                        <Select
                          name="trangThai"
                          value={currentFormData.trangThai}
                          onChange={onFormChange}
                          label="Trạng thái kế hoạch"
                          sx={{
                            '& .MuiSelect-select': {
                              height: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '0.875rem',
                            },
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '6px',
                            },
                          }}
                        >
                          <MenuItem value="Lên lịch">Lên lịch</MenuItem>
                          <MenuItem value="Đang vận chuyển">Đang vận chuyển</MenuItem>
                          <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
                          <MenuItem value="Hủy">Hủy</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
            </Grid> {/* Closes Grid container spacing={3} from line 146 */}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={onClose}
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
            disabled={isLoading}
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
            {isLoading
              ? editing
                ? 'Đang cập nhật...'
                : 'Đang tạo...'
              : editing
                ? 'Cập nhật kế hoạch'
                : 'Tạo kế hoạch'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

DesktopShipmentFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  editing: PropTypes.bool, // True if editing, false/undefined if creating new
  formData: PropTypes.shape({
    ngayThang: PropTypes.string,
    dienGiai: PropTypes.string,
    khachHangId: PropTypes.string,
    tuyenDuongDi: PropTypes.string,
    tuyenDuongDen: PropTypes.string,
    loaiContainerId: PropTypes.string,
    soLuongContainer: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    loaiXe: PropTypes.oneOf(['xe-cong-ty', 'xe-doi-tac']),
    bienSoXeId: PropTypes.string, // For company trucks, links to vehicle ID
    maNhanVienLaiXe: PropTypes.string, // Auto-filled for company trucks
    tenLaiXe: PropTypes.string, // Auto-filled for company trucks
    doiTacVanChuyen: PropTypes.string, // Details for partner's truck/driver
    doiTacId: PropTypes.string, // Partner company ID
    cuocVanChuyen: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    cuocThueVanChuyen: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ngayHaHang: PropTypes.string,
    thongTinContainer: PropTypes.arrayOf(
      PropTypes.shape({
        soContainer: PropTypes.string,
        soSeal: PropTypes.string,
      })
    ),
    trangThai: PropTypes.string,
  }).isRequired,
  onFormChange: PropTypes.func.isRequired,
  onContainerFormChange: PropTypes.func.isRequired,
  onAddContainerField: PropTypes.func.isRequired,
  onRemoveContainerField: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  selectOptions: PropTypes.shape({
    customers: PropTypes.arrayOf(
      PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
    ).isRequired,
    containerTypes: PropTypes.arrayOf(
      PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
    ).isRequired,
    vehicles: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.string.isRequired, // Vehicle ID
        label: PropTypes.string.isRequired, // License plate or name
        type: PropTypes.string, // e.g., 'DAU_KEO', 'ROMOOC' - important for filtering
        driverId: PropTypes.string, // Employee ID of the driver
        driverName: PropTypes.string, // Name of the driver
      })
    ).isRequired,
    partners: PropTypes.arrayOf(
      PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
    ).isRequired,
  }).isRequired,
};

export default DesktopShipmentFormDialog;
