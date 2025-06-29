import React, { useEffect } from 'react';
import { Modal, FormContainer, FormHeader, FormBody, FormActions } from './index';

/**
 * FormModal - A reusable modal specifically designed for forms
 * Combines Modal + FormContainer with consistent patterns
 */
const FormModal = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  children,
  actions,
  size = 'fullWidth',
  className = '',
  loading = false,
  showCloseButton = false,
  enableEscClose = true,
  zIndexLayer = 'nested-modal', // Allow override of z-index layer
  ...props
}) => {
  // Handle ESC key to close modal (following ExpenseForm pattern)
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen && enableEscClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose, enableEscClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit && !loading) {
      onSubmit(e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      showCloseButton={showCloseButton}
      className={`form-modal ${className}`}
      zIndexLayer={zIndexLayer}
      {...props}
    >
      <FormContainer className="form-modal-container">
        <FormHeader title={title} />
        <FormBody onSubmit={handleSubmit}>
          {children}
          {actions && <FormActions>{actions}</FormActions>}
        </FormBody>
      </FormContainer>
    </Modal>
  );
};

export default FormModal;