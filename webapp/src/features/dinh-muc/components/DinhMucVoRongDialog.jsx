import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const DinhMucVoRongDialog = ({
  open,
  isEdit,
  isMobile,
  formData,
  errors,
  onClose,
  onSave,
  onInputChange,
  onValidateForm,
  licensePlate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safety check to prevent rendering with undefined formData
  if (!formData) {
    return null;
  }

  const handleInternalSave = async () => {
    if (onValidateForm && !onValidateForm()) {
      return; // Validation failed
    }
    setIsSubmitting(true);
    try {
      await onSave();
    } catch (error) {

    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiPaper-root': {
          width: '100%',
          maxWidth: { xs: '100%', sm: '600px' },
          borderRadius: { xs: 0, sm: 2 },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2,
        }}
      >
        <Typography variant="h6" component="h2">
          {isEdit ? 'Sửa định mức vỏ rỗng' : 'Thêm định mức vỏ rỗng'}
          {licensePlate && ` ${licensePlate}`}
        </Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                required
                label="Từ (Km)"
                name="fromKm"
                type="number"
                value={formData.fromKm}
                onChange={e => onInputChange(e.target.name, e.target.value)}
                error={!!errors.fromKm}
                helperText={errors.fromKm}
                InputProps={{
                  endAdornment: <InputAdornment position="end">km</InputAdornment>,
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                required
                label="Đến (Km)"
                name="toKm"
                type="number"
                value={formData.toKm}
                onChange={e => onInputChange(e.target.name, e.target.value)}
                error={!!errors.toKm}
                helperText={errors.toKm}
                InputProps={{
                  endAdornment: <InputAdornment position="end">km</InputAdornment>,
                }}
              />
            </Box>
          </Box>
          <Box>
            <TextField
              fullWidth
              required
              label="Định mức tiêu thụ"
              name="standard"
              type="number"
              value={formData.standard}
              onChange={e => onInputChange(e.target.name, e.target.value)}
              error={!!errors.standard}
              helperText={errors.standard}
              InputProps={{
                endAdornment: <InputAdornment position="end">l/km</InputAdornment>,
              }}
            />
          </Box>
          <Box>
            <TextField
              fullWidth
              label="Ghi chú"
              name="note"
              multiline
              rows={3}
              value={formData.note || ''}
              onChange={e => onInputChange(e.target.name, e.target.value)}
              placeholder="Nhập ghi chú về định mức (nếu có)"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between',
        }}
      >
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Hủy
        </Button>
        <Button
          onClick={handleInternalSave}
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting && <CircularProgress size={20} color="inherit" />}
        >
          {isSubmitting ? 'Đang lưu...' : isEdit ? 'Sửa' : 'Thêm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DinhMucVoRongDialog;
