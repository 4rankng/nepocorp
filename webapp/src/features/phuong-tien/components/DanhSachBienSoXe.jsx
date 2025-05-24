import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
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
} from '@mui/material';
import ConfirmationDialog from '../../../shared/components/ConfirmationDialog';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

// Mock data service - Replace with actual API calls
const mockApi = {
  getLicensePlates: async () => [
    {
      id: 1,
      licensePlate: '51A-123.45',
      vehicleType: 'Xe tải',
      capacity: '5 tấn',
      containerCount: 2,
      note: 'Xe mới nhập',
    },
    {
      id: 2,
      licensePlate: '51B-678.90',
      vehicleType: 'Xe container',
      capacity: '10 tấn',
      containerCount: 1,
      note: 'Đang bảo trì',
    },
  ],
  addVehicle: async data => ({ id: Date.now(), ...data }),
  updateVehicle: async (id, data) => ({ id, ...data }),
  deleteVehicle: async id => id,
};

const DanhSachBienSoXe = () => {
  const [licensePlates, setLicensePlates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    licensePlate: '',
    vehicleType: '',
    capacity: '',
    containerCount: 1,
    note: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchLicensePlates = async () => {
    setIsLoading(true);
    try {
      const data = await mockApi.getLicensePlates();
      setLicensePlates(data);
    } catch (err) {
      setError('Không thể tải danh sách biển số xe');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLicensePlates();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenAddDialog = () => {
    setEditingId(null);
    setFormData({
      licensePlate: '',
      vehicleType: '',
      capacity: '',
      containerCount: 1,
      note: '',
    });
    setOpenDialog(true);
  };

  const handleRowClick = vehicle => {
    setEditingId(vehicle.id);
    setFormData({
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      capacity: vehicle.capacity,
      containerCount: vehicle.containerCount,
      note: vehicle.note || '',
    });
    setOpenDialog(true);
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'containerCount' ? parseInt(value) || 0 : value,
    }));
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleSave = async () => {
    if (!formData.licensePlate.trim()) {
      setError('Vui lòng nhập biển số xe');
      return;
    }
    if (!formData.vehicleType.trim()) {
      setError('Vui lòng chọn loại xe');
      return;
    }
    if (!formData.capacity.trim()) {
      setError('Vui lòng nhập trọng tải');
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        await mockApi.updateVehicle(editingId, formData);
        showSnackbar('Cập nhật thông tin xe thành công');
      } else {
        await mockApi.addVehicle(formData);
        showSnackbar('Thêm xe mới thành công');
      }
      await fetchLicensePlates();
      handleCloseDialog();
    } catch (err) {
      setError('Đã xảy ra lỗi khi lưu biển số xe');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
  });

  const handleDeleteClick = id => {
    setDeleteDialog({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;

    setIsLoading(true);
    try {
      await mockApi.deleteLicensePlate(deleteDialog.id);
      showSnackbar('Xóa biển số xe thành công');
      await fetchLicensePlates();
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa biển số xe', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, id: null });
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
              <TableCell>Biển Số Xe</TableCell>
              <TableCell>Loại Xe</TableCell>
              <TableCell>Trọng Tải</TableCell>
              <TableCell align="center">Số Lượng Container</TableCell>
              <TableCell>Ghi Chú</TableCell>
              <TableCell align="right">Thao Tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && licensePlates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : licensePlates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              licensePlates.map((vehicle, index) => (
                <TableRow
                  key={vehicle.id}
                  hover
                  onClick={() => handleRowClick(vehicle)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{vehicle.licensePlate}</TableCell>
                  <TableCell>{vehicle.vehicleType}</TableCell>
                  <TableCell>{vehicle.capacity}</TableCell>
                  <TableCell align="center">{vehicle.containerCount}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 200,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={vehicle.note}
                  >
                    {vehicle.note}
                  </TableCell>
                  <TableCell align="right" onClick={e => e.stopPropagation()}>
                    <IconButton
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteClick(vehicle.id);
                      }}
                      color="error"
                      disabled={isLoading}
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
        <DialogTitle>{editingId ? 'Sửa' : 'Thêm'} Thông Tin Xe</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              name="licensePlate"
              label="Biển số xe"
              fullWidth
              variant="outlined"
              value={formData.licensePlate}
              onChange={handleInputChange}
              error={!!error && !formData.licensePlate.trim()}
              required
            />

            <TextField
              margin="dense"
              name="vehicleType"
              label="Loại xe"
              fullWidth
              variant="outlined"
              value={formData.vehicleType}
              onChange={handleInputChange}
              error={!!error && !formData.vehicleType.trim()}
              required
            />

            <TextField
              margin="dense"
              name="capacity"
              label="Trọng tải"
              fullWidth
              variant="outlined"
              value={formData.capacity}
              onChange={handleInputChange}
              error={!!error && !formData.capacity.trim()}
              required
            />

            <TextField
              margin="dense"
              name="containerCount"
              label="Số lượng container"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.containerCount}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
            />

            <TextField
              margin="dense"
              name="note"
              label="Ghi chú"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={formData.note}
              onChange={handleInputChange}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} disabled={isLoading} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {editingId ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmationDialog
        open={deleteDialog.open}
        title="Xóa biển số xe"
        message="Bạn có chắc chắn muốn xóa biển số xe này?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />
    </div>
  );
};

export default DanhSachBienSoXe;
