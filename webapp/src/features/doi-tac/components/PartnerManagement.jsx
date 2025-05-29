import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Snackbar,
  Fab,
  Zoom,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ConfirmationModal from '@/components/ConfirmationDialog';
import PartnerForm from '@features/doi-tac/components/PartnerForm';
import PartnerListResponsive from '@features/doi-tac/components/PartnerListResponsive';
import usePartnerManagement from '@features/doi-tac/hooks/usePartnerManagement';

const PartnerManagement = () => {
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
  } = usePartnerManagement();

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

  // Search and filtering is now handled in PartnerListResponsive

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
        console.error('Error validating partner code:', err);
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
      console.error('Error saving partner:', err);
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

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, position: 'relative', minHeight: 'calc(100vh - 64px)' }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý đối tác
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
        <PartnerListResponsive
          partners={partners}
          loading={loading}
          onEdit={handleOpenFormForEdit}
          onDelete={handleDeleteClick}
          error={error}
          emptyMessage="Chưa có đối tác nào"
        />
      </Paper>

      {/* Floating Action Button */}
      <Zoom in={!loading}>
        <Fab
          color="primary"
          aria-label="Thêm đối tác"
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
      <PartnerForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSavePartner}
        partner={selectedPartner}
        onGetInitialData={getInitialFormData}
        isLoading={loading || isValidatingCode}
        error={formError}
      />
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

export default PartnerManagement;
