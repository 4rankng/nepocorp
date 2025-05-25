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
  type: '',
  description: '',
};

const ContainerTypeForm = ({
  open,
  onClose,
  onSave,
  containerType = null,
  isLoading = false,
  error = '',
}) => {
  const [formData, setFormData] = useState(initialFormState);
  const [localError, setLocalError] = useState('');

  // Reset form when dialog opens/closes or container type changes
  useEffect(() => {
    if (open) {
      if (containerType) {
        setFormData({
          type: containerType.type || '',
          description: containerType.description || '',
        });
      } else {
        setFormData(initialFormState);
      }
      setLocalError('');
    }
  }, [open, containerType]);

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
    if (!formData.type.trim()) {
      setLocalError('Loại container không được để trống.');
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
              label="Loại container"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              placeholder="Ví dụ: 20'DC"
              fullWidth
              size="small"
              required
              margin="normal"
              error={localError.includes('Loại container')}
            />
            <TextField
              label="Mô tả (tùy chọn)"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Ví dụ: Container khô 20 feet tiêu chuẩn"
              fullWidth
              size="small"
              margin="normal"
              multiline
              rows={3}
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
            disabled={isLoading || !formData.type.trim()}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {containerType ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ContainerTypeForm;
