import React from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  TextField,
  Fab,
  useMediaQuery,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useDinhMucDiDuongLogic } from './useDinhMucDiDuong';
import DinhMucForm from './DinhMucForm';
import DinhMucTable from './DinhMucTable';
import DeleteDialog from '@/components/DeleteDialog';

const DinhMucDiDuong = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    // Data
    paginatedData,
    filteredData,
    containerTypes,

    // Loading states
    isLoading,
    error,
    isSaving,
    isDeleting,

    // Edit states
    editingId,
    editedData,
    isAddingNew,
    itemToDelete,

    // Pagination and search
    pagination,
    setPagination,
    searchTerm,
    setSearchTerm,

    // Handlers
    onSubmit,
    handleDeleteClick,
    handleConfirmDelete,
    handleEditClick,
    handleAddNew,
    handleCancelEdit,
    handleInputChange,
    setIsDeleting,
    setItemToDelete,
  } = useDinhMucDiDuongLogic();

  return (
    <Box sx={{ p: 2, maxWidth: '100%', overflow: 'hidden' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
        Định mức đi đường
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Search and Add New Section */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 250 }}
        />

        <Fab
          color="primary"
          size={isMobile ? "medium" : "large"}
          onClick={handleAddNew}
          sx={{
            boxShadow: theme.shadows[4],
            '&:hover': {
              boxShadow: theme.shadows[6],
            }
          }}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Add New Form */}
      {isAddingNew && (
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white' }}>
            Thêm định mức
          </Typography>
          <DinhMucForm
            editedData={editedData}
            containerTypes={containerTypes}
            onSubmit={onSubmit}
            onCancel={handleCancelEdit}
            isSaving={isSaving}
            isEditing={false}
          />
        </Paper>
      )}

      {/* Main Table */}
      <DinhMucTable
        paginatedData={paginatedData}
        filteredData={filteredData}
        containerTypes={containerTypes}
        pagination={pagination}
        setPagination={setPagination}
        editingId={editingId}
        editedData={editedData}
        isSaving={isSaving}
        isLoading={isLoading}
        error={error}
        onEditClick={handleEditClick}
        onCancelEdit={handleCancelEdit}
        onDeleteClick={handleDeleteClick}
        onInputChange={handleInputChange}
        onSubmit={onSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={isDeleting}
        onClose={() => {
          setIsDeleting(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa"
        content={`Bạn có chắc chắn muốn xóa tuyến đường "${itemToDelete?.ma_tuyen}" không?`}
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </Box>
  );
};

export default DinhMucDiDuong;
