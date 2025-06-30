import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  CircularProgress,
  Typography,
  Pagination,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import StandardModal from '@components/ui/StandardModal';
import StandardModalHeader from '@components/ui/StandardModalHeader';
import StandardModalActions from '@components/ui/StandardModalActions';
import useExpenseCategories from '@hooks/useExpenseCategories';
import ConfirmDialog from '@components/ConfirmDialog';

const ExpenseCategoryModal = ({ open, onClose }) => {
  const {
    categories,
    isLoading,
    error,
    pagination,
    createCategory,
    updateCategory,
    deleteCategory
  } = useExpenseCategories();

  const [editingCategory, setEditingCategory] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    category_key: '',
    name: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setEditingCategory(null);
    setIsCreating(false);
    setFormData({
      category_key: '',
      name: '',
      description: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.category_key.trim()) {
      errors.category_key = 'Category key is required';
    } else if (!/^[A-Z_]+$/.test(formData.category_key.trim())) {
      errors.category_key = 'Category key must contain only uppercase letters and underscores';
    }

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    // Check for duplicate category key (only when creating or changing key)
    const isDuplicateKey = categories.some(cat =>
      cat.category_key === formData.category_key.trim() &&
      (!editingCategory || cat.id !== editingCategory.id)
    );

    if (isDuplicateKey) {
      errors.category_key = 'Category key already exists';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({
      category_key: '',
      name: '',
      description: ''
    });
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      category_key: category.category_key || '',
      name: category.name || '',
      description: category.description || ''
    });
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setActionLoading(true);
    try {
      const categoryData = {
        category_key: formData.category_key.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
        setSnackbarMessage('Category updated successfully');
      } else {
        await createCategory(categoryData);
        setSnackbarMessage('Category created successfully');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      setSnackbarMessage('Error saving category: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (category) => {
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const isFormActive = isCreating || editingCategory;

  return (
    <>
      <StandardModal open={open} onClose={onClose}>
        <StandardModalHeader
          title="Quản lý Danh mục Chi phí"
          onClose={onClose}
        />

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-800 text-sm mb-4 shadow-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="font-medium">
                  Lỗi: {error}
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {snackbarMessage && (
            <div className="p-4 bg-green-100 border-2 border-green-300 rounded-lg text-green-800 text-sm mb-4 shadow-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="font-medium">
                  {snackbarMessage}
                </div>
                <button
                  onClick={() => setSnackbarMessage('')}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Add/Edit Form */}
          {isFormActive && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCategory ? 'Sửa Danh mục' : 'Thêm Danh mục mới'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <TextField
                  label="Category Key *"
                  value={formData.category_key}
                  onChange={(e) => handleInputChange('category_key', e.target.value.toUpperCase())}
                  error={!!formErrors.category_key}
                  helperText={formErrors.category_key || 'Use uppercase letters and underscores only (e.g., FUEL_COST)'}
                  disabled={actionLoading}
                  placeholder="FUEL_COST"
                />

                <TextField
                  label="Name *"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  disabled={actionLoading}
                  placeholder="Fuel Cost"
                />
              </div>

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={3}
                fullWidth
                disabled={actionLoading}
                placeholder="Detailed description of the expense category"
              />

              <div className="flex gap-2 mt-4">
                <button
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                  onClick={handleSave}
                  disabled={actionLoading}
                >
                  {actionLoading ? <CircularProgress size={16} /> : <SaveIcon sx={{ fontSize: 16 }} />}
                  <span>{editingCategory ? 'Cập nhật' : 'Tạo mới'}</span>
                </button>

                <button
                  className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                  onClick={resetForm}
                  disabled={actionLoading}
                >
                  <CancelIcon sx={{ fontSize: 16 }} />
                  <span>Hủy</span>
                </button>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <div className="mb-4">
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Category Key</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell>Last Updated By</TableCell>
                      <TableCell width={120}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No categories found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow key={category.id} hover>
                          <TableCell>{category.id}</TableCell>
                          <TableCell>
                            <Chip
                              label={category.category_key || '-'}
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{category.name}</TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap>
                              {category.description || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDate(category.created_at)}</TableCell>
                          <TableCell>{formatDate(category.updated_at)}</TableCell>
                          <TableCell>{category.last_updated_by || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(category)}
                                  disabled={isFormActive || actionLoading}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(category)}
                                  disabled={isFormActive || actionLoading}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    count={pagination.total_pages}
                    page={pagination.page}
                    onChange={(_, page) => pagination.onPageChange(page)}
                    disabled={isLoading || actionLoading}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <StandardModalActions
          primaryAction={!isFormActive ? {
            label: 'Thêm',
            onClick: handleCreate,
            disabled: isLoading,
            startIcon: <AddIcon />
          } : null}
          secondaryAction={{
            label: 'Đóng',
            onClick: onClose,
            disabled: actionLoading
          }}
        />
      </StandardModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onCancel={() => setDeleteDialog({ open: false, category: null })}
        onConfirm={handleDeleteConfirm}
        isLoading={actionLoading}
        type="delete"
        title="Delete Expense Category"
        message="Are you sure you want to delete this expense category?"
        details={deleteDialog.category ? {
          'Category Key': deleteDialog.category.category_key,
          'Name': deleteDialog.category.name,
          'Description': deleteDialog.category.description || 'No description'
        } : null}
      />
    </>
  );
};

export default ExpenseCategoryModal;
