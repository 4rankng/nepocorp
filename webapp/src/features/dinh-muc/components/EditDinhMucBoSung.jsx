import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import logger from '@services/logger';

/**
 * A dialog component for adding/editing dinh muc bo sung records
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Callback when dialog is closed
 * @param {Object} props.formData - Form data object
 * @param {Function} props.setFormData - Function to update form data
 * @param {Object} props.formErrors - Form validation errors
 * @param {boolean} props.isSubmitting - Whether the form is being submitted
 * @param {Array} props.dauKeoList - List of dau keo for the bien so dropdown
 * @param {Array} props.tuyenDuongList - List of tuyen duong for the ma tuyen dropdown
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @returns {JSX.Element} The rendered component
 */
const EditDinhMucBoSung = ({
  open,
  onClose,
  formData,
  setFormData,
  formErrors,
  isSubmitting,
  dauKeoList = [],
  onSubmit,
}) => {

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle change for number inputs to ensure they're parsed as numbers
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value ? parseFloat(value) : null
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sửa định mức bổ sung</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Biển số */}
          <Box>
            <TextField
              select
              fullWidth
              size="small"
              label="Biển số"
              name="bien_so"
              value={formData.bien_so || ''}
              onChange={handleChange}
              error={!!formErrors.bien_so}
              helperText={formErrors.bien_so}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                },
              }}
            >
              <option value="">Tất cả</option>
              {dauKeoList.map((item) => {
                const value = typeof item === 'object' ? item.bien_so : item;
                const label = typeof item === 'object' ? item.bien_so : item;
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </TextField>
          </Box>

          {/* Điểm đi */}
          <Box>
            <TextField
              fullWidth
              size="small"
              label="Điểm đi"
              name="diem_di"
              value={formData.diem_di || ''}
              onChange={handleChange}
              error={!!formErrors.diem_di}
              helperText={formErrors.diem_di}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>

          {/* Điểm đến */}
          <Box>
            <TextField
              fullWidth
              size="small"
              label="Điểm đến"
              name="diem_den"
              value={formData.diem_den || ''}
              onChange={handleChange}
              error={!!formErrors.diem_den}
              helperText={formErrors.diem_den}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>

          {/* Định mức */}
          <Box>
            <TextField
              fullWidth
              size="small"
              label="Định mức (lít)"
              name="dinh_muc_l"
              type="number"
              value={formData.dinh_muc_l || ''}
              onChange={handleNumberChange}
              error={!!formErrors.dinh_muc_l}
              helperText={formErrors.dinh_muc_l}
              InputProps={{
                endAdornment: <InputAdornment position="end">lít</InputAdornment>,
                sx: {
                  '& input': {
                    textAlign: 'right',
                    padding: '8.5px 14px',
                  },
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={onSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : 'Sửa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDinhMucBoSung;
