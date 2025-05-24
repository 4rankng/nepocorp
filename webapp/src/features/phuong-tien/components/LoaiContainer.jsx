import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  CircularProgress,
  Alert,
  Snackbar,
  Box,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

// Mock data service - Replace with actual API calls
const mockApi = {
  getContainerTypes: async () => [
    { id: 1, type: "20'DC", description: 'Container khô 20 feet tiêu chuẩn' },
    { id: 2, type: "40'DC", description: 'Container khô 40 feet tiêu chuẩn' },
    { id: 3, type: "40'HC", description: 'Container cao 40 feet' },
    { id: 4, type: "40'RF", description: 'Container lạnh 40 feet' },
    { id: 5, type: "40'OT", description: 'Container mở nóc 40 feet' },
    { id: 6, type: "45'HC", description: 'Container cao 45 feet' },
  ],
  addContainerType: async data => ({ id: Date.now(), ...data }),
  updateContainerType: async (id, data) => ({ id, ...data }),
  deleteContainerType: async id => id,
};

const LoaiContainer = () => {
  const [containerTypes, setContainerTypes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentType, setCurrentType] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchContainerTypes = async () => {
    setIsLoading(true);
    try {
      const data = await mockApi.getContainerTypes();
      setContainerTypes(data);
    } catch (err) {
      setError('Không thể tải danh sách loại container');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainerTypes();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenAddDialog = () => {
    setEditingId(null);
    setCurrentType('');
    setCurrentDescription('');
    setOpenDialog(true);
  };

  const handleOpenEditDialog = containerType => {
    setEditingId(containerType.id);
    setCurrentType(containerType.type);
    setCurrentDescription(containerType.description || '');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleSave = async () => {
    if (!currentType.trim()) {
      setError('Vui lòng nhập loại container');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        type: currentType.trim(),
        description: currentDescription.trim(),
      };

      if (editingId) {
        await mockApi.updateContainerType(editingId, data);
        showSnackbar('Cập nhật loại container thành công');
      } else {
        await mockApi.addContainerType(data);
        showSnackbar('Thêm loại container thành công');
      }
      await fetchContainerTypes();
      handleCloseDialog();
    } catch (err) {
      setError('Đã xảy ra lỗi khi lưu loại container');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async id => {
    if (window.confirm('Bạn có chắc chắn muốn xóa loại container này?')) {
      setIsLoading(true);
      try {
        await mockApi.deleteContainerType(id);
        showSnackbar('Xóa loại container thành công');
        await fetchContainerTypes();
      } catch (err) {
        showSnackbar('Đã xảy ra lỗi khi xóa loại container', 'error');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          disabled={isLoading}
        >
          Thêm
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>STT</TableCell>
              <TableCell>Loại Container</TableCell>
              <TableCell>Mô Tả</TableCell>
              <TableCell align="right">Thao Tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && containerTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : containerTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              containerTypes.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.description || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleOpenEditDialog(item)}
                      size="small"
                      disabled={isLoading}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(item.id)}
                      size="small"
                      disabled={isLoading}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Chỉnh Sửa Loại Container' : 'Thêm Mới Loại Container'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingId ? 'Cập nhật thông tin loại container' : 'Nhập thông tin loại container mới'}
          </DialogContentText>

          <TextField
            autoFocus
            margin="dense"
            label="Loại container"
            fullWidth
            variant="outlined"
            value={currentType}
            onChange={e => setCurrentType(e.target.value)}
            error={!!error && !currentType.trim()}
            helperText={!currentType.trim() ? error : ''}
            disabled={isLoading}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Mô tả"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={currentDescription}
            onChange={e => setCurrentDescription(e.target.value)}
            disabled={isLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isLoading}>
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading || !currentType.trim()}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default LoaiContainer;
