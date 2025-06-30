import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  TextField,
  MenuItem,
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
          target: {
            name: 'nhan_vien_lai_xe_id',
            value: selectedVehicle.default_nhan_vien_lai_xe_id,
          },
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
  const nhanVienLaiXeOptions =
    selectOptions?.employees?.filter(emp => emp.chuc_vu === 'lai-xe') || [];
  const nhanVienGiaoNhanOptions =
    selectOptions?.employees?.filter(emp => emp.chuc_vu === 'giao-nhan') || [];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '6px',
          boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.1), 0 8px 8px -4px rgba(0, 0, 0, 0.04)',
          maxHeight: '94vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'primary.main',
          }}
        >
          {editing ? 'Chỉnh sửa lịch vận chuyển' : 'Tạo lịch vận chuyển mới'}
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: '12px', pt: '8px' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {' '}
              {/* Main container for all sections */}
              {/* Section 1: Thông tin cơ bản */}
              <Box>
                <Paper
                  elevation={0}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <CalendarIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.1rem' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      Thông tin cơ bản
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(4, 1fr)',
                      },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <TextField
                        fullWidth
                        type="date"
                        name="ngay_van_chuyen"
                        label="Ngày vận chuyển"
                        value={currentFormData.ngay_van_chuyen}
                        onChange={onFormChange}
                        InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                        InputProps={{
                          sx: { fontSize: '0.8rem', height: '36px' },
                        }}
                        variant="outlined"
                        size="small"
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        name="ma_chuyen"
                        label="Mã chuyến"
                        value={currentFormData.ma_chuyen}
                        onChange={onFormChange}
                        variant="outlined"
                        size="small"
                        required
                        InputProps={{
                          sx: { fontSize: '0.8rem', height: '36px' },
                        }}
                        InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
                      />
                    </Box>
                    <Box>
                      <FormControl fullWidth size="small" required>
                        <InputLabel sx={{ fontSize: '0.8rem' }}>Khách hàng</InputLabel>
                        <Select
                          name="khach_hang_id"
                          value={currentFormData.khach_hang_id}
                          onChange={onFormChange}
                          label="Khách hàng"
                          sx={{
                            fontSize: '0.8rem',
                            height: '36px',
                            py: 0,
                            '& .MuiOutlinedInput-root': { borderRadius: '4px' },
                          }}
                        >
                          <MenuItem value="">
                            <em>Chọn khách hàng</em>
                          </MenuItem>
                          {selectOptions?.customers?.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box>
                      <FormControl fullWidth size="small" required>
                        <InputLabel sx={{ fontSize: '0.8rem' }}>Trạng thái</InputLabel>
                        <Select
                          name="trang_thai"
                          value={currentFormData.trang_thai}
                          onChange={onFormChange}
                          label="Trạng thái"
                          sx={{
                            fontSize: '0.8rem',
                            height: '36px',
                            py: 0,
                            '& .MuiOutlinedInput-root': { borderRadius: '4px' },
                          }}
                        >
                          {trangThaiOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                </Paper>
              </Box>
              {/* Section 2: Thông tin Tuyến đường */}
              <Box>
                <Paper
                  elevation={0}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <LocationIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.1rem' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      Thông tin Tuyến đường
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <TextField
                        fullWidth
                        name="diem_xuat_phat"
                        label="Điểm xuất phát"
                        value={currentFormData.diem_xuat_phat}
                        onChange={onFormChange}
                        variant="outlined"
                        size="small"
                        required
                        InputProps={{
                          sx: { fontSize: '0.8rem', height: '36px' },
                        }}
                        InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        name="diem_tra_hang"
                        label="Điểm trả hàng"
                        value={currentFormData.diem_tra_hang}
                        onChange={onFormChange}
                        variant="outlined"
                        size="small"
                        required
                        InputProps={{
                          sx: { fontSize: '0.8rem', height: '36px' },
                        }}
                        InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Box>
              {/* Section 3: Phương tiện & Nhân sự */}
              <Box>
                <Paper
                  elevation={0}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <ShippingIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.1rem' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      Phương tiện & Nhân sự
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(4, 1fr)',
                      },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <FormControl fullWidth size="small" required>
                        <InputLabel sx={{ fontSize: '0.8rem' }}>Biển số xe</InputLabel>
                        <Select
                          name="bien_so_xe_id"
                          value={currentFormData.bien_so_xe_id}
                          onChange={onFormChange}
                          label="Biển số xe"
                          sx={{
                            fontSize: '0.8rem',
                            height: '36px',
                            py: 0,
                            '& .MuiOutlinedInput-root': { borderRadius: '4px' },
                          }}
                        >
                          <MenuItem value="">
                            <em>Chọn xe</em>
                          </MenuItem>
                          {selectOptions?.vehicles?.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box>
                      <FormControl fullWidth size="small" required>
                        <InputLabel sx={{ fontSize: '0.8rem' }}>Container</InputLabel>
                        <Select
                          name="container_id"
                          value={currentFormData.container_id}
                          onChange={onFormChange}
                          label="Container"
                          sx={{
                            fontSize: '0.8rem',
                            height: '36px',
                            py: 0,
                            '& .MuiOutlinedInput-root': { borderRadius: '4px' },
                          }}
                        >
                          <MenuItem value="">
                            <em>Chọn container</em>
                          </MenuItem>
                          {selectOptions?.containers?.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box>
                      <FormControl fullWidth size="small" required>
                        <InputLabel sx={{ fontSize: '0.8rem' }}>Nhân viên lái xe</InputLabel>
                        <Select
                          name="nhan_vien_lai_xe_id"
                          value={currentFormData.nhan_vien_lai_xe_id}
                          onChange={onFormChange}
                          label="Nhân viên lái xe"
                          sx={{
                            fontSize: '0.8rem',
                            height: '36px',
                            py: 0,
                            '& .MuiOutlinedInput-root': { borderRadius: '4px' },
                          }}
                        >
                          <MenuItem value="">
                            <em>Chọn lái xe</em>
                          </MenuItem>
                          {nhanVienLaiXeOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    <Box>
                      <FormControl fullWidth size="small" required>
                        <InputLabel sx={{ fontSize: '0.8rem' }}>Nhân viên giao nhận</InputLabel>
                        <Select
                          name="nhan_vien_giao_nhan_id"
                          value={currentFormData.nhan_vien_giao_nhan_id}
                          onChange={onFormChange}
                          label="Nhân viên giao nhận"
                          sx={{
                            fontSize: '0.8rem',
                            height: '36px',
                            py: 0,
                            '& .MuiOutlinedInput-root': { borderRadius: '4px' },
                          }}
                        >
                          <MenuItem value="">
                            <em>Chọn nhân viên giao nhận</em>
                          </MenuItem>
                          {nhanVienGiaoNhanOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                </Paper>
              </Box>
              {/* Section 4: Chi phí & Thanh toán */}
              <Box>
                <Paper
                  elevation={0}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <MoneyIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.1rem' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      Chi phí & Thanh toán
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                      gap: 1.5,
                    }}
                  >
                    <Box>
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
                          sx: { fontSize: '0.8rem', height: '36px' },
                        }}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'text.secondary',
                            },
                          },
                        }}
                      />
                    </Box>
                    <Box>
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
                          sx: { fontSize: '0.8rem', height: '36px' },
                        }}
                        variant="outlined"
                        size="small"
                        helperText={
                          currentFormData.loaiXe === 'xe-cong-ty'
                            ? 'Không áp dụng cho xe công ty'
                            : ''
                        }
                        disabled={currentFormData.loaiXe === 'xe-cong-ty'}
                        InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '4px',
                            backgroundColor:
                              currentFormData.loaiXe === 'xe-cong-ty'
                                ? 'action.hover'
                                : 'background.paper',
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
                    </Box>
                  </Box>
                </Paper>
              </Box>
              {/* Section 5: Ghi chú */}
              <Box>
                <Paper
                  elevation={0}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <InfoIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.1rem' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      Ghi chú
                    </Typography>
                  </Box>
                  <Box>
                    <Box>
                      <TextField
                        fullWidth
                        name="ghi_chu"
                        label="Ghi chú"
                        value={currentFormData.ghi_chu}
                        onChange={onFormChange}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          sx: { fontSize: '0.8rem', height: '36px' },
                        }}
                        InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Box>
              {/* Section 6: Trạng thái - chỉ hiển thị khi edit */}
              {editing && (
                <Box>
                  <Paper
                    elevation={0}
                    sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <InfoIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.1rem' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        Trạng thái
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <FormControl fullWidth size="small" required>
                          <InputLabel sx={{ fontSize: '0.8rem' }}>Trạng thái kế hoạch</InputLabel>
                          <Select
                            name="trangThai"
                            value={currentFormData.trangThai}
                            onChange={onFormChange}
                            label="Trạng thái kế hoạch"
                            sx={{
                              fontSize: '0.8rem',
                              height: '36px',
                              py: 0,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '4px',
                              },
                            }}
                          >
                            <MenuItem value="Lên lịch">Lên lịch</MenuItem>
                            <MenuItem value="Đang vận chuyển">Đang vận chuyển</MenuItem>
                            <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
                            <MenuItem value="Hủy">Hủy</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              )}
            </Box>{' '}
            {/* Closes Box container spacing={3} from line 146 */}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={isLoading}
            sx={{
              minWidth: '80px',
              fontSize: '0.8rem',
              py: 0.5,
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
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              minWidth: '100px',
              fontSize: '0.8rem',
              py: 0.5,
              textTransform: 'none',
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            {isLoading
              ? editing
                ? 'Đang sửa...'
                : 'Đang tạo...'
              : editing
                ? 'Sửa kế hoạch'
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
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  selectOptions: PropTypes.shape({
    customers: PropTypes.arrayOf(
      PropTypes.shape({ value: PropTypes.any.isRequired, label: PropTypes.string.isRequired })
    ),
    vehicles: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.any.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string,
        default_nhan_vien_lai_xe_id: PropTypes.any,
      })
    ),
    employees: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.any.isRequired,
        label: PropTypes.string.isRequired,
        chuc_vu: PropTypes.string,
      })
    ),
    containers: PropTypes.arrayOf(
      PropTypes.shape({ value: PropTypes.any.isRequired, label: PropTypes.string.isRequired })
    ),
  }).isRequired,
};
export default DesktopShipmentFormDialog;
