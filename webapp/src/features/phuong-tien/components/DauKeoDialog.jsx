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
  Typography,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
const DauKeoDialog = ({ open, edit, data, setData, onClose, onSave, isLoading = false }) => {
  const handleSave = () => {
    onSave(data);
  };
  const handleFieldChange = (field, value) => {
    setData({
      ...data,
      [field]: value,
    });
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocalShippingIcon color="primary" />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {edit ? 'Chỉnh sửa đầu kéo' : 'Thêm đầu kéo mới'}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: theme => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          <TextField
            label="Biển số xe"
            value={data?.bien_so || ''}
            onChange={e => handleFieldChange('bien_so', e.target.value)}
            fullWidth
            autoFocus
            required
            error={!data?.bien_so}
            helperText={!data?.bien_so ? 'Vui lòng nhập biển số xe' : ''}
            placeholder="Ví dụ: 29A-12345"
          />
          <TextField
            label="Mô tả"
            value={data?.mo_ta || ''}
            onChange={e => handleFieldChange('mo_ta', e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Mô tả về đầu kéo..."
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Hủy
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || !data?.bien_so}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? 'Đang lưu...' : edit ? 'Cập nhật' : 'Thêm mới'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default DauKeoDialog;
