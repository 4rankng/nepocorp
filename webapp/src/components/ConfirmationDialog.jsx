import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box,
  Typography,
  Divider,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

const ConfirmationDialog = ({
  open,
  title = 'Xác nhận xóa',
  message = 'Bạn có chắc chắn muốn xóa mục này?',
  details = null,
  onConfirm,
  onCancel,
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  confirmColor = 'error',
}) => {
  const isLoading = false; // This can be passed as a prop if needed
  const loading = false; // For the delete operation

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogContent>
        <DialogContentText component="div" id="alert-dialog-description" sx={{ mb: 2 }}>
          {message}
        </DialogContentText>

        {details && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <InfoIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="subtitle2">Thông tin chi tiết</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            {Object.entries(details).map(([key, value]) => (
              <Box key={key} display="flex" mb={1}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ minWidth: 120, fontWeight: 'medium' }}
                >
                  {key}:
                </Typography>
                <Typography variant="body2">
                  {value !== null && value !== undefined ? value.toString() : 'N/A'}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit" disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          autoFocus
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          disabled={loading}
        >
          {loading ? 'Đang xử lý...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
