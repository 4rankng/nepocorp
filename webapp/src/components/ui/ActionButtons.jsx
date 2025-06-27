import React from 'react';
import { Button } from './index';

/**
 * ActionButtons - Reusable action button layouts for forms and modals
 */

/**
 * Standard form action buttons (Cancel + Save/Submit)
 */
export const FormActionButtons = ({
  onCancel,
  onSubmit,
  isEdit = false,
  loading = false,
  disabled = false,
  cancelText = 'Hủy',
  submitText = null,
  extraButtons = null, // Additional buttons to show on the left side
  className = '',
}) => {
  const defaultSubmitText = isEdit ? 'Sửa' : 'Thêm';

  return (
    <div className={`action-buttons ${className}`} style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%'
    }}>
      {/* Left side - Extra buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {extraButtons}
      </div>

      {/* Right side - Primary actions */}
      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={loading || disabled}
        >
          {cancelText}
        </Button>
        <Button
          type="submit"
          variant="primary"
          onClick={onSubmit}
          loading={loading}
          disabled={loading || disabled}
        >
          {submitText || defaultSubmitText}
        </Button>
      </div>
    </div>
  );
};

/**
 * Confirmation dialog buttons (Cancel + Confirm)
 */
export const ConfirmActionButtons = ({
  onCancel,
  onConfirm,
  loading = false,
  disabled = false,
  cancelText = 'Hủy',
  confirmText = 'Xác nhận',
  confirmVariant = 'primary',
  className = '',
}) => (
  <div className={`action-buttons ${className}`} style={{
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px'
  }}>
    <Button
      variant="secondary"
      onClick={onCancel}
      disabled={loading || disabled}
    >
      {cancelText}
    </Button>
    <Button
      variant={confirmVariant}
      onClick={onConfirm}
      loading={loading}
      disabled={loading || disabled}
    >
      {confirmText}
    </Button>
  </div>
);

/**
 * Delete confirmation buttons (Cancel + Delete)
 */
export const DeleteActionButtons = ({
  onCancel,
  onDelete,
  loading = false,
  disabled = false,
  cancelText = 'Hủy',
  deleteText = 'Xóa',
  className = '',
}) => (
  <ConfirmActionButtons
    onCancel={onCancel}
    onConfirm={onDelete}
    loading={loading}
    disabled={disabled}
    cancelText={cancelText}
    confirmText={deleteText}
    confirmVariant="danger"
    className={className}
  />
);

/**
 * Invoice-enabled form buttons (Invoice + Cancel + Save)
 */
export const InvoiceFormActionButtons = ({
  onCancel,
  onSubmit,
  onInvoiceClick,
  showInvoiceButton = false,
  isEdit = false,
  loading = false,
  disabled = false,
  cancelText = 'Hủy',
  submitText = null,
  invoiceText = 'Xem hóa đơn',
  invoiceIcon = null,
  className = '',
}) => {
  const invoiceButton = showInvoiceButton ? (
    <Button
      variant="secondary"
      onClick={onInvoiceClick}
      disabled={loading || disabled}
      icon={invoiceIcon}
    >
      {invoiceText}
    </Button>
  ) : null;

  return (
    <FormActionButtons
      onCancel={onCancel}
      onSubmit={onSubmit}
      isEdit={isEdit}
      loading={loading}
      disabled={disabled}
      cancelText={cancelText}
      submitText={submitText}
      extraButtons={invoiceButton}
      className={className}
    />
  );
};

/**
 * Generic action button group
 */
export const ActionButtonGroup = ({
  buttons = [],
  align = 'right', // 'left' | 'center' | 'right' | 'space-between'
  gap = '8px',
  className = '',
}) => {
  const justifyContent = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
    'space-between': 'space-between'
  }[align];

  return (
    <div
      className={`action-button-group ${className}`}
      style={{
        display: 'flex',
        justifyContent,
        gap,
        alignItems: 'center'
      }}
    >
      {buttons.map((button, index) => (
        <React.Fragment key={index}>
          {button}
        </React.Fragment>
      ))}
    </div>
  );
};
