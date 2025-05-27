import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Box,
} from '@mui/material';

const VehicleDialog = ({
  open,
  title,
  fields = [],
  onClose,
  onSave,
  isLoading = false,
  saveLabel = 'Lưu',
  cancelLabel = 'Hủy',
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {fields.map(field => (
            <TextField
              key={field.name}
              label={field.label}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              fullWidth
              margin="normal"
              autoFocus={field.autoFocus}
              type={field.type || 'text'}
              disabled={field.disabled}
              error={!!field.error}
              helperText={field.helperText}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          color="primary"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {isLoading ? 'Đang lưu...' : saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VehicleDialog;
