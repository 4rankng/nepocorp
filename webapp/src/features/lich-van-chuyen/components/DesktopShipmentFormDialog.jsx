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
  editingPlan,
  formData,
  onFormChange,
  onContainerFormChange,
  onAddContainerField,
  onRemoveContainerField,
  onSave,
  isLoading,
  error,
  selectOptions,
}) => {
  const handleSubmit = e => {
    e.preventDefault();
    onSave();
  };

  // Auto-fill driver information when vehicle (bienSoXeId) changes
  useEffect(() => {
    if (formData.bienSoXeId && selectOptions?.vehicles) {
      const selectedVehicle = selectOptions.vehicles.find(v => v.value === formData.bienSoXeId);
      if (selectedVehicle && selectedVehicle.driverId && selectedVehicle.driverName) {
        // Create a synthetic event object for onFormChange
        const driverIdEvent = {
          target: { name: 'maNhanVienLaiXe', value: selectedVehicle.driverId },
        };
        const driverNameEvent = { target: { name: 'tenLaiXe', value: selectedVehicle.driverName } };
        onFormChange(driverIdEvent);
        onFormChange(driverNameEvent);
      } else {
        // Clear driver fields if vehicle doesn't have driver info or is unselected
        const clearDriverIdEvent = { target: { name: 'maNhanVienLaiXe', value: '' } };
        const clearDriverNameEvent = { target: { name: 'tenLaiXe', value: '' } };
        onFormChange(clearDriverIdEvent);
        onFormChange(clearDriverNameEvent);
      }
    }
  }, [formData.bienSoXeId, selectOptions?.vehicles, onFormChange]);

  // Default values for formData to prevent uncontrolled component warnings
  const currentFormData = {
    ngayThang: '',
    dienGiai: '',
    khachHangId: '',
    tuyenDuongDi: '',
    tuyenDuongDen: '',
    loaiContainerId: '',
    soLuongContainer: 1,
    loaiXe: 'xe-cong-ty', // Default to 'xe-cong-ty'
    bienSoXeId: '',
    maNhanVienLaiXe: '', // For auto-fill
    tenLaiXe: '', // For auto-fill
    doiTacVanChuyen: '', // For partner's vehicle info if loaiXe is 'xe-doi-tac'
    doiTacId: '', // Partner company ID if loaiXe is 'xe-doi-tac'
    cuocVanChuyen: 0,
    cuocThueVanChuyen: 0, // If applicable for xe-doi-tac
    ngayHaHang: '',
    thongTinContainer: [{ soContainer: '', soSeal: '' }],
    trangThai: 'Lên lịch', // Default for new, or from editingPlan
    ...formData, // Spread the passed formData to override defaults
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md" // Adjusted from lg for potentially less content width needed than previous design
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24,
          maxHeight: '90vh', // Ensure dialog doesn't exceed viewport height
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {editingPlan ? 'Chỉnh sửa Kế hoạch vận chuyển' : 'Tạo mới Kế hoạch vận chuyển'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'grey.700' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent
          sx={{
            p: 2,
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {' '}
          {/* Hide scrollbar */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2.5}>
            {' '}
            {/* Main container for all sections */}
            {/* Section 1: Thông tin cơ bản */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Thông tin cơ bản
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="date"
                      name="ngayThang"
                      label="Ngày vận chuyển"
                      value={currentFormData.ngayThang}
                      onChange={onFormChange}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Khách hàng</InputLabel>
                      <Select
                        name="khachHangId"
                        value={currentFormData.khachHangId}
                        onChange={onFormChange}
                        label="Khách hàng"
                      >
                        <MenuItem value="">
                          <em>Chọn khách hàng</em>
                        </MenuItem>
                        {selectOptions?.customers?.map(customer => (
                          <MenuItem key={customer.value} value={customer.value}>
                            {customer.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      name="dienGiai"
                      label="Diễn giải"
                      value={currentFormData.dienGiai}
                      onChange={onFormChange}
                      variant="outlined"
                      size="small"
                      placeholder="Mô tả chi tiết về kế hoạch vận chuyển..."
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {/* Section 2: Tuyến đường */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Tuyến đường
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="tuyenDuongDi"
                      label="Điểm đi"
                      value={currentFormData.tuyenDuongDi}
                      onChange={onFormChange}
                      variant="outlined"
                      size="small"
                      required
                      placeholder="Nhập điểm xuất phát"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="tuyenDuongDen"
                      label="Điểm đến"
                      value={currentFormData.tuyenDuongDen}
                      onChange={onFormChange}
                      variant="outlined"
                      size="small"
                      required
                      placeholder="Nhập các điểm đến, cách nhau bởi dấu phẩy"
                      helperText="Nhiều điểm đến cách nhau bằng dấu phẩy (,)"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {/* Section 3: Phương tiện & Đối tác */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ShippingIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Phương tiện & Đối tác
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Loại xe</InputLabel>
                      <Select
                        name="loaiXe"
                        value={currentFormData.loaiXe}
                        onChange={onFormChange}
                        label="Loại xe"
                      >
                        <MenuItem value="xe-cong-ty">Xe công ty</MenuItem>
                        <MenuItem value="xe-doi-tac">Xe đối tác</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {currentFormData.loaiXe === 'xe-cong-ty' ? (
                    <>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small" required>
                          <InputLabel>Biển số xe (Đầu kéo)</InputLabel>
                          <Select
                            name="bienSoXeId"
                            value={currentFormData.bienSoXeId}
                            onChange={onFormChange} // Triggers useEffect for driver info
                            label="Biển số xe (Đầu kéo)"
                          >
                            <MenuItem value="">
                              <em>Chọn đầu kéo</em>
                            </MenuItem>
                            {selectOptions?.vehicles
                              ?.filter(v => v.type === 'DAU_KEO')
                              .map(vehicle => (
                                <MenuItem key={vehicle.value} value={vehicle.value}>
                                  {vehicle.label}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          name="maNhanVienLaiXe"
                          label="Mã nhân viên lái xe"
                          value={currentFormData.maNhanVienLaiXe}
                          InputProps={{ readOnly: true }}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          name="tenLaiXe"
                          label="Tên lái xe"
                          value={currentFormData.tenLaiXe}
                          InputProps={{ readOnly: true }}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                    </>
                  ) : (
                    // loaiXe === 'xe-doi-tac'
                    <>
                      <Grid item xs={12} sm={8}>
                        <TextField
                          fullWidth
                          name="doiTacVanChuyen"
                          label="Thông tin xe đối tác & tài xế"
                          value={currentFormData.doiTacVanChuyen}
                          onChange={onFormChange}
                          variant="outlined"
                          size="small"
                          placeholder="Biển số xe, Tên tài xế, SĐT (nếu có)"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Đối tác vận chuyển (Công ty)</InputLabel>
                          <Select
                            name="doiTacId"
                            value={currentFormData.doiTacId}
                            onChange={onFormChange}
                            label="Đối tác vận chuyển (Công ty)"
                          >
                            <MenuItem value="">
                              <em>Chọn đối tác</em>
                            </MenuItem>
                            {selectOptions?.partners?.map(partner => (
                              <MenuItem key={partner.value} value={partner.value}>
                                {partner.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </>
                  )}
                  {/* Common fields for vehicle section */}
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel>Loại container</InputLabel>
                      <Select
                        name="loaiContainerId"
                        value={currentFormData.loaiContainerId}
                        onChange={onFormChange}
                        label="Loại container"
                      >
                        <MenuItem value="">
                          <em>Chọn loại container</em>
                        </MenuItem>
                        {selectOptions?.containerTypes?.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      name="soLuongContainer"
                      label="Số lượng container"
                      value={currentFormData.soLuongContainer}
                      onChange={onFormChange}
                      InputProps={{ inputProps: { min: 1 } }}
                      variant="outlined"
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="date"
                      name="ngayHaHang"
                      label="Ngày hạ hàng (dự kiến)"
                      value={currentFormData.ngayHaHang}
                      onChange={onFormChange}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {/* Section 4: Thông tin Container (Multiple) */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Thông tin Container chi tiết
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={onAddContainerField}
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Thêm container
                  </Button>
                </Box>
                {currentFormData.thongTinContainer?.map((container, index) => (
                  <Box
                    key={index}
                    sx={{ mb: index < currentFormData.thongTinContainer.length - 1 ? 2 : 0 }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={5.5}>
                        <TextField
                          fullWidth
                          name="soContainer"
                          value={container.soContainer}
                          onChange={e => onContainerFormChange(index, e)}
                          label={`Số container ${index + 1}`}
                          variant="outlined"
                          size="small"
                          placeholder="CONT123456"
                        />
                      </Grid>
                      <Grid item xs={12} sm={5.5}>
                        <TextField
                          fullWidth
                          name="soSeal"
                          value={container.soSeal}
                          onChange={e => onContainerFormChange(index, e)}
                          label={`Số seal ${index + 1}`}
                          variant="outlined"
                          size="small"
                          placeholder="SEAL789012"
                        />
                      </Grid>
                      <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}>
                        {currentFormData.thongTinContainer.length > 1 && (
                          <IconButton
                            onClick={() => onRemoveContainerField(index)}
                            color="error"
                            size="small"
                          >
                            <RemoveIcon />
                          </IconButton>
                        )}
                      </Grid>
                    </Grid>
                    {index < currentFormData.thongTinContainer.length - 1 && (
                      <Divider sx={{ mt: 2 }} />
                    )}
                  </Box>
                ))}
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
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {/* Section 6: Trạng thái - chỉ hiển thị khi edit */}
            {editingPlan && (
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
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={isLoading}
            sx={{ textTransform: 'none', color: 'grey.700' }}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ textTransform: 'none' }}
          >
            {isLoading
              ? editingPlan
                ? 'Đang cập nhật...'
                : 'Đang tạo...'
              : editingPlan
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
  editingPlan: PropTypes.object, // null if creating new
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
