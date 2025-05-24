import React, { useState, useEffect, useCallback } from 'react';
import ConfirmationDialog from '@shared/components/ConfirmationDialog';
import StandardTable from '@shared/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@shared/components/ActionButtons';

import {
  Box,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Mock API - Replace with actual API calls
const mockApi = {
  getContainerTypes: async () => ({
    data: [
      { id: 1, type: "20'DC", description: 'Container khô 20 feet tiêu chuẩn' },
      { id: 2, type: "40'DC", description: 'Container khô 40 feet tiêu chuẩn' },
      { id: 3, type: "40'HC", description: 'Container cao 40 feet' },
      { id: 4, type: "40'RF", description: 'Container lạnh 40 feet' },
      { id: 5, type: "40'OT", description: 'Container mở nóc 40 feet' },
      { id: 6, type: "45'HC", description: 'Container cao 45 feet' },
    ],
  }),
  addContainerType: async data => ({
    id: Date.now(),
    ...data,
  }),
  updateContainerType: async (id, data) => ({
    id,
    ...data,
  }),
  deleteContainerType: async id => id,
};

const LoaiContainer = () => {
  const [containerTypes, setContainerTypes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    containerTypeId: null,
    details: '',
  });

  const [formData, setFormData] = useState({
    type: '',
    description: '',
  });

  const [errors, setErrors] = useState({});

  const fetchContainerTypes = async () => {
    setIsLoading(true);
    try {
      const response = await mockApi.getContainerTypes();
      setContainerTypes(response.data || []);
      setError('');
    } catch (err) {
      setError('Không thể tải danh sách loại container');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainerTypes();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseDialog = useCallback(() => {
    setFormData({
      type: '',
      description: '',
    });
    setErrors({});
    setIsEdit(false);
    setOpenDialog(false);
  }, []);

  // Handle ESC key press to close dialog
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && openDialog) {
        handleCloseDialog();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDialog, handleCloseDialog]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.type.trim()) {
      newErrors.type = 'Vui lòng nhập loại container';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData({
      type: '',
      description: '',
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = containerType => {
    setIsEdit(true);
    setFormData({
      type: containerType.type,
      description: containerType.description || '',
      id: containerType.id,
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const data = {
        type: formData.type.trim(),
        description: formData.description.trim(),
      };

      if (isEdit) {
        await mockApi.updateContainerType(formData.id, data);
        showSnackbar('Cập nhật loại container thành công');
      } else {
        await mockApi.addContainerType(data);
        showSnackbar('Thêm loại container mới thành công');
      }
      await fetchContainerTypes();
      handleCloseDialog();
    } catch (err) {
      const errorMessage = isEdit
        ? 'Đã xảy ra lỗi khi cập nhật loại container'
        : 'Đã xảy ra lỗi khi thêm loại container mới';
      showSnackbar(errorMessage, 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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

    setIsLoading(true);
    try {
      await mockApi.deleteContainerType(deleteDialog.containerTypeId);
      showSnackbar('Xóa loại container thành công');
      await fetchContainerTypes();
      handleDeleteClose();
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa loại container', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDialog = () => {
    return (
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <DialogTitle
          sx={{
            p: '16px 24px',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
            {isEdit ? 'Chỉnh sửa loại container' : 'Thêm loại container mới'}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: '24px' }}>
          <DialogContentText
            sx={{
              mb: 3,
              color: 'text.primary',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            {isEdit ? 'Cập nhật thông tin loại container.' : 'Nhập thông tin loại container mới.'}
          </DialogContentText>

          <Box component="form" noValidate autoComplete="off" sx={{ '& > :not(style)': { mb: 2 } }}>
            <TextField
              fullWidth
              size="small"
              label="Loại container"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              error={!!errors.type}
              helperText={errors.type || "Ví dụ: 20'DC"}
              variant="outlined"
              margin="none"
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                style: {
                  height: '40px',
                  padding: '8px 12px',
                  boxSizing: 'border-box',
                  fontSize: '0.875rem',
                },
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'text.secondary',
                  },
                },
              }}
            />

            <TextField
              fullWidth
              size="small"
              label="Mô tả (tùy chọn)"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              variant="outlined"
              margin="none"
              multiline
              rows={3}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                style: {
                  padding: '12px',
                  boxSizing: 'border-box',
                  fontSize: '0.875rem',
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'text.secondary',
                  },
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p: '16px 24px',
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'flex-end',
            gap: '12px',
            '& > *': {
              margin: '0 !important',
            },
          }}
        >
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            color="inherit"
            size="small"
            sx={{
              height: '36px',
              px: '16px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'text.primary',
              borderColor: 'action.disabled',
              borderRadius: '6px',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'text.secondary',
                backgroundColor: 'action.hover',
              },
              '&:active': {
                backgroundColor: 'action.selected',
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            variant="contained"
            color="primary"
            size="small"
            sx={{
              height: '36px',
              px: '20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '6px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                backgroundColor: 'primary.dark',
              },
              '&:active': {
                boxShadow: 'none',
                backgroundColor: 'primary.dark',
              },
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'text.disabled',
              },
            }}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {isLoading ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <StandardTable
            headerAction={<AddButton onClick={handleOpenAddDialog} size="small" sx={{ ml: 2 }} />}
            columns={[
              {
                key: 'type',
                label: 'Loại container',
              },
              {
                key: 'description',
                label: 'Mô tả',
                maxWidth: 400,
                noWrap: true,
                render: value => value || 'Không có mô tả',
                getColor: value => (value ? 'text.primary' : 'text.disabled'),
              },
            ]}
            data={containerTypes}
            loading={isLoading}
            emptyMessage="Không có dữ liệu loại container"
            renderActions={row => (
              <>
                <EditButton
                  onClick={e => {
                    e.stopPropagation();
                    handleOpenEditDialog(row);
                  }}
                />
                <DeleteButton
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteClick(row);
                  }}
                />
              </>
            )}
          />
        </Paper>
      )}

      {/* Render dialogs */}
      {renderDialog()}

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
