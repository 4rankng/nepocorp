import React, { useState } from 'react';
import ConfirmationDialog from '@shared/components/ConfirmationDialog';
import { EditButton, DeleteButton, AddButton } from '@shared/components/ActionButtons';
import ContainerTypeForm from '@features/phuong-tien/components/ContainerTypeForm';
import ContainerTypeList from '@features/phuong-tien/components/ContainerTypeList';
import useContainerTypeManagement from '@features/phuong-tien/hooks/useContainerTypeManagement';

import {
  Box,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';

const LoaiContainer = () => {
  const {
    containerTypes,
    loading,
    error,
    addContainerType,
    updateContainerType,
    deleteContainerType,
    clearError,
  } = useContainerTypeManagement();

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    containerTypeId: null,
    details: '',
  });

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContainerType, setSelectedContainerType] = useState(null);
  const [formError, setFormError] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
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
    setDeleteDialog({
      open: true,
      containerTypeId: containerType.id,
      details: `Bạn có chắc chắn muốn xóa loại container ${containerType.type}?`,
      containerType,
    });
  };

  const handleDeleteClose = () => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.containerTypeId) return;

    const result = await deleteContainerType(deleteDialog.containerTypeId);

    if (result.success) {
      showSnackbar('Xóa loại container thành công');
    } else {
      showSnackbar(result.error, 'error');
    }

    handleDeleteClose();
  };

  // Render mobile card view
  const renderMobileView = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        mt: 2,
        pb: 8, // Add padding to prevent content from being hidden behind floating button
      }}
    >
      {containerTypes.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Không có dữ liệu loại container
          </Typography>
        </Paper>
      ) : (
        containerTypes.map(item => (
          <Card
            key={item.id}
            elevation={1}
            sx={{
              borderRadius: 2,
              overflow: 'visible',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: theme.shadows[4],
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { p: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1, mr: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      sx={{
                        fontSize: '1.1rem',
                        color: 'primary.main',
                      }}
                    >
                      {item.type}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.description || 'Không có mô tả'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <EditButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenFormForEdit(item);
                    }}
                    sx={{
                      opacity: 0.9,
                      '&:hover': {
                        opacity: 1,
                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                      },
                    }}
                  />
                  <DeleteButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteClick(item);
                    }}
                    sx={{
                      opacity: 0.9,
                      '&:hover': {
                        opacity: 1,
                        backgroundColor: 'rgba(211, 47, 47, 0.04)',
                      },
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );

  // Render desktop table view
  const renderDesktopView = () => (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <ContainerTypeList
        containerTypes={containerTypes}
        loading={loading}
        onEdit={handleOpenFormForEdit}
        onDelete={handleDeleteClick}
        error={error}
      />
    </Paper>
  );

  // Floating Add Button for Mobile
  const FloatingAddButton = () => (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 16,
        zIndex: 1000,
        display: { xs: 'block', md: 'none' },
      }}
    >
      <AddButton
        onClick={handleOpenFormForAdd}
        size="large"
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          boxShadow: theme.shadows[8],
          '&:hover': {
            boxShadow: theme.shadows[12],
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      />
    </Box>
  );

  return (
    <Box sx={{ p: 2, position: 'relative' }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      ) : loading && containerTypes.length === 0 ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : isMobile ? (
        renderMobileView()
      ) : (
        <Box>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Quản lý loại container
            </Typography>
            <AddButton onClick={handleOpenFormForAdd} label="Thêm loại container" size="small" />
          </Box>
          {renderDesktopView()}
        </Box>
      )}

      {/* Container Type Form */}
      <ContainerTypeForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveContainerType}
        containerType={selectedContainerType}
        isLoading={loading}
        error={formError}
      />

      {/* Floating Add Button for Mobile */}
      <FloatingAddButton />

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

      <ConfirmationDialog
        open={deleteDialog.open}
        onCancel={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa loại container"
        message={
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn xóa loại container này?
            </Typography>
            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Loại container:
                </Typography>
                <Typography variant="body2">{deleteDialog.containerType?.type}</Typography>

                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Mô tả:
                </Typography>
                <Typography variant="body2">
                  {deleteDialog.containerType?.description || 'Không có mô tả'}
                </Typography>
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

export default LoaiContainer;
