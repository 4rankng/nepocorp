import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';

const TrailerDeleteDialog = ({ open, data, onClose, onDelete, isLoading }) => (
  <Dialog
    open={open}
    onClose={onClose}
    onKeyDown={e => e.key === 'Escape' && onClose()}
    aria-labelledby="delete-trailer-dialog"
  >
    <DialogTitle id="delete-trailer-dialog">Xác nhận xóa</DialogTitle>
    <DialogContent>
      <DialogContentText>Bạn có chắc chắn muốn xóa rơ-mooc sau đây?</DialogContentText>
      <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Thông tin rơ-mooc:
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
          <Typography variant="body2">Biển số:</Typography>
          <Typography variant="body2" fontWeight="medium">
            {data?.bien_so || '-'}
          </Typography>
          <Typography variant="body2">Mô tả:</Typography>
          <Typography variant="body2" fontWeight="medium">
            {data?.mo_ta || 'Không có'}
          </Typography>
        </Box>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary" disabled={isLoading}>
        Hủy
      </Button>
      <Button onClick={onDelete} color="error" variant="contained" autoFocus disabled={isLoading}>
        Xóa
      </Button>
    </DialogActions>
  </Dialog>
);

export default TrailerDeleteDialog;
