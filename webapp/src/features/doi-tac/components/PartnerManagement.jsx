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
import PartnerForm from './PartnerForm';
import PartnerList from './PartnerList';
import usePartnerManagement from '../hooks/usePartnerManagement';

const PartnerManagement = () => {
  const {
    partners,
    loading,
    error,
    addPartner,
    updatePartner,
    deletePartner,
    clearError,
  } = usePartnerManagement();

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

  const handleOpenFormForEdit = (partner) => {
    setSelectedPartner(partner);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedPartner(null);
    setFormError('');
  };

  const handleSavePartner = async (formData) => {
    setFormError('');

    let result;
    if (selectedPartner) {
      result = await updatePartner(selectedPartner.id, formData);
    } else {
      result = await addPartner(formData);
    }

    if (result.success) {
      handleCloseForm();
      showSnackbar(
        selectedPartner
          ? 'Sửa đối tác thành công'
          : 'Thêm đối tác thành công'
      );
    } else {
      setFormError(result.error);
    }
  };

  // Delete handlers
  const handleDeleteClick = (partner) => {
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
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý đối tác
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
            Danh sách đối tác
          </Typography>
          <AddButton
            onClick={handleOpenFormForAdd}
            label="Thêm đối tác"
            size="small"
          />
        </Box>

        <PartnerList
          partners={partners}
          loading={loading}
          onEdit={handleOpenFormForEdit}
          onDelete={handleDeleteClick}
          error={error}
        />
      </Paper>

      {/* Add/Edit Form */}
      <PartnerForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSavePartner}
        partner={selectedPartner}
        isLoading={loading}
        error={formError}
      />

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
                <Typography variant="body2">{partnerToDelete?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Địa chỉ:
                </Typography>
                <Typography variant="body2">
                  {partnerToDelete?.address || 'Chưa cập nhật'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mã số thuế:
                </Typography>
                <Typography variant="body2">
                  {partnerToDelete?.taxCode || 'Chưa cập nhật'}
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

export default PartnerManagement;
