import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { EnhancedFormModal } from '@/components/ui/modals';
import useExpenseCategories from '@/hooks/useExpenseCategories';

const AddExpenseCategoryModal = ({ open, onClose, onSuccess }) => {
  const { createCategory } = useExpenseCategories();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên danh mục là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return false;

    setIsSubmitting(true);
    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null
      };

      await createCategory(categoryData);

      // Reset form
      setFormData({ name: '', description: '' });
      setErrors({});

      // Notify parent of success
      if (onSuccess) {
        onSuccess('Tạo danh mục thành công');
      }

      return true; // Indicates successful submission
    } catch (error) {
      console.error('Error creating category:', error);
      setErrors({ submit: error.message || 'Có lỗi xảy ra khi tạo danh mục' });
      return false; // Indicates failed submission
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({ name: '', description: '' });
    setErrors({});
    onClose();
  };

  return (
    <EnhancedFormModal
      open={open}
      onClose={handleClose}
      title="Thêm danh mục chi phí"
      icon={<AddIcon />}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitButtonText="Thêm"
      cancelButtonText="Hủy"
      submittingText="Đang tạo..."
      size="md"
      resetOnClose={true}
      closeOnSuccess={true}
    >
      <div className="space-y-4">
        {/* Error message */}
        {errors.submit && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Name field */}
        <TextField
          label="Tên danh mục *"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={!!errors.name}
          helperText={errors.name || 'Ví dụ: Nhiên liệu, Bảo dưỡng định kỳ'}
          disabled={isSubmitting}
          fullWidth
          placeholder="Nhập tên danh mục"
        />

        {/* Description field */}
        <TextField
          label="Mô tả"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          multiline
          rows={3}
          fullWidth
          disabled={isSubmitting}
          placeholder="Mô tả chi tiết về danh mục chi phí này"
          helperText="Mô tả này sẽ giúp người dùng hiểu rõ hơn về danh mục"
        />
      </div>
    </EnhancedFormModal>
  );
};

export default AddExpenseCategoryModal;
