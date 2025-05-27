import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  IconButton,
  Chip,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const DinhMucDialog = ({
  open,
  isEdit,
  isMobile,
  formData,
  errors,
  onClose,
  onSave,
  onInputChange,
  onValidateForm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInternalSave = async () => {
    if (onValidateForm && !onValidateForm()) {
      return; // Validation failed
    }
    setIsSubmitting(true);
    try {
      await onSave();
    } catch (error) {
      console.error("Error saving Dinh Muc:", error);
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
          maxWidth: isMobile ? 'none' : '480px',
          borderRadius: isMobile ? 0 : '8px',
          boxShadow: isMobile ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          margin: isMobile ? 0 : '16px',
          height: isMobile ? '100vh' : 'auto',
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)',
        },
      }}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <DialogContent
        sx={{
          p: isMobile ? '24px 16px 16px' : '32px 24px 24px',
          flex: isMobile ? 1 : 'none',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: isMobile ? 8 : 16,
            top: isMobile ? 8 : 16,
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'action.hover',
              color: 'text.primary',
            },
          }}
        >
          <CloseIcon fontSize={isMobile ? 'medium' : 'small'} />
        </IconButton>

        <Box sx={{ mb: 3, pr: 5 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: isMobile ? '1.25rem' : '1.1rem',
              fontWeight: 600,
              color: 'primary.main',
              mb: 1,
            }}
          >
            {isEdit
              ? `Sửa Định Mức ${formData.loaiDinhMuc === 'km_hang' ? 'Hàng' : 'Vỏ'}`
              : isMobile
                ? `Thêm Định Mức ${formData.loaiDinhMuc === 'km_hang' ? 'Hàng' : 'Vỏ'}`
                : 'Thêm Định Mức'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Biển số xe:
            </Typography>
            <Chip
              label={formData.bienSoXe}
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 500,
                borderColor: 'primary.main',
                color: 'primary.main',
              }}
            />
          </Box>
        </Box>

        <Box component="form" noValidate autoComplete="off" sx={{ '& > :not(style)': { mb: 2 } }}>
          <Grid container spacing={isMobile ? 3 : 2}>
            {!isEdit && !isMobile && (
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: 'text.secondary', fontWeight: 500, fontSize: isMobile ? '0.9rem' : '0.8rem' }}
                >
                  Loại định mức
                </Typography>
                <Box component="div" sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                  <Box
                    component="div"
                    onClick={() => onInputChange({ target: { name: 'loaiDinhMuc', value: 'km_hang' } })}
                    sx={{
                      flex: 1, py: 1, px: 2.5, height: '40px', minWidth: '160px',
                      border: formData.loaiDinhMuc === 'km_hang' ? '2px solid' : '1px solid',
                      borderColor: formData.loaiDinhMuc === 'km_hang' ? 'primary.main' : 'divider',
                      borderRadius: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Typography variant="body2" align="center" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Định Mức Hàng
                    </Typography>
                  </Box>
                  <Box
                    component="div"
                    onClick={() => onInputChange({ target: { name: 'loaiDinhMuc', value: 'km_vo' } })}
                    sx={{
                      flex: 1, py: 1, px: 2.5, height: '40px', minWidth: '160px',
                      border: formData.loaiDinhMuc === 'km_vo' ? '2px solid' : '1px solid',
                      borderColor: formData.loaiDinhMuc === 'km_vo' ? 'primary.main' : 'divider',
                      borderRadius: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Typography variant="body2" align="center" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Định Mức Vỏ
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: 'text.secondary', fontWeight: 500, fontSize: isMobile ? '0.9rem' : '0.8rem' }}
              >
                Phạm vi số km
              </Typography>
              <Grid container spacing={2} sx={{ mb: 1, display: 'flex', flexWrap: 'nowrap' }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size={isMobile ? 'medium' : 'small'} label="Từ km" name="fromKm" type="number"
                    value={formData.fromKm} onChange={onInputChange} onBlur={onValidateForm}
                    error={!!errors.fromKm} helperText={errors.fromKm || ''}
                    variant="outlined" margin="none" InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 0, step: 1, style: { textAlign: 'right', height: isMobile ? '48px' : '40px', padding: isMobile ? '12px 14px' : '8px 12px', boxSizing: 'border-box', fontSize: '0.875rem' } }}
                    InputProps={{ endAdornment: (<InputAdornment position="end" sx={{ color: 'text.secondary' }}>km</InputAdornment>), sx: { borderRadius: '6px', backgroundColor: 'background.paper', fontSize: '0.875rem' } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth size={isMobile ? 'medium' : 'small'} label="Đến km" name="toKm" type="number"
                    value={formData.toKm} onChange={onInputChange} onBlur={onValidateForm}
                    error={!!errors.toKm} helperText={errors.toKm || ''}
                    variant="outlined" margin="none" InputLabelProps={{ shrink: true }}
                    inputProps={{ min: 0, step: 1, style: { textAlign: 'right', height: isMobile ? '48px' : '40px', padding: isMobile ? '12px 14px' : '8px 12px', boxSizing: 'border-box', fontSize: '0.875rem' } }}
                    InputProps={{ endAdornment: (<InputAdornment position="end" sx={{ color: 'text.secondary' }}>km</InputAdornment>), sx: { borderRadius: '6px', backgroundColor: 'background.paper', fontSize: '0.875rem' } }}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: 'text.secondary', fontWeight: 500, fontSize: isMobile ? '0.9rem' : '0.8rem' }}
              >
                Định mức (lít/100km)
              </Typography>
              <TextField
                fullWidth size={isMobile ? 'medium' : 'small'} label="Định mức" name="value" type="number"
                value={formData.value} onChange={onInputChange} onBlur={onValidateForm}
                error={!!errors.value} helperText={errors.value || ''}
                variant="outlined" margin="none" InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right', height: isMobile ? '48px' : '40px', padding: isMobile ? '12px 14px' : '8px 12px', boxSizing: 'border-box', fontSize: '0.875rem' } }}
                InputProps={{ endAdornment: (<InputAdornment position="end" sx={{ color: 'text.secondary' }}>lít/100km</InputAdornment>), sx: { borderRadius: '6px', backgroundColor: 'background.paper', fontSize: '0.875rem' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: 'text.secondary', fontWeight: 500, fontSize: isMobile ? '0.9rem' : '0.8rem' }}
              >
                Ghi chú (tùy chọn)
              </Typography>
              <TextField
                fullWidth multiline rows={isMobile ? 3 : 2} size={isMobile ? 'medium' : 'small'}
                label="Ghi chú" name="ghiChu" value={formData.ghiChu} onChange={onInputChange}
                variant="outlined" margin="none" InputLabelProps={{ shrink: true }}
                inputProps={{ style: { fontSize: '0.875rem', lineHeight: 1.5 } }}
                sx={{ borderRadius: '6px', backgroundColor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: '6px', padding: isMobile ? '12px 14px' : '8px 12px' } }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: isMobile ? '16px' : '16px 24px 24px', backgroundColor: isMobile ? 'background.default' : 'transparent' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="secondary"
          sx={{
            borderColor: 'grey.400', color: 'text.primary',
            '&:hover': { borderColor: 'grey.500', backgroundColor: 'action.hover' },
            minWidth: isMobile ? '100px' : '120px', height: isMobile ? '40px' : '36px',
            fontSize: isMobile ? '0.9rem' : '0.875rem',
          }}
          disabled={isSubmitting}
        >
          Hủy
        </Button>
        <Button
          onClick={handleInternalSave}
          variant="contained"
          color="primary"
          disabled={isSubmitting || Object.keys(errors).some(key => !!errors[key])}
          sx={{
            minWidth: isMobile ? '100px' : '120px', height: isMobile ? '40px' : '36px',
            fontSize: isMobile ? '0.9rem' : '0.875rem',
            '&.Mui-disabled': { backgroundColor: 'action.disabledBackground', color: 'action.disabled' },
          }}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSubmitting ? (isEdit ? 'Đang lưu...' : 'Đang thêm...') : (isEdit ? 'Lưu thay đổi' : 'Thêm mới')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DinhMucDialog;
