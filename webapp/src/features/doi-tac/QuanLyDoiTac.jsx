import React, { useState } from 'react';
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
import PartnerForm from '@features/doi-tac/components/PartnerForm';
import MobileView from '@features/doi-tac/components/MobileView';
import DesktopView from '@features/doi-tac/components/DesktopView';
import useDoiTac from '@features/doi-tac/hooks/useDoiTac';
const QuanLyDoiTac = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    partners,
    loading,
    error,
    addPartner,
    updatePartner,
    deletePartner,
    clearError,
    getInitialFormData,
    isPartnerCodeAvailable,
  } = useDoiTac();
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [formError, setFormError] = useState('');
  // Delete confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
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
    setSelectedPartner(null);
    setFormError('');
    setIsFormOpen(true);
  };
  const handleOpenFormForEdit = partner => {
    setSelectedPartner(partner);
    setFormError('');
    setIsFormOpen(true);
  };
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedPartner(null);
    setFormError('');
  };
  const handleSavePartner = async formData => {
    setFormError('');
    // If this is an edit, we need to validate the code if it was changed
    if (selectedPartner && formData.code && formData.code !== selectedPartner.code) {
      setIsValidatingCode(true);
      try {
        const isAvailable = await isPartnerCodeAvailable(formData.code, selectedPartner.id);
        if (!isAvailable) {
          setFormError('Mã đối tác đã được sử dụng. Vui lòng chọn mã khác.');
          setIsValidatingCode(false);
          return;
        }
      } catch (err) {

        setFormError('Có lỗi xảy ra khi kiểm tra mã đối tác. Vui lòng thử lại.');
        setIsValidatingCode(false);
        return;
      }
      setIsValidatingCode(false);
    }
    try {
      let result;
      if (selectedPartner) {
        result = await updatePartner(selectedPartner.id, formData);
      } else {
        result = await addPartner(formData);
      }
      if (result.success) {
        handleCloseForm();
        showSnackbar(selectedPartner ? 'Sửa đối tác thành công' : 'Thêm đối tác thành công');
      } else {
        setFormError(result.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {

      setFormError('Có lỗi xảy ra khi lưu thông tin đối tác.');
    }
  };
  // Delete handlers
  const handleDeleteClick = partner => {
    setPartnerToDelete(partner);
    setIsDeleteModalOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (partnerToDelete) {
      const result = await deletePartner(partnerToDelete.id);
      if (result.success) {
        showSnackbar('Xóa đối tác thành công');
      } else {
        showSnackbar(result.error, 'error');
      }
    }
    setIsDeleteModalOpen(false);
    setPartnerToDelete(null);
  };
  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setPartnerToDelete(null);
  };
  const commonProps = {
    partners,
    loading,
    error,
    onEdit: handleOpenFormForEdit,
    onDelete: handleDeleteClick,
    onAdd: handleOpenFormForAdd, // Fixed: changed from onAddPartner to onAdd
  };
  return (
    <Box>
      {/* Render appropriate view based on screen size */}
      {isMobile ? <MobileView {...commonProps} /> : <DesktopView {...commonProps} />}
      {/* Add/Edit Form */}
      <PartnerForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSavePartner}
        partner={selectedPartner}
        onGetInitialData={getInitialFormData}
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
        title="Xác nhận xóa đối tác"
        message={
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn xóa đối tác này?
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
                  Tên đối tác:
                </Typography>
                <Typography variant="body2">{partnerToDelete?.ten}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Địa chỉ:
                </Typography>
                <Typography variant="body2">
                  {partnerToDelete?.dia_chi || 'Chưa cập nhật'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mã số thuế:
                </Typography>
                <Typography variant="body2">
                  {partnerToDelete?.ma_so_thue || 'Chưa cập nhật'}
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
export default QuanLyDoiTac;
