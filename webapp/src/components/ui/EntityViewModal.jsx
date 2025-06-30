import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import BaseModal from './BaseModal';
import ModalHeader from './ModalHeader';
import ModalBody from './ModalBody';
import ModalFooter from './ModalFooter';

/**
 * EntityViewModal - Specialized modal for viewing/editing entities
 * Perfect for ExpenseViewModal, InvoiceViewModal, ExpenseCategoryModal patterns
 */
const EntityViewModal = ({
  // Base modal props
  open,
  onClose,
  size = 'fullScreen',
  className = '',
  
  // Header props
  title,
  subtitle,
  icon,
  headerActions,
  
  // Entity and editing
  entityData = null,
  isEditing = false,
  onEditClick,
  onSaveEdit,
  onCancelEdit,
  isSaving = false,
  
  // Status management
  showStatusBadge = false,
  status,
  statusOptions = [],
  onStatusChange,
  
  // Payment proof
  showPaymentProof = false,
  paymentProofUrl = null,
  
  // Content
  children,
  loading = false,
  error = null,
  success = null,
  
  // Footer customization
  showAddButton = false,
  onAddItem,
  addButtonText = 'Thêm hạng mục',
  leftActions,
  
  // Button text customization
  editButtonText = 'Sửa',
  saveButtonText = 'Lưu',
  cancelButtonText = 'Hủy',
  closeButtonText = 'Đóng',
  
  // Advanced
  disableEdit = false,
  customHeader = null,
  customFooter = null,
  bodyPadding = 'default',
  id
}) => {
  const [localError, setLocalError] = useState(null);
  const [localSuccess, setLocalSuccess] = useState(null);

  // Clear local messages when modal opens/closes
  useEffect(() => {
    if (!open) {
      setLocalError(null);
      setLocalSuccess(null);
    }
  }, [open]);

  // Handle edit click
  const handleEditClick = () => {
    if (onEditClick) {
      onEditClick();
    }
  };

  // Handle save with error handling
  const handleSaveEdit = async () => {
    if (!onSaveEdit) return;

    setLocalError(null);
    setLocalSuccess(null);

    try {
      await onSaveEdit();
      setLocalSuccess('Lưu thành công');
    } catch (err) {
      setLocalError(err.message || 'Có lỗi xảy ra khi lưu');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setLocalError(null);
    setLocalSuccess(null);
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  // Determine modal mode
  const modalMode = isEditing ? 'edit' : 'view';

  // Combine errors and success messages
  const combinedError = error || localError;
  const combinedSuccess = success || localSuccess;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size={size}
      className={className}
      id={id}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-content`}
    >
      {/* Header */}
      {customHeader || (
        <ModalHeader
          id={`${id}-title`}
          title={title}
          subtitle={subtitle}
          icon={icon}
          actions={headerActions}
          onClose={onClose}
          
          // Status management
          showStatusBadge={showStatusBadge}
          status={status}
          statusOptions={statusOptions}
          isEditing={isEditing}
          onStatusChange={onStatusChange}
          
          // Payment proof
          showPaymentProof={showPaymentProof}
          paymentProofUrl={paymentProofUrl}
          
          // Entity data
          entityData={entityData}
          loading={loading}
        />
      )}

      {/* Body */}
      <ModalBody
        id={`${id}-content`}
        loading={loading}
        error={combinedError}
        success={combinedSuccess}
        padding={bodyPadding}
      >
        {children}
      </ModalBody>

      {/* Footer */}
      {customFooter || (
        <ModalFooter
          mode={modalMode}
          
          // View mode
          onEdit={!disableEdit ? handleEditClick : undefined}
          onClose={onClose}
          editButtonText={editButtonText}
          closeButtonText={closeButtonText}
          
          // Edit mode
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
          saveButtonText={saveButtonText}
          cancelButtonText={cancelButtonText}
          
          // Left actions
          leftActions={leftActions}
          showAddButton={showAddButton && isEditing}
          onAddItem={onAddItem}
          addButtonText={addButtonText}
          
          // Disable all actions when loading
          disabled={loading}
        />
      )}
    </BaseModal>
  );
};

EntityViewModal.propTypes = {
  // Base modal props
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'fullScreen']),
  className: PropTypes.string,
  
  // Header props
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node,
  headerActions: PropTypes.node,
  
  // Entity and editing
  entityData: PropTypes.object,
  isEditing: PropTypes.bool,
  onEditClick: PropTypes.func,
  onSaveEdit: PropTypes.func,
  onCancelEdit: PropTypes.func,
  isSaving: PropTypes.bool,
  
  // Status management
  showStatusBadge: PropTypes.bool,
  status: PropTypes.string,
  statusOptions: PropTypes.array,
  onStatusChange: PropTypes.func,
  
  // Payment proof
  showPaymentProof: PropTypes.bool,
  paymentProofUrl: PropTypes.string,
  
  // Content
  children: PropTypes.node,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  success: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  
  // Footer customization
  showAddButton: PropTypes.bool,
  onAddItem: PropTypes.func,
  addButtonText: PropTypes.string,
  leftActions: PropTypes.node,
  
  // Button text customization
  editButtonText: PropTypes.string,
  saveButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  closeButtonText: PropTypes.string,
  
  // Advanced
  disableEdit: PropTypes.bool,
  customHeader: PropTypes.node,
  customFooter: PropTypes.node,
  bodyPadding: PropTypes.oneOf(['none', 'sm', 'default', 'lg']),
  id: PropTypes.string
};

export default EntityViewModal;