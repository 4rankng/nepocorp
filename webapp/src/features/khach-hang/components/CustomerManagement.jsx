import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import { AddButton } from '@shared/components/ActionButtons';
import ConfirmationModal from '@shared/components/ConfirmationDialog';
import CustomerForm from './CustomerForm';
import CustomerList from './CustomerList';
import useCustomerManagement from '../hooks/useCustomerManagement';

const CustomerManagement = () => {
  const {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    clearError,
  } = useCustomerManagement();

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

  const handleOpenFormForEdit = (customer) => {
    setSelectedCustomer(customer);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCustomer(null);
    setFormError('');
  };

  const handleSaveCustomer = async (formData) => {
    setFormError('');

    let result;
    if (selectedCustomer) {
      result = await updateCustomer(selectedCustomer.id, formData);
    } else {
      result = await addCustomer(formData);
    }

    if (result.success) {
      handleCloseForm();
      showSnackbar(
        selectedCustomer
          ? 'Sửa khách hàng thành công'
          : 'Thêm khách hàng thành công'
      );
    } else {
      setFormError(result.error);
    }
  };

  // Delete handlers
  const handleDeleteClick = (customer) => {
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
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý khách hàng
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={clearError}
        >
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Danh sách khách hàng
          </Typography>
          <AddButton
            onClick={handleOpenFormForAdd}
            label="Thêm khách hàng"
            size="small"
          />
        </Box>

        <CustomerList
          customers={customers}
          loading={loading}
          onEdit={handleOpenFormForEdit}
          onDelete={handleDeleteClick}
          error={error}
        />
      </Paper>

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
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerManagement;
