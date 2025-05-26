import React, { useState } from 'react';
import { Box, Paper, Typography, Alert, Snackbar, Fab, Zoom } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import ConfirmationModal from '@shared/components/ConfirmationDialog';
import CustomerForm from '@features/khach-hang/components/CustomerForm';
import CustomerListResponsive from '@features/khach-hang/components/CustomerListResponsive';
import useCustomerManagement from '@features/khach-hang/hooks/useCustomerManagement';

const CustomerManagement = () => {
  const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer, clearError } =
    useCustomerManagement();

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Form handlers
  const handleOpenFormForAdd = () => {
    setSelectedCustomer(null);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenFormForEdit = customer => {
    setSelectedCustomer(customer);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCustomer(null);
    setFormError('');
  };

  const handleSaveCustomer = async formData => {
    setFormError('');

    let result;
    if (selectedCustomer) {
      result = await updateCustomer(selectedCustomer.id, formData);
    } else {
      result = await addCustomer(formData);
    }

    if (result.success) {
      handleCloseForm();
      showSnackbar(selectedCustomer ? 'Sửa khách hàng thành công' : 'Thêm khách hàng thành công');
    } else {
      setFormError(result.error);
    }
  };

  // Delete handlers
  const handleDeleteClick = customer => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (customerToDelete) {
      const result = await deleteCustomer(customerToDelete.id);

      if (result.success) {
        showSnackbar('Xóa khách hàng thành công');
      } else {
        showSnackbar(result.error, 'error');
      }
    }

    setIsDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, position: 'relative', minHeight: 'calc(100vh - 64px)' }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý khách hàng
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
        <CustomerListResponsive
          customers={customers}
          loading={loading}
          error={error}
          onEdit={handleOpenFormForEdit}
          onDelete={handleDeleteClick}
          emptyMessage="Chưa có khách hàng nào"
        />
      </Paper>
      
      {/* Floating Action Button */}
      <Zoom in={!loading}>
        <Fab
          color="primary"
          aria-label="Thêm khách hàng"
          onClick={handleOpenFormForAdd}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, sm: 32 },
            right: { xs: 24, sm: 32 },
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      {/* Add/Edit Form */}
      <CustomerForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
        isLoading={loading}
        error={formError}
      />

      {/* Delete Confirmation Modal */}
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
                  Tên khách hàng:
                </Typography>
                <Typography variant="body2">{customerToDelete?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Địa chỉ:
                </Typography>
                <Typography variant="body2">
                  {customerToDelete?.address || 'Chưa cập nhật'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mã số thuế:
                </Typography>
                <Typography variant="body2">
                  {customerToDelete?.taxCode || 'Chưa cập nhật'}
                </Typography>
              </Box>
            </Box>
          </Box>
        }
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerManagement;
