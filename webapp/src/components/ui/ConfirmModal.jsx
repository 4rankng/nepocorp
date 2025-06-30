import React from 'react';
import PropTypes from 'prop-types';
import BaseModal from './BaseModal';
import ModalHeader from './ModalHeader';
import ModalBody from './ModalBody';
import ModalFooter from './ModalFooter';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

/**
 * ConfirmModal - Specialized modal for confirmations
 * Perfect for delete confirmations, action confirmations, warnings
 */
const ConfirmModal = ({
  // Base modal props
  open,
  onClose,
  size = 'sm',
  className = '',
  
  // Confirmation props
  title,
  message,
  details = null,
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  
  // Action props
  onConfirm,
  isConfirming = false,
  confirmButtonText = 'Xác nhận',
  cancelButtonText = 'Hủy',
  confirmingText = 'Đang xử lý...',
  
  // Customization
  icon = null,
  showIcon = true,
  showDetails = true,
  customContent = null,
  
  // Advanced
  disableConfirm = false,
  autoCloseOnConfirm = true,
  id
}) => {
  // Icon configurations
  const iconConfig = {
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800'
    },
    danger: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800'
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-500" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    },
    success: {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800'
    }
  };

  const config = iconConfig[type] || iconConfig.warning;
  const headerIcon = icon || (showIcon ? config.icon : null);

  // Handle confirm action
  const handleConfirm = async () => {
    if (!onConfirm || isConfirming || disableConfirm) return;

    try {
      await onConfirm();
      if (autoCloseOnConfirm) {
        onClose();
      }
    } catch (error) {
      console.error('Confirmation action failed:', error);
      // Error handling could be enhanced here
    }
  };

  // Render details section
  const renderDetails = () => {
    if (!showDetails || !details) return null;

    if (typeof details === 'string') {
      return (
        <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 mt-4`}>
          <p className={`text-sm ${config.textColor}`}>{details}</p>
        </div>
      );
    }

    if (typeof details === 'object') {
      return (
        <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 mt-4`}>
          <h4 className={`text-sm font-medium ${config.textColor} mb-3`}>
            Thông tin chi tiết
          </h4>
          <div className="space-y-2">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{key}:</span>
                <span className="text-sm text-gray-900 font-medium">
                  {value || '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return details;
  };

  // Render warning message for dangerous actions
  const renderWarningMessage = () => {
    if (type !== 'danger') return null;

    return (
      <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-yellow-700">
          Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
        </p>
      </div>
    );
  };

  // Determine confirm button variant
  const confirmButtonVariant = type === 'danger' ? 'danger' : 'primary';

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
      <ModalHeader
        id={`${id}-title`}
        title={title}
        icon={headerIcon}
        onClose={onClose}
        showCloseButton={!isConfirming}
      />

      {/* Body */}
      <ModalBody id={`${id}-content`} padding="lg">
        {customContent || (
          <>
            {/* Main message */}
            <p className="text-gray-700 mb-2">
              {message}
            </p>

            {/* Details */}
            {renderDetails()}

            {/* Warning for dangerous actions */}
            {renderWarningMessage()}
          </>
        )}
      </ModalBody>

      {/* Footer */}
      <ModalFooter
        mode="confirm"
        onConfirm={handleConfirm}
        onClose={onClose}
        isConfirming={isConfirming}
        confirmButtonText={confirmButtonText}
        confirmButtonVariant={confirmButtonVariant}
        confirmingText={confirmingText}
        cancelButtonText={cancelButtonText}
        disabled={disableConfirm || isConfirming}
      />
    </BaseModal>
  );
};

ConfirmModal.propTypes = {
  // Base modal props
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'fullScreen']),
  className: PropTypes.string,
  
  // Confirmation props
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  details: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.node
  ]),
  type: PropTypes.oneOf(['warning', 'danger', 'info', 'success']),
  
  // Action props
  onConfirm: PropTypes.func.isRequired,
  isConfirming: PropTypes.bool,
  confirmButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  confirmingText: PropTypes.string,
  
  // Customization
  icon: PropTypes.node,
  showIcon: PropTypes.bool,
  showDetails: PropTypes.bool,
  customContent: PropTypes.node,
  
  // Advanced
  disableConfirm: PropTypes.bool,
  autoCloseOnConfirm: PropTypes.bool,
  id: PropTypes.string
};

export default ConfirmModal;