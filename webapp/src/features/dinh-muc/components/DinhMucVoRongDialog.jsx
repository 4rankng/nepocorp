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
  Autocomplete,
  Divider,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import logger from '@services/logger';

/**
 * A dialog component for adding/editing empty container transport fuel consumption norms
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Callback when dialog is closed
 * @param {Function} props.onSave - Callback when form is submitted
 * @param {Object} [props.initialData] - Initial form data when editing
 * @param {Array} [props.licensePlates=[]] - Available license plates for selection
 * @param {boolean} [props.isLoading=false] - Whether the form is in a loading state
 * @param {string} [props.title] - Custom dialog title
 */
const DinhMucVoRongDialog = ({
  open,
  onClose,
  onSave,
  initialData = null,
  licensePlates = [],
  isLoading = false,
  title = null,
}) => {
  const isEditMode = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    bienSoXe: '',
    fromKm: '',
    toKm: '',
    standard: '',
    ghiChu: '',
    ...initialData,
  });

  const [errors, setErrors] = useState({});
  const [plateInputValue, setPlateInputValue] = useState('');

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        bienSoXe: '',
        fromKm: '',
        toKm: '',
        standard: '',
        ghiChu: '',
        ...initialData,
      });
      setPlateInputValue(initialData.bienSoXe || '');
    } else {
      setFormData({
        bienSoXe: '',
        fromKm: '',
        toKm: '',
        standard: '',
        ghiChu: '',
      });
      setPlateInputValue('');
    }
    setErrors({});
  }, [initialData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Ensure numeric fields contain only numbers
    if ((name === 'fromKm' || name === 'toKm' || name === 'standard') && value !== '' && isNaN(value)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handlePlateChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      bienSoXe: newValue || '',
    }));

    if (errors.bienSoXe) {
      setErrors((prev) => ({
        ...prev,
        bienSoXe: '',
      }));
    }
  };

  const handlePlateInputChange = (event, newInputValue) => {
    setPlateInputValue(newInputValue);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.bienSoXe) {
      newErrors.bienSoXe = 'Vui lòng chọn biển số';
    }

    if (!formData.fromKm || isNaN(formData.fromKm) || formData.fromKm < 0) {
      newErrors.fromKm = 'Vui lòng nhập km bắt đầu hợp lệ';
    }

    if (!formData.toKm || isNaN(formData.toKm) || formData.toKm < 0) {
      newErrors.toKm = 'Vui lòng nhập km kết thúc hợp lệ';
    }

    if (parseFloat(formData.toKm) <= parseFloat(formData.fromKm)) {
      newErrors.toKm = 'Km kết thúc phải lớn hơn km bắt đầu';
    }

    if (!formData.standard || isNaN(formData.standard) || formData.standard <= 0) {
      newErrors.standard = 'Vui lòng nhập định mức hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSave({
        ...formData,
        fromKm: parseFloat(formData.fromKm),
        toKm: parseFloat(formData.toKm),
        standard: parseFloat(formData.standard),
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="dinh-muc-vo-rong-dialog-title"
    >
      <DialogTitle id="dinh-muc-vo-rong-dialog-title">
        <Box display="flex" alignItems="center">
          <InfoIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component="span">
            {title || (isEditMode ? 'Chỉnh sửa định mức vỏ rỗng' : 'Thêm định mức vỏ rỗng')}
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={licensePlates}
                value={formData.bienSoXe || ''}
                onChange={handlePlateChange}
                inputValue={plateInputValue}
                onInputChange={handlePlateInputChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Biển số"
                    error={!!errors.bienSoXe}
                    helperText={errors.bienSoXe}
                    required
                    fullWidth
                  />
                )}
                disabled={isLoading || isEditMode}
              />
            </Grid>

            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Từ km"
                    name="fromKm"
                    value={formData.fromKm || ''}
                    onChange={handleChange}
                    error={!!errors.fromKm}
                    helperText={errors.fromKm}
                    disabled={isLoading}
                    required
                    type="number"
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Đến km"
                    name="toKm"
                    value={formData.toKm || ''}
                    onChange={handleChange}
                    error={!!errors.toKm}
                    helperText={errors.toKm}
                    disabled={isLoading}
                    required
                    type="number"
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Định mức (lít/km)"
                name="standard"
                value={formData.standard || ''}
                onChange={handleChange}
                error={!!errors.standard}
                helperText={errors.standard}
                disabled={isLoading}
                required
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">lít/km</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ghi chú"
                name="ghiChu"
                value={formData.ghiChu || ''}
                onChange={handleChange}
                margin="normal"
                disabled={isLoading}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

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

export default DinhMucVoRongDialog;
