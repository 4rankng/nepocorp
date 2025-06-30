import React, { useState } from 'react';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import { Box, Alert, Snackbar, CircularProgress, Typography, Divider } from '@mui/material';
import ConfirmDialog from '@/components/ConfirmDialog';
import EntityForm from '@/components/shared/EntityForm';

import DesktopView from '@features/khach-hang/components/DesktopView';
import useCustomerManagement from '@features/khach-hang/hooks/useCustomerManagement';
import { Z_INDEX } from '@constants/zIndex';

const QuanLyKhachHang = () => {
  const {
    customers,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    clearError,
    getInitialFormData,
    isTaxCodeAvailable,
  } = useCustomerManagement();
  const [isValidatingTaxCode, setIsValidatingTaxCode] = useState(false);
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formError, setFormError] = useState('');
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, data: null });
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  // Snackbar handlers
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
    // If this is an edit, we need to validate the tax code if it was changed
    if (selectedCustomer && formData.tax_code && formData.tax_code !== selectedCustomer.tax_code) {
      setIsValidatingTaxCode(true);
      try {
        const isAvailable = await isTaxCodeAvailable(formData.tax_code, selectedCustomer.id);
        if (!isAvailable) {
          setFormError('Mã số thuế đã được sử dụng. Vui lòng chọn mã khác.');
          setIsValidatingTaxCode(false);
          return;
        }
      } catch (err) {
        setFormError('Có lỗi xảy ra khi kiểm tra mã số thuế. Vui lòng thử lại.');
        setIsValidatingTaxCode(false);
        return;
      }
      setIsValidatingTaxCode(false);
    }
    try {
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
        setFormError(result.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {
      setFormError('Có lỗi xảy ra khi lưu thông tin khách hàng.');
    }
  };
  // Delete handlers
  const handleDeleteClick = customer => {
    setDeleteDialog({ open: true, data: customer });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.data) {
      const result = await deleteCustomer(deleteDialog.data.id);
      if (result.success) {
        showSnackbar('Xóa khách hàng thành công');
      } else {
        showSnackbar(result.error || 'Có lỗi xảy ra khi xóa khách hàng', 'error');
      }
    }
    setDeleteDialog({ open: false, data: null });
  };
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
      <DesktopView {...commonProps} />
      {/* Add/Edit Form */}
      <EntityForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveCustomer}
        entity={selectedCustomer}
        onGetInitialData={getInitialFormData}
        isLoading={loading || isValidatingTaxCode}
        error={formError}
        entityType="customer"
        includeContactFields={true}
        includeNotesField={true}
      />
      {/* Loading overlay for tax code validation */}
      {isValidatingTaxCode && (
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
            zIndex: Z_INDEX.LOADING_OVERLAY,
          }}
        >
          <CircularProgress color="primary" />
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onCancel={() => setDeleteDialog({ open: false, data: null })}
        onConfirm={handleDeleteConfirm}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessCenterIcon color="error" />
            <span>Xóa khách hàng</span>
          </Box>
        }
        message="Bạn có chắc chắn muốn xóa khách hàng này?"
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
        type="delete"
        content={() => (
          <Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="error.main" gutterBottom>
                Thông tin khách hàng:
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  Tên khách hàng:
                </Typography>
                <Typography variant="body2">{deleteDialog.data?.name || '-'}</Typography>

                <Typography variant="body2" fontWeight={500}>
                  Mã số thuế:
                </Typography>
                <Typography variant="body2">{deleteDialog.data?.tax_code || 'Chưa có'}</Typography>

                <Typography variant="body2" fontWeight={500}>
                  Địa chỉ:
                </Typography>
                <Typography variant="body2">{deleteDialog.data?.address || 'Chưa có'}</Typography>
              </Box>
            </Box>
          </Box>
        )}
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
