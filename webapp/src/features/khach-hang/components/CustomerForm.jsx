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
  tax_code: '',
};
const CustomerForm = ({
  open,
  onClose,
  onSave,
  customer = null,
  getInitialFormData = () => ({}),
  isLoading = false,
  error = '',
}) => {
  const [formData, setFormData] = useState(initialFormState);
  const [localError, setLocalError] = useState('');
  // Reset form when dialog opens/closes or customer changes
  useEffect(() => {
    if (open) {
      if (customer) {
        setFormData({
          name: customer.name || '',
          address: customer.address || '',
          tax_code: customer.tax_code || '',
        });
      } else {
        // Get initial form data with generated code
        const initialData = {
          ...initialFormState,
          ...getInitialFormData(),
        };
        setFormData(initialData);
      }
      setLocalError('');
    }
  }, [open, customer, getInitialFormData]);
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear local error when user starts typing
    if (localError) setLocalError('');
  };
  const handleSubmit = e => {
    e.preventDefault();
    // Basic validation
    if (!formData.name || formData.name.trim() === '') {
      setLocalError('Vui lòng nhập tên khách hàng');
      return;
    }
    // Validate tax code if provided
    if (formData.tax_code && formData.tax_code.trim() !== '') {
      const taxCodeRegex = /^\d{10,13}$/; // Vietnamese tax code format
      if (!taxCodeRegex.test(formData.tax_code.trim())) {
        setLocalError('Mã số thuế phải có từ 10-13 chữ số');
        return;
      }
    }
    // If we have a code validation error, don't submit
    if (localError) {
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            {' '}
            {/* Reduced gap for tighter packing */}
            <TextField
              label="Mã số thuế"
              name="tax_code"
              value={formData.tax_code}
              onChange={handleInputChange}
              placeholder="VD: 5500157123"
              fullWidth
              size="small"
              margin="dense"
              inputProps={{
                pattern: '^\\d{10,13}$',
                title: 'Mã số thuế phải có từ 10-13 chữ số',
              }}
              helperText="Mã số thuế (10-13 chữ số)"
            />
            <TextField
              label="Tên khách hàng"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ví dụ: Công ty Cổ phần ABC"
              fullWidth
              size="small"
              required
              margin="dense"
              error={localError.includes('Tên khách hàng')}
            />
            <TextField
              label="Địa chỉ"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Ví dụ: 123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh"
              fullWidth
              size="small"
              margin="dense"
              multiline
              rows={2}
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
            {customer ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
export default CustomerForm;
