import React, { useState } from 'react';
import { Box, Paper, Typography, Alert, Snackbar } from '@mui/material';
import { AddButton } from '@shared/components/ActionButtons';
import ConfirmationModal from '@shared/components/ConfirmationDialog';
import ContainerTypeForm from '@features/phuong-tien/components/ContainerTypeForm';
import ContainerTypeList from '@features/phuong-tien/components/ContainerTypeList';
import useContainerTypeManagement from '@features/phuong-tien/hooks/useContainerTypeManagement';

const ContainerTypeManagement = () => {
  const {
    containerTypes,
    loading,
    error,
    addContainerType,
    updateContainerType,
    deleteContainerType,
    clearError,
  } = useContainerTypeManagement();

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContainerType, setSelectedContainerType] = useState(null);
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [containerTypeToDelete, setContainerTypeToDelete] = useState(null);

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
    setSelectedContainerType(null);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenFormForEdit = containerType => {
    setSelectedContainerType(containerType);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedContainerType(null);
    setFormError('');
  };

  const handleSaveContainerType = async formData => {
    setFormError('');

    let result;
    if (selectedContainerType) {
      result = await updateContainerType(selectedContainerType.id, formData);
    } else {
      result = await addContainerType(formData);
    }

    if (result.success) {
      handleCloseForm();
      showSnackbar(
        selectedContainerType ? 'Sửa loại container thành công' : 'Thêm loại container thành công'
      );
    } else {
      setFormError(result.error);
    }
  };

  // Delete handlers
  const handleDeleteClick = containerType => {
    setContainerTypeToDelete(containerType);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (containerTypeToDelete) {
      const result = await deleteContainerType(containerTypeToDelete.id);

      if (result.success) {
        showSnackbar('Xóa loại container thành công');
      } else {
        showSnackbar(result.error, 'error');
      }
    }

    setIsDeleteModalOpen(false);
    setContainerTypeToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setContainerTypeToDelete(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý loại container
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Danh sách loại container
          </Typography>
          <AddButton onClick={handleOpenFormForAdd} label="Thêm loại container" size="small" />
        </Box>

        <ContainerTypeList
          containerTypes={containerTypes}
          loading={loading}
          onEdit={handleOpenFormForEdit}
          onDelete={handleDeleteClick}
          error={error}
        />
      </Paper>

      {/* Add/Edit Form */}
      <ContainerTypeForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveContainerType}
        containerType={selectedContainerType}
        isLoading={loading}
        error={formError}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={isDeleteModalOpen}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa loại container"
        message={
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn xóa loại container này?
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
                  Loại container:
                </Typography>
                <Typography variant="body2">{containerTypeToDelete?.type}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Mô tả:
                </Typography>
                <Typography variant="body2">
                  {containerTypeToDelete?.description || 'Không có mô tả'}
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

export default ContainerTypeManagement;
