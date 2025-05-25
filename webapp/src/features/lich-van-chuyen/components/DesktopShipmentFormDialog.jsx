import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

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
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ py: 2, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {editingPlan ? 'Chỉnh sửa Lịch vận chuyển' : 'Tạo mới Lịch vận chuyển'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  name="ngayThang"
                  id="ngayThang"
                  label="Ngày vận chuyển (*)"
                  value={formData.ngayThang}
                  onChange={onFormChange}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  name="khachHangId"
                  id="khachHangId"
                  label="Khách hàng (*)"
                  value={formData.khachHangId}
                  onChange={onFormChange}
                  variant="outlined"
                  size="small"
                  required
                >
                  <MenuItem key="empty-customer" value="">
                    <em>Chọn khách hàng</em>
                  </MenuItem>
                  {selectOptions.customers.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  name="dienGiai"
                  id="dienGiai"
                  label="Diễn giải (*)"
                  value={formData.dienGiai}
                  onChange={onFormChange}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="tuyenDuongDi"
                  id="tuyenDuongDi"
                  label="Điểm đi (*)"
                  value={formData.tuyenDuongDi}
                  onChange={onFormChange}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="tuyenDuongDen"
                  id="tuyenDuongDen"
                  label="Điểm đến (cách nhau bởi dấu phẩy) (*)"
                  value={formData.tuyenDuongDen}
                  onChange={onFormChange}
                  variant="outlined"
                  size="small"
                  required
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  name="soLuongContainer"
                  id="soLuongContainer"
                  label="Số lượng container"
                  value={formData.soLuongContainer}
                  onChange={onFormChange}
                  InputProps={{ inputProps: { min: 0 } }}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  name="loaiContainerId"
                  id="loaiContainerId"
                  label="Loại container (*)"
                  value={formData.loaiContainerId}
                  onChange={onFormChange}
                  variant="outlined"
                  size="small"
                  required
                >
                  <MenuItem key="empty-container" value="">
                    <em>Chọn loại container</em>
                  </MenuItem>
                  {selectOptions.containerTypes.map(ct => (
                    <MenuItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  name="ngayHaHang"
                  id="ngayHaHang"
                  label="Ngày hạ hàng (Nếu có)"
                  value={formData.ngayHaHang}
                  onChange={onFormChange}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>

            <Box sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
                Thông tin vận chuyển
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    name="bienSoXeId"
                    id="bienSoXeId"
                    label="Biển số xe (*)"
                    value={formData.bienSoXeId}
                    onChange={onFormChange}
                    variant="outlined"
                    size="small"
                    required
                  >
                    <MenuItem key="empty-vehicle" value="">
                      <em>Chọn xe</em>
                    </MenuItem>
                    {selectOptions.vehicles.map(v => (
                      <MenuItem key={v.value} value={v.value}>
                        {v.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    name="cuocVanChuyen"
                    id="cuocVanChuyen"
                    label="Cước vận chuyển"
                    value={formData.cuocVanChuyen}
                    onChange={onFormChange}
                    InputProps={{ inputProps: { min: 0 } }}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
                Thuê vận chuyển (Nếu có)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    name="doiTacId"
                    id="doiTacId"
                    label="Đối tác vận chuyển"
                    value={formData.doiTacId}
                    onChange={onFormChange}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="">
                      <em>Chọn đối tác</em>
                    </MenuItem>
                    {selectOptions.partners.map(p => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    name="cuocThueVanChuyen"
                    id="cuocThueVanChuyen"
                    label="Cước thuê vận chuyển"
                    value={formData.cuocThueVanChuyen}
                    onChange={onFormChange}
                    InputProps={{ inputProps: { min: 0 } }}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
                Thông tin Container
              </Typography>
              {formData.thongTinContainer.map((cont, index) => (
                <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: index < formData.thongTinContainer.length - 1 ? 2 : 0 }}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      name="soContainer"
                      value={cont.soContainer}
                      onChange={e => onContainerFormChange(index, e)}
                      label={`Số container ${index + 1}`}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      name="soSeal"
                      value={cont.soSeal}
                      onChange={e => onContainerFormChange(index, e)}
                      label={`Số seal ${index + 1}`}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    {formData.thongTinContainer.length > 1 && (
                      <IconButton onClick={() => onRemoveContainerField(index)} color="error" size="small">
                        <RemoveIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              ))}
              <Button
                type="button"
                onClick={onAddContainerField}
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
              >
                Thêm container
              </Button>
            </Box>

            {editingPlan && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    select
                    name="trangThai"
                    id="trangThai"
                    label="Trạng thái"
                    value={formData.trangThai}
                    onChange={onFormChange}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="Lên lịch">Lên lịch</MenuItem>
                    <MenuItem value="Đang vận chuyển">Đang vận chuyển</MenuItem>
                    <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
                    <MenuItem value="Hủy">Hủy</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ py: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ textTransform: 'none' }}
          >
            {isLoading ? (editingPlan ? 'Đang sửa...' : 'Đang lưu...') : (editingPlan ? 'Sửa' : 'Lưu')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

DesktopShipmentFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  editingPlan: PropTypes.object, // Can be null if adding
  formData: PropTypes.object.isRequired,
  onFormChange: PropTypes.func.isRequired,
  onContainerFormChange: PropTypes.func.isRequired,
  onAddContainerField: PropTypes.func.isRequired,
  onRemoveContainerField: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  selectOptions: PropTypes.shape({
    customers: PropTypes.array.isRequired,
    containerTypes: PropTypes.array.isRequired,
    vehicles: PropTypes.array.isRequired,
    partners: PropTypes.array.isRequired,
  }).isRequired,
};

export default DesktopShipmentFormDialog;
