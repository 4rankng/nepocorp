import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import BaseModal from './BaseModal';
import ModalHeader from './ModalHeader';
import ModalBody from './ModalBody';
import ModalFooter from './ModalFooter';

/**
 * EnhancedFormModal - Specialized modal for forms
 * Replaces existing FormModal with unified design patterns
 * Perfect for EditProfileModal, InvoiceItemEditModal, AddDinhMucBoSung
 */
const EnhancedFormModal = ({
  // Base modal props
  open,
  onClose,
  size = 'md',
  className = '',
  
  // Header props
  title,
  subtitle,
  icon,
  headerActions,
  
  // Form handling
  onSubmit,
  isSubmitting = false,
  formData = {},
  errors = {},
  
  // Content
  children,
  loading = false,
  
  // Validation and messages
  validateOnSubmit = true,
  onValidate,
  showSuccessMessage = true,
  successMessage = 'Thành công!',
  
  // Button customization
  submitButtonText = 'Lưu',
  cancelButtonText = 'Hủy',
  submittingText = 'Đang xử lý...',
  
  // Form behavior
  resetOnClose = true,
  resetOnSuccess = false,
  closeOnSuccess = true,
  
  // Advanced
  customHeader = null,
  customFooter = null,
  bodyPadding = 'default',
  disableSubmitOnEnter = false,
  id
}) => {
  const [localErrors, setLocalErrors] = useState({});
  const [localSuccess, setLocalSuccess] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Clear states when modal opens/closes
  useEffect(() => {
    if (!open) {
      setLocalErrors({});
      setLocalSuccess(null);
      setIsProcessing(false);
    }
  }, [open]);

  // Handle form submission
  const handleSubmit = async (event) => {
    if (event) {
      event.preventDefault();
    }

    if (!onSubmit || isSubmitting || isProcessing) return;

    setLocalErrors({});
    setLocalSuccess(null);
    setIsProcessing(true);

    try {
      // Run validation if provided
      if (validateOnSubmit && onValidate) {
        const validationErrors = await onValidate(formData);
        if (validationErrors && Object.keys(validationErrors).length > 0) {
          setLocalErrors(validationErrors);
          setIsProcessing(false);
          return;
        }
      }

      // Submit the form
      const result = await onSubmit(formData);

      // Handle success
      if (showSuccessMessage) {
        setLocalSuccess(successMessage);
      }

      // Reset form data if requested
      if (resetOnSuccess && typeof resetOnSuccess === 'function') {
        resetOnSuccess();
      }

      // Close modal if requested
      if (closeOnSuccess) {
        setTimeout(() => {
          onClose();
        }, showSuccessMessage ? 1500 : 0);
      }

      return result;
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Handle different error formats
      if (error.errors && typeof error.errors === 'object') {
        setLocalErrors(error.errors);
      } else if (error.message) {
        setLocalErrors({ _general: error.message });
      } else {
        setLocalErrors({ _general: 'Có lỗi xảy ra. Vui lòng thử lại.' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cancel/close
  const handleCancel = () => {
    if (isSubmitting || isProcessing) return;
    
    setLocalErrors({});
    setLocalSuccess(null);
    
    if (resetOnClose && typeof resetOnClose === 'function') {
      resetOnClose();
    }
    
    onClose();
  };

  // Handle Enter key submission
  useEffect(() => {
    if (disableSubmitOnEnter || !open) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, disableSubmitOnEnter, handleSubmit]);

  // Combine errors
  const combinedErrors = { ...errors, ...localErrors };
  const hasErrors = Object.keys(combinedErrors).length > 0;
  const generalError = combinedErrors._general;

  return (
    <BaseModal
      open={open}
      onClose={handleCancel}
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
          onClose={handleCancel}
        />
      )}

      {/* Body with Form */}
      <ModalBody
        id={`${id}-content`}
        loading={loading}
        error={generalError}
        success={localSuccess}
        padding={bodyPadding}
      >
        <form onSubmit={handleSubmit} noValidate>
          {children}
        </form>
      </ModalBody>

      {/* Footer */}
      {customFooter || (
        <ModalFooter
          mode="form"
          onSubmit={handleSubmit}
          onClose={handleCancel}
          isSubmitting={isSubmitting || isProcessing}
          submitButtonText={submitButtonText}
          submittingText={submittingText}
          cancelButtonText={cancelButtonText}
          disabled={loading}
        />
      )}
    </BaseModal>
  );
};

EnhancedFormModal.propTypes = {
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
  
  // Form handling
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  formData: PropTypes.object,
  errors: PropTypes.object,
  
  // Content
  children: PropTypes.node.isRequired,
  loading: PropTypes.bool,
  
  // Validation and messages
  validateOnSubmit: PropTypes.bool,
  onValidate: PropTypes.func,
  showSuccessMessage: PropTypes.bool,
  successMessage: PropTypes.string,
  
  // Button customization
  submitButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  submittingText: PropTypes.string,
  
  // Form behavior
  resetOnClose: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  resetOnSuccess: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  closeOnSuccess: PropTypes.bool,
  
  // Advanced
  customHeader: PropTypes.node,
  customFooter: PropTypes.node,
  bodyPadding: PropTypes.oneOf(['none', 'sm', 'default', 'lg']),
  disableSubmitOnEnter: PropTypes.bool,
  id: PropTypes.string
};

export default EnhancedFormModal;