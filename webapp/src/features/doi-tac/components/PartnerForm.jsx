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
  name: '',
  address: '',
  taxCode: '',
};

const PartnerForm = ({
  open,
  onClose,
  onSave,
  partner = null,
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
          name: partner.name || '',
          address: partner.address || '',
          taxCode: partner.taxCode || '',
        });
      } else {
        setFormData(initialFormState);
      }
      setLocalError('');
    }
  }, [open, partner]);

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
    if (!formData.name.trim()) {
      setLocalError('Tên đối tác không được để trống.');
      return;
    }

    // Call the onSave function with form data
    onSave(formData);
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
              label="Tên đối tác"
              name="name"
              value={formData.name}
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
              name="address"
              value={formData.address}
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
              name="taxCode"
              value={formData.taxCode}
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
            disabled={isLoading || !formData.name.trim()}
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
