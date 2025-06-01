import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  CircularProgress,
  Box,
} from '@mui/material';

/**
 * A dialog component for adding/editing dinh muc bo sung records
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Callback when dialog is closed
 * @param {Object} props.formData - Form data object
 * @param {Function} props.setFormData - Function to update form data
 * @param {Object} props.formErrors - Form validation errors
 * @param {boolean} props.isSubmitting - Whether the form is being submitted
 * @param {boolean} props.editingRecord - Whether editing an existing record
 * @param {Array} props.dauKeoList - List of dau keo for the bien so dropdown
 * @param {Array} props.tuyenDuongList - List of tuyen duong for the ma tuyen dropdown
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @returns {JSX.Element} The rendered component
 */
const AddEditDinhMucBoSung = ({
  open,
  onClose,
  formData,
  setFormData,
  formErrors,
  isSubmitting,
  editingRecord,
  dauKeoList = [],
  tuyenDuongList = [],
  onSubmit,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingRecord ? 'Sửa định mức bổ sung' : 'Thêm định mức bổ sung'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Biển số */}
          <FormControl fullWidth error={!!formErrors.bien_so}>
            <InputLabel>Biển số xe (để trống để áp dụng cho tất cả)</InputLabel>
            <Select
              value={formData.bien_so}
              onChange={e => setFormData(prev => ({ ...prev, bien_so: e.target.value }))}
              label="Biển số xe (để trống để áp dụng cho tất cả)"
            >
              <MenuItem value="">
                <em>Áp dụng cho tất cả (*)</em>
              </MenuItem>
              {dauKeoList.map(dauKeo => (
                <MenuItem key={dauKeo.id} value={dauKeo.bien_so}>
                  {dauKeo.bien_so} - {dauKeo.mo_ta}
                </MenuItem>
              ))}
            </Select>
            {formErrors.bien_so && <FormHelperText>{formErrors.bien_so}</FormHelperText>}
          </FormControl>

          {/* Mã tuyến */}
          <FormControl fullWidth error={!!formErrors.ma_tuyen}>
            <InputLabel>Mã tuyến (để trống để áp dụng cho tất cả)</InputLabel>
            <Select
              value={formData.ma_tuyen}
              onChange={e => setFormData(prev => ({ ...prev, ma_tuyen: e.target.value }))}
              label="Mã tuyến (để trống để áp dụng cho tất cả)"
            >
              <MenuItem value="">
                <em>Áp dụng cho tất cả (*)</em>
              </MenuItem>
              {tuyenDuongList.map(tuyen => (
                <MenuItem key={tuyen.id} value={tuyen.ma_so}>
                  {tuyen.ma_so} - {tuyen.diem_di} → {tuyen.diem_den}
                </MenuItem>
              ))}
            </Select>
            {formErrors.ma_tuyen && <FormHelperText>{formErrors.ma_tuyen}</FormHelperText>}
          </FormControl>

          {/* Định mức */}
          <TextField
            label="Định mức"
            type="number"
            value={formData.dinh_muc_l}
            onChange={e => setFormData(prev => ({ ...prev, dinh_muc_l: e.target.value }))}
            error={!!formErrors.dinh_muc_l}
            helperText={formErrors.dinh_muc_l}
            InputProps={{
              endAdornment: <InputAdornment position="end">lít</InputAdornment>,
              inputProps: { min: 0, step: 0.1 },
            }}
            fullWidth
            required
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={onSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : editingRecord ? 'Cập nhật' : 'Thêm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEditDinhMucBoSung;
