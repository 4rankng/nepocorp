import React, { useState, useEffect } from 'react';
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
  Typography,
  Tooltip,
  IconButton,
  Paper,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import logger from '@services/logger';

/**
 * A dialog component for adding/editing dinh muc cho hang (cargo transport norms) records
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Callback when dialog is closed
 * @param {Function} props.onSave - Callback when form is submitted
 * @param {Object} [props.initialData] - Initial form data when editing
 * @param {boolean} [props.isLoading=false] - Whether the form is in a loading state
 * @param {string} [props.title] - Custom dialog title
 */
const DinhMucChoHangDialog = ({
  open,
  onClose,
  onSave,
  initialData = null,
  isLoading = false,
  title = null,
}) => {
  const isEditMode = Boolean(initialData?.id);
  const [formData, setFormData] = useState({
    bien_so: '',
    dinh_muc: '',
    ghi_chu: '',
    ...initialData,
  });
  const [errors, setErrors] = useState({});

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        bien_so: '',
        dinh_muc: '',
        ghi_chu: '',
        ...initialData,
      });
    } else {
      setFormData({
        bien_so: '',
        dinh_muc: '',
        ghi_chu: '',
      });
    }
    setErrors({});
  }, [initialData, open]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.bien_so) {
      newErrors.bien_so = 'Vui lòng nhập biển số';
    }

    if (!formData.dinh_muc || isNaN(formData.dinh_muc) || formData.dinh_muc <= 0) {
      newErrors.dinh_muc = 'Vui lòng nhập định mức hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = e => {
    e.preventDefault();

    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="dinh-muc-cho-hang-dialog-title"
    >
      <DialogTitle id="dinh-muc-cho-hang-dialog-title">
        {title || (isEditMode ? 'Chỉnh sửa định mức chở hàng' : 'Thêm định mức chở hàng')}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Biển số"
                name="bien_so"
                value={formData.bien_so || ''}
                onChange={handleChange}
                error={!!errors.bien_so}
                helperText={errors.bien_so}
                margin="normal"
                disabled={isLoading}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Định mức (lít/km)"
                name="dinh_muc"
                type="number"
                value={formData.dinh_muc || ''}
                onChange={handleChange}
                error={!!errors.dinh_muc}
                helperText={errors.dinh_muc}
                margin="normal"
                disabled={isLoading}
                required
                InputProps={{
                  endAdornment: <InputAdornment position="end">lít/km</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ghi chú"
                name="ghi_chu"
                value={formData.ghi_chu || ''}
                onChange={handleChange}
                margin="normal"
                disabled={isLoading}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isEditMode ? 'Sửa' : 'Thêm'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DinhMucChoHangDialog;
