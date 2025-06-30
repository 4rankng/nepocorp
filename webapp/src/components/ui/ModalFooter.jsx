import React from 'react';
import PropTypes from 'prop-types';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

/**
 * ModalFooter - Unified footer component for all modals
 * Merges patterns from ExpenseActionButtons, ModalFooter, and custom footers
 */
const ModalFooter = ({
  // Mode configuration
  mode = 'view', // 'view', 'edit', 'form', 'confirm'

  // View mode props
  onEdit,
  onClose,
  editButtonText = 'Sửa',
  closeButtonText = 'Đóng',
  editButtonIcon = <EditIcon sx={{ fontSize: 16 }} />,

  // Edit mode props
  onSave,
  onCancel,
  isSaving = false,
  saveButtonText = 'Lưu',
  cancelButtonText = 'Hủy',
  saveButtonIcon = <SaveIcon sx={{ fontSize: 16 }} />,
  cancelButtonIcon = <CancelIcon sx={{ fontSize: 16 }} />,
  savingText = 'Đang lưu...',

  // Form mode props
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Gửi',
  submittingText = 'Đang gửi...',

  // Confirm mode props
  onConfirm,
  confirmButtonText = 'Xác nhận',
  confirmButtonVariant = 'primary', // 'primary', 'danger'
  isConfirming = false,
  confirmingText = 'Đang xử lý...',

  // Left side actions
  leftActions,
  showAddButton = false,
  onAddItem,
  addButtonText = 'Thêm',
  addButtonIcon = <AddIcon sx={{ fontSize: 16 }} />,

  // General props
  className = '',
  disabled = false,
  id,
}) => {
  // Button style configurations
  const buttonStyles = {
    primary:
      'px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed',
    secondary:
      'px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed',
    danger:
      'px-4 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed',
    success:
      'px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed',
  };

  // Render left actions
  const renderLeftActions = () => {
    if (mode === 'edit' && showAddButton && onAddItem) {
      return (
        <button
          onClick={onAddItem}
          className={buttonStyles.success}
          disabled={disabled || isSaving}
        >
          {addButtonIcon}
          <span className="ml-1">{addButtonText}</span>
        </button>
      );
    }

    return leftActions || <div></div>;
  };

  // Render right actions based on mode
  const renderRightActions = () => {
    switch (mode) {
      case 'view':
        return (
          <div className="flex gap-2">
            <button onClick={onClose} className={buttonStyles.secondary} disabled={disabled}>
              {closeButtonText}
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className={`${buttonStyles.primary} flex items-center gap-1`}
                disabled={disabled}
              >
                {editButtonIcon}
                <span>{editButtonText}</span>
              </button>
            )}
          </div>
        );

      case 'edit':
        return (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className={buttonStyles.secondary}
              disabled={disabled || isSaving}
            >
              {cancelButtonIcon && <span className="mr-1">{cancelButtonIcon}</span>}
              {cancelButtonText}
            </button>
            <button
              onClick={onSave}
              className={`${buttonStyles.primary} flex items-center gap-1`}
              disabled={disabled || isSaving}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                saveButtonIcon
              )}
              <span>{isSaving ? savingText : saveButtonText}</span>
            </button>
          </div>
        );

      case 'form':
        return (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={buttonStyles.secondary}
              disabled={disabled || isSubmitting}
            >
              {cancelButtonText}
            </button>
            <button
              onClick={onSubmit}
              className={`${buttonStyles.primary} flex items-center gap-1`}
              disabled={disabled || isSubmitting}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                saveButtonIcon
              )}
              <span>{isSubmitting ? submittingText : submitButtonText}</span>
            </button>
          </div>
        );

      case 'confirm':
        const confirmStyle =
          confirmButtonVariant === 'danger' ? buttonStyles.danger : buttonStyles.primary;
        return (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={buttonStyles.secondary}
              disabled={disabled || isConfirming}
            >
              {cancelButtonText}
            </button>
            <button
              onClick={onConfirm}
              className={`${confirmStyle} flex items-center gap-1`}
              disabled={disabled || isConfirming}
            >
              {isConfirming ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                confirmButtonVariant === 'danger' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )
              )}
              <span>{isConfirming ? confirmingText : confirmButtonText}</span>
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`px-4 py-3 border-t border-gray-200 flex justify-between items-center ${className}`}
      id={id}
    >
      {renderLeftActions()}
      {renderRightActions()}
    </div>
  );
};

ModalFooter.propTypes = {
  // Mode configuration
  mode: PropTypes.oneOf(['view', 'edit', 'form', 'confirm']),

  // View mode props
  onEdit: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  editButtonText: PropTypes.string,
  closeButtonText: PropTypes.string,
  editButtonIcon: PropTypes.node,

  // Edit mode props
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
  isSaving: PropTypes.bool,
  saveButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  saveButtonIcon: PropTypes.node,
  cancelButtonIcon: PropTypes.node,
  savingText: PropTypes.string,

  // Form mode props
  onSubmit: PropTypes.func,
  isSubmitting: PropTypes.bool,
  submitButtonText: PropTypes.string,
  submittingText: PropTypes.string,

  // Confirm mode props
  onConfirm: PropTypes.func,
  confirmButtonText: PropTypes.string,
  confirmButtonVariant: PropTypes.oneOf(['primary', 'danger']),
  isConfirming: PropTypes.bool,
  confirmingText: PropTypes.string,

  // Left side actions
  leftActions: PropTypes.node,
  showAddButton: PropTypes.bool,
  onAddItem: PropTypes.func,
  addButtonText: PropTypes.string,
  addButtonIcon: PropTypes.node,

  // General props
  className: PropTypes.string,
  disabled: PropTypes.bool,
  id: PropTypes.string,
};

export default ModalFooter;
