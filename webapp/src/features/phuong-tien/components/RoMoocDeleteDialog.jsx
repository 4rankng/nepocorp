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
import TrailerIcon from '@mui/icons-material/RvHookup';

const RoMoocDeleteDialog = ({ open, data, onClose, onConfirm, isLoading }) => (
  <Dialog
    open={open}
    onClose={onClose}
    onKeyDown={e => e.key === 'Escape' && onClose()}
    aria-labelledby="delete-romooc-dialog"
  >
    <DialogTitle id="delete-romooc-dialog" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TrailerIcon color="error" />
      Xác nhận xóa rơ-mooc
    </DialogTitle>
    <DialogContent>
      <DialogContentText>
        Bạn có chắc chắn muốn xóa rơ-mooc sau đây? Hành động này không thể hoàn tác.
      </DialogContentText>
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'error.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'error.200',
        }}
      >
        <Typography variant="subtitle2" gutterBottom color="error.main">
          Thông tin rơ-mooc:
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
          <Typography variant="body2" fontWeight="500">
            Biển số:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {data?.bien_so || '-'}
          </Typography>
          <Typography variant="body2" fontWeight="500">
            Mô tả:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {data?.mo_ta || 'Không có'}
          </Typography>
        </Box>
      </Box>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} disabled={isLoading}>
        Hủy
      </Button>
      <Button onClick={onConfirm} color="error" variant="contained" autoFocus disabled={isLoading}>
        {isLoading ? 'Đang xóa...' : 'Xóa'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default RoMoocDeleteDialog;
