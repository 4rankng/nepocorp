import React, { useState, useCallback } from 'react';
import {
  Box,
  Alert,
  Snackbar,
  CircularProgress,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ConfirmationModal from '@/components/ConfirmationDialog';
import CustomerForm from '@features/khach-hang/components/CustomerForm';
import MobileView from '@features/khach-hang/components/MobileView';
import DesktopView from '@features/khach-hang/components/DesktopView';
import useCustomerManagement from '@features/khach-hang/hooks/useCustomerManagement';
const QuanLyKhachHang = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    clearError,
    isCustomerCodeAvailable,
    getInitialFormData,
  } = useCustomerManagement();
  const [isValidatingCode, setIsValidatingCode] = useState(false);
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
  const handleSaveCustomer = useCallback(
    async formData => {
      setFormError('');
      // If this is an edit, we need to validate the code if it was changed
      if (selectedCustomer && formData.code && formData.code !== selectedCustomer.code) {
        setIsValidatingCode(true);
        try {
          const isAvailable = await isCustomerCodeAvailable(formData.code, selectedCustomer.id);
          if (!isAvailable) {
            setFormError('Mã khách hàng đã được sử dụng. Vui lòng chọn mã khác.');
            setIsValidatingCode(false);
            return;
          }
        } catch (err) {
          console.error('Error validating customer code:', err);
          setFormError('Có lỗi xảy ra khi kiểm tra mã khách hàng. Vui lòng thử lại.');
          setIsValidatingCode(false);
          return;
        }
        setIsValidatingCode(false);
      }
      let result;
      try {
        if (selectedCustomer) {
          result = await updateCustomer(selectedCustomer.id, formData);
        } else {
          result = await addCustomer(formData);
        }
        if (result.success) {
          handleCloseForm();
          showSnackbar(
            selectedCustomer ? 'Sửa khách hàng thành công' : 'Thêm khách hàng thành công'
          );
        } else {
          setFormError(result.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
        }
      } catch (err) {
        console.error('Error saving customer:', err);
        setFormError('Có lỗi xảy ra khi lưu thông tin khách hàng.');
      }
    },
    [selectedCustomer, addCustomer, updateCustomer, isCustomerCodeAvailable]
  );
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
  // Common props for both mobile and desktop views
  const commonProps = {
    customers,
    loading,
    error,
    onEdit: handleOpenFormForEdit,
    onDelete: handleDeleteClick,
    onAdd: handleOpenFormForAdd,
  };
  return (
    <Box>
      {/* Render appropriate view based on screen size */}
      {isMobile ? <MobileView {...commonProps} /> : <DesktopView {...commonProps} />}
      {/* Add/Edit Form */}
      <CustomerForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
        getInitialFormData={getInitialFormData}
        isLoading={loading || isValidatingCode}
        error={formError}
      />
      {/* Loading overlay for code validation */}
      {isValidatingCode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1400,
          }}
        >
          <CircularProgress color="primary" />
        </div>
      )}
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
                <Typography variant="body2">{customerToDelete?.ten}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Địa chỉ:
                </Typography>
                <Typography variant="body2">
                  {customerToDelete?.dia_chi || 'Chưa cập nhật'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mã số thuế:
                </Typography>
                <Typography variant="body2">
                  {customerToDelete?.ma_so_thue || 'Chưa cập nhật'}
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
export default QuanLyKhachHang;
