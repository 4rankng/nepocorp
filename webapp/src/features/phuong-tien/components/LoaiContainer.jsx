import React, { useState } from 'react';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
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
  TextField,
  InputAdornment,
  Fab,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';

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

  const [searchTerm, setSearchTerm] = useState('');

  // Filter container types based on search term
  const filteredContainerTypes = React.useMemo(() => {
    if (!searchTerm.trim()) return containerTypes;
    const search = searchTerm.toLowerCase();
    return containerTypes.filter(
      item =>
        (item.type && item.type.toLowerCase().includes(search)) ||
        (item.description && item.description.toLowerCase().includes(search))
    );
  }, [containerTypes, searchTerm]);

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {filteredContainerTypes.map(item => (
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
      ))}
      {!loading && filteredContainerTypes.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          {searchTerm ? 'Không tìm thấy loại container phù hợp' : 'Không có dữ liệu loại container'}
        </Typography>
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
        containerTypes={filteredContainerTypes}
        loading={loading}
        onEdit={handleOpenFormForEdit}
        onDelete={handleDeleteClick}
        error={error}
      />
    </Paper>
  );

  return (
    <Box>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo loại hoặc mô tả..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {/* Loading state */}
      {loading && (
        <Box textAlign="center" py={4}>
          <Typography>Đang tải dữ liệu...</Typography>
        </Box>
      )}
      {/* Error state */}
      {error && (
        <Box color="error.main" py={2}>
          <Typography>{error}</Typography>
        </Box>
      )}
      {/* Content */}
      {!loading && !error && <>{isMobile ? renderMobileView() : renderDesktopView()}</>}
      {/* FAB for add at bottom right (always visible) */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleOpenFormForAdd}
        sx={{
          position: 'fixed',
          bottom: { xs: 24, md: 32 },
          right: { xs: 24, md: 32 },
          zIndex: 1201,
          boxShadow: 6,
        }}
      >
        <AddIcon />
      </Fab>

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
