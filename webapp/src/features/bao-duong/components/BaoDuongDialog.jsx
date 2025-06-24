import React from 'react';
import { ExpenseForm } from '@components/shared';
import './BaoDuongDialog.css';

const BaoDuongDialog = ({
  open,
  isEdit,
  isLoading,
  formData,
  errors = {},
  onClose,
  onChange,
  onSave,
  licensePlates = [],
  isLoadingPlates = false,
}) => {
  return (
    <ExpenseForm
      open={open}
      isEdit={isEdit}
      isLoading={isLoading}
      formData={formData}
      errors={errors}
      onClose={onClose}
      onChange={onChange}
      onSave={onSave}
      licensePlates={licensePlates}
      isLoadingPlates={isLoadingPlates}
      expenseCategoryId={1} // Fixed category for BaoDuong (maintenance)
      title={isEdit ? 'Sửa thông tin bảo dưỡng' : 'Nhập thông tin bảo dưỡng'}
    />
  );
};

export default BaoDuongDialog;
