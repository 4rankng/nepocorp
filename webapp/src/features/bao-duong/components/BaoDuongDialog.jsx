import React from 'react';
import MaintenanceDialog from './MaintenanceDialog';
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
  onInvoiceClick,
  licensePlates = [],
  isLoadingPlates = false,
}) => {
  return (
    <MaintenanceDialog
      open={open}
      isEdit={isEdit}
      isLoading={isLoading}
      formData={formData}
      errors={errors}
      onClose={onClose}
      onChange={onChange}
      onSave={onSave}
      onInvoiceClick={onInvoiceClick}
      licensePlates={licensePlates}
      isLoadingPlates={isLoadingPlates}
    />
  );
};

export default BaoDuongDialog;
