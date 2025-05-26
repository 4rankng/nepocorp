import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { customerApi } from '@services/mockApi';

// Enhanced theme configuration based on DinhMucDau.jsx
const theme = {
  spacing: 8,
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: { fontSize: '1rem', fontWeight: 600 },
  },
  palette: {
    primary: { main: '#1976d2' },
    background: { paper: '#ffffff' },
    text: { primary: '#1a1a1a', secondary: '#6b7280' },
  },
  shape: { borderRadius: 6 },
};

const spacing = value => `${value * theme.spacing}px`;

// Mock data for demonstration (will be replaced with API calls)
const mockCustomers = [
  {
    id: 1,
    name: 'Nguyễn Văn A',
    phone: '0912345678',
    email: 'nguyenvana@email.com',
    address: '123 Đường ABC, Q.1, TP.HCM',
    status: 'active',
  },
  {
    id: 2,
    name: 'Trần Thị B',
    phone: '0987654321',
    email: 'tranthib@email.com',
    address: '456 Đường XYZ, Q.3, TP.HCM',
    status: 'active',
  },
  {
    id: 3,
    name: 'Lê Văn C',
    phone: '0901234567',
    email: 'levanc@email.com',
    address: '789 Đường DEF, Q.7, TP.HCM',
    status: 'inactive',
  },
];

const KhachHangList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    details: null,
  });

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data || []);
    } catch (err) {
      setError('Không thể tải danh sách khách hàng');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
    setOpenDialog(true);
  };

  const handleEdit = customer => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    });
    setOpenDialog(true);
  };

  const handleDelete = id => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    setDeleteDialog({
      open: true,
      id,
      details: {
        'Tên khách hàng': customer.name,
        'Số điện thoại': customer.phone,
        Email: customer.email,
        'Địa chỉ': customer.address,
      },
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setCustomers(prev => prev.filter(c => c.id !== deleteDialog.id));
      showSnackbar('Xóa khách hàng thành công');
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa khách hàng', 'error');
    } finally {
      setLoading(false);
      setDeleteDialog({ open: false, id: null, details: null });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      if (editingCustomer) {
        // Update existing customer
        setCustomers(prev =>
          prev.map(c => (c.id === editingCustomer.id ? { ...c, ...formData } : c))
        );
        showSnackbar('Sửa khách hàng thành công');
      } else {
        // Add new customer
        const newCustomer = {
          id: Date.now(),
          ...formData,
          status: 'active',
        };
        setCustomers(prev => [...prev, newCustomer]);
        showSnackbar('Thêm khách hàng thành công');
      }

      setOpenDialog(false);
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi lưu thông tin', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Table columns configuration
  const columns = [
    { key: 'name', label: 'Tên khách hàng' },
    { key: 'phone', label: 'Số điện thoại', numeric: false },
    { key: 'email', label: 'Email' },
    {
      key: 'address',
      label: 'Địa chỉ',
      maxWidth: 250,
      noWrap: true,
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: value => (value === 'active' ? 'Hoạt động' : 'Không hoạt động'),
      getColor: value =>
        value === 'active' ? theme.palette.primary.main : theme.palette.text.secondary,
    },
  ];

  return (
    <Box sx={{ p: spacing(2) }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: spacing(2),
        }}
      >
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Quản Lý Khách Hàng
        </Typography>
        <AddButton onClick={handleAdd} label="Thêm khách hàng" />
      </Box>

      <StandardTable
        columns={columns}
        data={customers}
        loading={loading}
        error={error}
        emptyMessage="Chưa có khách hàng nào"
        renderActions={customer => (
          <>
            <EditButton onClick={() => handleEdit(customer)} tooltip="Chỉnh sửa khách hàng" />
            <DeleteButton onClick={() => handleDelete(customer.id)} tooltip="Xóa khách hàng" />
          </>
        )}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Tên khách hàng"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              label="Số điện thoại"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <TextField
              fullWidth
              label="Địa chỉ"
              name="address"
              multiline
              rows={3}
              value={formData.address}
              onChange={handleInputChange}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined" color="inherit">
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading || !formData.name || !formData.phone}
          >
            {editingCustomer ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onCancel={() => setDeleteDialog({ open: false, id: null, details: null })}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa khách hàng"
        message="Bạn có chắc chắn muốn xóa khách hàng này?"
        details={deleteDialog.details}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />
    </Box>
  );
};

export default KhachHangList;
