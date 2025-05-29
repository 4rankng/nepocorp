import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
const ContainerDeleteDialog = ({ open, data, onClose, onDelete, isLoading }) => (
  <Dialog
    open={open}
    onClose={onClose}
    onKeyDown={e => e.key === 'Escape' && onClose()}
    aria-labelledby="delete-container-dialog"
  >
    <DialogTitle id="delete-container-dialog">Xác nhận xóa</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Bạn có chắc chắn muốn xóa container {data?.phan_loai || 'này'}?
      </DialogContentText>
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
export default ContainerDeleteDialog;
