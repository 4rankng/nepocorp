import React, { useState, useEffect } from 'react';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '@services/mockData';
import StandardTable from '@shared/components/StandardTable';
import ConfirmationModal from '@shared/components/ConfirmationDialog';
import { AddButton, EditButton, DeleteButton } from '@shared/components/ActionButtons';
import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons/index.jsx';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material';

const initialFormState = {
  code: '',
  name: '',
  address: '',
  taxCode: '',
};

const QuanLyKhachHang = () => {
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomersData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      setError('Không thể tải danh sách khách hàng.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersData();
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModalForAdd = () => {
    setSelectedCustomer(null);
    setFormData(initialFormState);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = customer => {
    setSelectedCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      address: customer.address,
      taxCode: customer.taxCode,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
    setFormData(initialFormState);
    setError('');
  };

  // Handle ESC key press to close modals
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          handleCloseModal();
        } else if (isDeleteModalOpen) {
          handleDeleteCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, isDeleteModalOpen]);

  const handleSaveCustomer = async e => {
    e.preventDefault();
    setError('');
    if (
      !formData.code.trim() ||
      !formData.name.trim() ||
      !formData.address.trim() ||
      !formData.taxCode.trim()
    ) {
      setError('Vui lòng điền đầy đủ thông tin khách hàng.');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, formData);
      } else {
        await addCustomer(formData);
      }
      await fetchCustomersData();
      handleCloseModal();
    } catch (err) {
      setError(err.message || `Lỗi khi ${selectedCustomer ? 'cập nhật' : 'thêm'} khách hàng.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = customer => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteCustomer(customerToDelete.id);
      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  // Define table columns
  const columns = [
    {
      key: 'code',
      label: 'Mã',
    },
    {
      key: 'name',
      label: 'Tên',
    },
    {
      key: 'address',
      label: 'Địa chỉ',
    },
    {
      key: 'taxCode',
      label: 'Mã số thuế',
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton onClick={() => handleOpenModalForEdit(record)} disabled={isLoading} />
          <DeleteButton onClick={() => handleDeleteClick(record)} disabled={isLoading} />
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Danh sách khách hàng
        </Typography>
        <AddButton onClick={handleOpenModalForAdd} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <StandardTable
          columns={columns}
          data={customers}
          loading={isLoading}
          emptyMessage="Chưa có khách hàng nào"
        />
      </Paper>

      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
        </DialogTitle>
        <form onSubmit={handleSaveCustomer}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Mã"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="Ví dụ: CDMC"
                fullWidth
                size="small"
                required
                margin="normal"
              />
              <TextField
                label="Tên"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ví dụ: Công ty Cổ phần Chè"
                fullWidth
                size="small"
                required
                margin="normal"
              />
              <TextField
                label="Địa chỉ"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Ví dụ: 123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh"
                fullWidth
                size="small"
                required
                margin="normal"
              />
              <TextField
                label="Mã số thuế"
                name="taxCode"
                value={formData.taxCode}
                onChange={handleInputChange}
                placeholder="Ví dụ: 5500157123"
                fullWidth
                size="small"
                required
                margin="normal"
              />
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={handleCloseModal} color="inherit">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {selectedCustomer ? 'Lưu' : 'Thêm'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmationModal
        open={isDeleteModalOpen}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa khách hàng"
        message={
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn xóa khách hàng này?
            </Typography>
            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: 1,
                  fontSize: '0.875rem',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Mã khách hàng:
                </Typography>
                <Typography variant="body2">{customerToDelete?.code}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tên khách hàng:
                </Typography>
                <Typography variant="body2">{customerToDelete?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Địa chỉ:
                </Typography>
                <Typography variant="body2">{customerToDelete?.address}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Mã số thuế:
                </Typography>
                <Typography variant="body2">{customerToDelete?.taxCode}</Typography>
              </Box>
            </Box>
          </Box>
        }
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />
    </Box>
  );
};

export default QuanLyKhachHang;
