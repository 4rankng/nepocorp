import React, { useState } from 'react';
import HandshakeIcon from '@mui/icons-material/Handshake';
import {
  Box,
  Alert,
  Snackbar,
  CircularProgress,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import ConfirmDialog from '@/components/ConfirmDialog';
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
    setDeleteDialog({ open: true, data: partner });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.data) {
      const result = await deletePartner(deleteDialog.data.id);
      if (result.success) {
        showSnackbar('Xóa đối tác thành công');
      } else {
        showSnackbar(result.error || 'Có lỗi xảy ra khi xóa đối tác', 'error');
      }
    }
    setDeleteDialog({ open: false, data: null });
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
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onCancel={() => setDeleteDialog({ open: false, data: null })}
        onConfirm={handleDeleteConfirm}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HandshakeIcon color="error" />
            <span>Xóa đối tác</span>
          </Box>
        }
        message="Bạn có chắc chắn muốn xóa đối tác này?"
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
        type="delete"
        content={() => (
          <Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="error.main" gutterBottom>
                Thông tin đối tác:
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  Tên đối tác:
                </Typography>
                <Typography variant="body2">{deleteDialog.data?.ten || '-'}</Typography>

                <Typography variant="body2" fontWeight={500}>
                  Địa chỉ:
                </Typography>
                <Typography variant="body2">
                  {deleteDialog.data?.dia_chi || 'Chưa sửa'}
                </Typography>

                <Typography variant="body2" fontWeight={500}>
                  Mã số thuế:
                </Typography>
                <Typography variant="body2">
                  {deleteDialog.data?.ma_so_thue || 'Chưa sửa'}
                </Typography>
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
export default QuanLyDoiTac;
