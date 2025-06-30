import React, { useState, useEffect } from 'react';
import { IconButton, CircularProgress, Tooltip, Chip } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import StandardModal from '@components/ui/StandardModal';
import StandardModalHeader from '@components/ui/StandardModalHeader';
import StandardModalActions from '@components/ui/StandardModalActions';
import StandardTable from '@components/StandardTable';
import useExpenseCategories from '@hooks/useExpenseCategories';
import ConfirmDialog from '@components/ConfirmDialog';
import AddExpenseCategoryModal from './AddExpenseCategoryModal';
import { Button } from '@/components/ui/buttons';

const ExpenseCategoryModal = ({ open, onClose }) => {
  const {
    categories,
    isLoading,
    error,
    pagination,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useExpenseCategories();

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setShowAddModal(false);
      setSnackbarMessage('');
    }
  }, [open]);

  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleAddSuccess = message => {
    setSnackbarMessage(message);
    setShowAddModal(false);
  };

  const handleDelete = category => {
    setDeleteDialog({ open: true, category });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.category) return;

    setActionLoading(true);
    try {
      await deleteCategory(deleteDialog.category.id);
      setSnackbarMessage('Category deleted successfully');
      setDeleteDialog({ open: false, category: null });
    } catch (error) {
      console.error('Error deleting category:', error);
      setSnackbarMessage('Error deleting category: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const columns = [
    {
      key: 'name',
      label: 'Tên danh mục',
      sortable: true,
    },
    {
      key: 'description',
      label: 'Mô tả',
      render: value => value || '-',
    },
    {
      key: 'created_at',
      label: 'Ngày tạo',
      render: value => formatDate(value),
      sortable: true,
    },
  ];

  const renderActions = category => (
    <div className="flex gap-1">
      <Tooltip title="Xóa">
        <IconButton
          size="small"
          onClick={() => handleDelete(category)}
          disabled={actionLoading}
          color="error"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </div>
  );

  return (
    <>
      <StandardModal open={open} onClose={onClose}>
        <StandardModalHeader title="Quản lý Danh mục Chi phí" onClose={onClose} />

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-800 text-sm mb-4 shadow-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="font-medium">Lỗi: {error}</div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {snackbarMessage && (
            <div className="p-4 bg-green-100 border-2 border-green-300 rounded-lg text-green-800 text-sm mb-4 shadow-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="font-medium">{snackbarMessage}</div>
                <button
                  onClick={() => setSnackbarMessage('')}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <div className="mb-4"></div>

          <StandardTable
            columns={columns}
            data={categories}
            renderActions={renderActions}
            loading={isLoading}
            emptyMessage="Không có danh mục chi phí nào"
            pagination={true}
            page={pagination.page - 1}
            totalCount={pagination.total_count}
            onPageChange={newPage => pagination.onPageChange(newPage + 1)}
            showSTT={true}
            sortable={true}
          />
        </div>

        <StandardModalActions
          primaryAction={{
            label: 'Thêm',
            onClick: handleOpenAddModal,
            disabled: isLoading,
            startIcon: <AddIcon />,
          }}
          secondaryAction={{
            label: 'Đóng',
            onClick: onClose,
            disabled: actionLoading,
          }}
        />
      </StandardModal>

      {/* Add Category Modal */}
      <AddExpenseCategoryModal
        open={showAddModal}
        onClose={handleCloseAddModal}
        onSuccess={handleAddSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onCancel={() => setDeleteDialog({ open: false, category: null })}
        onConfirm={handleDeleteConfirm}
        isLoading={actionLoading}
        type="delete"
        title="Delete Expense Category"
        message="Are you sure you want to delete this expense category?"
        details={
          deleteDialog.category
            ? {
                'Category Key': deleteDialog.category.category_key,
                Name: deleteDialog.category.name,
                Description: deleteDialog.category.description || 'No description',
              }
            : null
        }
      />
    </>
  );
};

export default ExpenseCategoryModal;
