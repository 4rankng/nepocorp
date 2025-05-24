import { useState, useEffect, useCallback } from 'react';
import AddButton from '@shared/components/AddButton';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  IconButton,
} from '@mui/material';
import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons';
import ConfirmationModal from '../../../components/ConfirmationModal';

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

const XeVanChuyen = () => {
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

  const handleCloseDialog = useCallback(() => {
    setFormData({
      licensePlate: '',
      vehicleType: '',
      capacity: '',
      containerCount: '',
      note: '',
    });
    setEditingId(null);
    setError('');
    setOpenDialog(false);
  }, []);

  // Handle ESC key press to close dialog
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && openDialog) {
        handleCloseDialog();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDialog, handleCloseDialog]);

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
    vehicle: null,
  });

  const handleDeleteClick = vehicle => {
    setDeleteDialog({ open: true, vehicle });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.vehicle) return;

    setIsLoading(true);
    try {
      await mockApi.deleteVehicle(deleteDialog.vehicle.id);
      showSnackbar('Xóa biển số xe thành công');
      await fetchLicensePlates();
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa biển số xe', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
      setDeleteDialog({ open: false, vehicle: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, vehicle: null });
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        <AddButton onClick={handleOpenAddDialog} disabled={isLoading} />
      </div>

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
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          handleRowClick(vehicle);
                        }}
                        disabled={isLoading}
                        color="primary"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteClick(vehicle);
                        }}
                        disabled={isLoading}
                        color="error"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            paddingTop: '64px',
          },
          '& .MuiPaper-root': {
            margin: '16px',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
          '& .MuiDialogTitle-root': {
            padding: '16px 24px',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#111827',
            borderBottom: '1px solid #E5E7EB',
          },
          '& .MuiDialogContent-root': {
            padding: '24px',
            '&:first-of-type': {
              paddingTop: '24px',
            },
          },
          '& .MuiDialogActions-root': {
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            justifyContent: 'flex-end',
            gap: '8px',
          },
        }}
      >
        <DialogTitle>{editingId ? 'Sửa' : 'Thêm'} Thông Tin Xe</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                autoFocus
                name="licensePlate"
                label="Biển số xe"
                fullWidth
                variant="outlined"
                size="small"
                value={formData.licensePlate}
                onChange={handleInputChange}
                error={!!error && !formData.licensePlate.trim()}
                required
                sx={{
                  '& .MuiInputBase-root': { height: 40 },
                  '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
                  '& .MuiInputBase-input': { fontSize: '0.875rem' },
                }}
              />
              <TextField
                name="vehicleType"
                label="Loại xe"
                fullWidth
                variant="outlined"
                size="small"
                value={formData.vehicleType}
                onChange={handleInputChange}
                error={!!error && !formData.vehicleType.trim()}
                required
                sx={{
                  '& .MuiInputBase-root': { height: 40 },
                  '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
                  '& .MuiInputBase-input': { fontSize: '0.875rem' },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                name="capacity"
                label="Trọng tải"
                fullWidth
                variant="outlined"
                size="small"
                value={formData.capacity}
                onChange={handleInputChange}
                error={!!error && !formData.capacity.trim()}
                required
                sx={{
                  flex: 3,
                  '& .MuiInputBase-root': { height: 40 },
                  '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
                  '& .MuiInputBase-input': { fontSize: '0.875rem' },
                }}
              />
              <TextField
                name="containerCount"
                label="Số lượng container"
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                value={formData.containerCount}
                onChange={handleInputChange}
                inputProps={{
                  min: 0,
                  style: { textAlign: 'right' },
                }}
                sx={{
                  flex: 2,
                  '& .MuiInputBase-root': { height: 40 },
                  '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
                  '& .MuiInputBase-input': { fontSize: '0.875rem' },
                }}
              />
            </Box>

            <TextField
              name="note"
              label="Ghi chú bổ sung (tùy chọn)"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              size="small"
              value={formData.note}
              onChange={handleInputChange}
              sx={{
                '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
                '& .MuiInputBase-input': { fontSize: '0.875rem' },
                '& .MuiInputBase-multiline': {
                  padding: '8px 12px',
                  minHeight: '64px',
                },
              }}
            />

            {error && (
              <Alert
                severity="error"
                sx={{
                  mt: 0.5,
                  fontSize: '0.8125rem',
                  '& .MuiAlert-message': { py: 0.5 },
                }}
              >
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{
              height: 36,
              px: 2,
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#4B5563',
              borderColor: '#D1D5DB',
              backgroundColor: 'white',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderColor: '#9CA3AF',
              },
              '&:active': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            variant="contained"
            sx={{
              height: 36,
              px: 3,
              fontSize: '0.8125rem',
              fontWeight: 500,
              backgroundColor: '#3B82F6',
              '&:hover': {
                backgroundColor: '#2563EB',
              },
              '&.Mui-disabled': {
                backgroundColor: '#E5E7EB',
                color: '#9CA3AF',
              },
            }}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {editingId ? 'Lưu' : 'Thêm'}
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

      <ConfirmationModal
        isOpen={deleteDialog.open}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa"
        message={
          <div className="mt-2">
            <p className="text-sm text-gray-500 mb-4">
              Bạn có chắc chắn muốn xóa xe vận chuyển này?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium text-gray-500">Biển số xe:</div>
                <div className="text-gray-900">{deleteDialog.vehicle?.licensePlate}</div>
                <div className="font-medium text-gray-500">Loại xe:</div>
                <div className="text-gray-900">{deleteDialog.vehicle?.vehicleType}</div>
                <div className="font-medium text-gray-500">Trọng tải:</div>
                <div className="text-gray-900">{deleteDialog.vehicle?.capacity}</div>
                <div className="font-medium text-gray-500">Số lượng container:</div>
                <div className="text-gray-900">{deleteDialog.vehicle?.containerCount}</div>
                <div className="font-medium text-gray-500">Ghi chú:</div>
                <div className="text-gray-900">{deleteDialog.vehicle?.note || '-'}</div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default XeVanChuyen;
