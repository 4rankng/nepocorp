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
  Grid,
  Autocomplete,
} from '@mui/material';
import logger from '../../../services/logger';

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
  const [tuyenDuongOptions, setTuyenDuongOptions] = React.useState([]);

  React.useEffect(() => {
    try {
      // Process tuyen duong list to extract unique diem di and diem den
      const diemDiOptions = [];
      const diemDenOptions = [];

      tuyenDuongList.forEach(tuyen => {
        if (tuyen.diem_di && !diemDiOptions.includes(tuyen.diem_di)) {
          diemDiOptions.push(tuyen.diem_di);
        }
        if (tuyen.diem_den && !diemDenOptions.includes(tuyen.diem_den)) {
          diemDenOptions.push(tuyen.diem_den);
        }
      });

      setTuyenDuongOptions({
        diemDi: diemDiOptions.sort(),
        diemDen: diemDenOptions.sort()
      });
    } catch (error) {
      logger.error('Error processing tuyen duong options:', error);
    }
  }, [tuyenDuongList]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingRecord ? 'Sửa định mức bổ sung' : 'Thêm định mức bổ sung'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Biển số */}
          <Box sx={{ width: '100%', mb: 2 }}>
            <Autocomplete
              value={formData.bien_so || ''}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, bien_so: newValue || '' }))}
              options={['', ...dauKeoList.map(dauKeo => dauKeo.bien_so)]}
              getOptionLabel={(option) => option === '' ? 'Tất cả' : option}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Biển số đầu kéo"
                  variant="outlined"
                  error={!!formErrors.bien_so}
                  helperText={formErrors.bien_so}
                  fullWidth
                />
              )}
              fullWidth
            />
          </Box>

          {/* Điểm đi */}
          <Box sx={{ width: '100%', mb: 2 }}>
            <Autocomplete
              value={formData.diem_di || ''}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, diem_di: newValue || '' }))}
              options={['', ...(tuyenDuongOptions.diemDi || [])]}
              getOptionLabel={(option) => option || 'Tất cả'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Điểm đi"
                  variant="outlined"
                  error={!!formErrors.diem_di}
                  helperText={formErrors.diem_di}
                  fullWidth
                />
              )}
              fullWidth
            />
          </Box>

          {/* Điểm đến */}
          <Box sx={{ width: '100%', mb: 2 }}>
            <Autocomplete
              value={formData.diem_den || ''}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, diem_den: newValue || '' }))}
              options={['', ...(tuyenDuongOptions.diemDen || [])]}
              getOptionLabel={(option) => option || 'Tất cả'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Điểm đến"
                  variant="outlined"
                  error={!!formErrors.diem_den}
                  helperText={formErrors.diem_den}
                  fullWidth
                />
              )}
              fullWidth
            />
          </Box>

          {/* Định mức */}
          <TextField
            label="Định mức nhiên liệu (lít) *"
            type="number"
            value={formData.dinh_muc_l}
            onChange={e => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0) {
                setFormData(prev => ({ ...prev, dinh_muc_l: value }));
              } else if (e.target.value === '') {
                setFormData(prev => ({ ...prev, dinh_muc_l: '' }));
              }
            }}
            error={!!formErrors.dinh_muc_l}
            helperText={formErrors.dinh_muc_l || 'Nhập định mức nhiên liệu tính bằng lít'}
            InputProps={{
              endAdornment: <InputAdornment position="end">lít</InputAdornment>,
              inputProps: { 
                min: 0, 
                step: 0.1,
                pattern: '^\\d*\\.?\\d*$' // Only allow numbers and decimal point
              },
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
