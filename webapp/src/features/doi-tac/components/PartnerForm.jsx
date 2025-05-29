import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
const initialFormState = {
  ma_dinh_danh: '',
  ten: '',
  dia_chi: '',
  ma_so_thue: '',
};
const PartnerForm = ({
  open,
  onClose,
  onSave,
  partner = null,
  onGetInitialData = null,
  isLoading = false,
  error = '',
}) => {
  const [formData, setFormData] = useState(initialFormState);
  const [localError, setLocalError] = useState('');
  // Reset form when dialog opens/closes or partner changes
  useEffect(() => {
    if (open) {
      if (partner) {
        setFormData({
          ma_dinh_danh: partner.ma_dinh_danh || '',
          ten: partner.ten || '',
          dia_chi: partner.dia_chi || '',
          ma_so_thue: partner.ma_so_thue || '',
        });
      } else {
        // If onGetInitialData is provided, use it to get initial data
        // Otherwise, use the default initial form state
        const initialData = onGetInitialData ? onGetInitialData() : initialFormState;
        setFormData(initialData);
      }
      setLocalError('');
    }
  }, [open, partner, onGetInitialData]);
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear local error when user starts typing
    if (localError) setLocalError('');
  };
  const handleSubmit = e => {
    e.preventDefault();
    setLocalError('');
    // Validation
    if (!formData.ten.trim()) {
      setLocalError('Tên đối tác không được để trống.');
      return;
    }
    // Validate partner code format
    if (!formData.ma_dinh_danh || formData.ma_dinh_danh.trim() === '') {
      setLocalError('Vui lòng nhập mã đối tác.');
      return;
    }
    const codeRegex = /^DT\d{3,}$/i;
    if (!codeRegex.test(formData.ma_dinh_danh.trim())) {
      setLocalError('Mã đối tác phải có định dạng DT001, DT002, ...');
      return;
    }
    // Call the onSave function with form data
    onSave({
      ...formData,
      ma_dinh_danh: formData.ma_dinh_danh.trim().toUpperCase(),
    });
  };
  const handleClose = () => {
    setFormData(initialFormState);
    setLocalError('');
    onClose();
  };
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Mã đối tác"
              name="ma_dinh_danh"
              value={formData.ma_dinh_danh}
              onChange={handleInputChange}
              placeholder="VD: DT001"
              fullWidth
              size="small"
              margin="normal"
              disabled={!!partner} // Disable editing code for existing partners
              required
              inputProps={{
                pattern: '^DT\\d{3,}$',
                title: 'Mã đối tác phải bắt đầu bằng DT và ít nhất 3 chữ số',
              }}
              helperText="Nhập mã đối tác (VD: DT001)"
            />
            <TextField
              label="Tên đối tác"
              name="ten"
              value={formData.ten}
              onChange={handleInputChange}
              placeholder="Ví dụ: Công ty Cổ phần Vận tải ABC"
              fullWidth
              size="small"
              required
              margin="normal"
              error={localError.includes('Tên đối tác')}
            />
            <TextField
              label="Địa chỉ"
              name="dia_chi"
              value={formData.dia_chi}
              onChange={handleInputChange}
              placeholder="Ví dụ: 123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh"
              fullWidth
              size="small"
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              label="Mã số thuế"
              name="ma_so_thue"
              value={formData.ma_so_thue}
              onChange={handleInputChange}
              placeholder="Ví dụ: 0300584870"
              fullWidth
              size="small"
              margin="normal"
            />
            {(error || localError) && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error || localError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleClose} color="inherit" disabled={isLoading}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !formData.ten.trim()}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {partner ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
export default PartnerForm;
