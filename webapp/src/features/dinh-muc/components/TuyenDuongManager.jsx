import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Divider,
  Typography,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import logger from '@services/logger';

const TuyenDuongManager = ({
  open,
  onClose,
  onSave,
  tuyenDuongList = [],
  initialData = null,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = React.useState({
    diem_di: '',
    diem_den: '',
  });
  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        diem_di: initialData.diem_di || '',
        diem_den: initialData.diem_den || '',
      });
    } else {
      setFormData({
        diem_di: '',
        diem_den: '',
      });
    }
    setErrors({});
  }, [initialData, open]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.diem_di.trim()) {
      newErrors.diem_di = 'Vui lòng nhập điểm đi';
    }

    if (!formData.diem_den.trim()) {
      newErrors.diem_den = 'Vui lòng nhập điểm đến';
    }

    // Check for duplicate tuyen duong
    const isDuplicate = tuyenDuongList.some(
      tuyen =>
        tuyen.diem_di.toLowerCase() === formData.diem_di.toLowerCase().trim() &&
        tuyen.diem_den.toLowerCase() === formData.diem_den.toLowerCase().trim() &&
        (!initialData || tuyen.ma_so !== initialData.ma_so)
    );

    if (isDuplicate) {
      newErrors.general = 'Tuyến đường đã tồn tại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave({
        ...formData,
        diem_di: formData.diem_di.trim(),
        diem_den: formData.diem_den.trim(),
      });
    }
  };

  const handleChange = field => e => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));

    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {initialData ? 'Sửa tuyến đường' : 'Thêm tuyến đường mới'}
          <IconButton edge="end" onClick={onClose} disabled={isSubmitting}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errors.general && (
            <Typography color="error" variant="body2">
              {errors.general}
            </Typography>
          )}

          <TextField
            label="Điểm đi"
            value={formData.diem_di}
            onChange={handleChange('diem_di')}
            error={!!errors.diem_di}
            helperText={errors.diem_di}
            fullWidth
            size="small"
            disabled={isSubmitting}
          />

          <TextField
            label="Điểm đến"
            value={formData.diem_den}
            onChange={handleChange('diem_den')}
            error={!!errors.diem_den}
            helperText={errors.diem_den}
            fullWidth
            size="small"
            disabled={isSubmitting}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : ''}
        >
          {isSubmitting ? 'Đang lưu...' : 'Thêm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TuyenDuongManager;
