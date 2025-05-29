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
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InventoryIcon from '@mui/icons-material/Inventory2';

const CONTAINER_TYPES = [
  '20ft Container',
  '40ft Container',
  '40ft HC Container',
  'Tank Container',
  'Open Top Container',
  'Flat Rack Container',
  'Refrigerated Container',
];

const ContainerDialog = ({ open, edit, data, setData, onClose, onSave, isLoading = false }) => {
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
        <InventoryIcon color="success" />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {edit ? 'Chỉnh sửa loại container' : 'Thêm loại container mới'}
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
            select
            label="Loại container"
            value={data?.phan_loai || ''}
            onChange={e => handleFieldChange('phan_loai', e.target.value)}
            fullWidth
            autoFocus
            required
            error={!data?.phan_loai}
            helperText={!data?.phan_loai ? 'Vui lòng chọn loại container' : ''}
          >
            {CONTAINER_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Hoặc nhập loại khác"
            value={
              data?.phan_loai && !CONTAINER_TYPES.includes(data.phan_loai) ? data.phan_loai : ''
            }
            onChange={e => handleFieldChange('phan_loai', e.target.value)}
            fullWidth
            placeholder="Nhập loại container tùy chỉnh..."
            helperText="Nếu loại container không có trong danh sách trên"
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
          disabled={isLoading || !data?.phan_loai}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? 'Đang lưu...' : edit ? 'Cập nhật' : 'Thêm mới'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContainerDialog;
