import React from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StatusBadge from '@components/ui/StatusBadge';
import Dropdown from '@components/ui/Dropdown';
import { getPaymentStatusColor } from '@utils/expenseHelpers';

/**
 * ModalHeader - Unified header component for all modals
 * Merges patterns from ExpenseHeader, shared ModalHeader, and custom headers
 */
const ModalHeader = ({
  title,
  subtitle,
  onClose,
  icon,
  actions,
  className = '',
  
  // Status management (for entity modals)
  status,
  statusOptions = [],
  isEditing = false,
  onStatusChange,
  showStatusBadge = false,
  
  // Payment proof (for financial entities)
  showPaymentProof = false,
  paymentProofUrl = null,
  
  // Entity data (for dynamic status handling)
  entityData = null,
  loading = false,
  
  // Customization
  showCloseButton = true,
  id
}) => {
  // Render status section
  const renderStatusSection = () => {
    if (!showStatusBadge || !status || loading) return null;

    if (isEditing) {
      return (
        <Dropdown
          value={status}
          onChange={onStatusChange}
          options={statusOptions}
          placeholder="Chọn trạng thái"
          className="text-xs"
          style={{ minWidth: '120px' }}
          usePortal={false}
        />
      );
    }

    return (
      <>
        <StatusBadge
          status={status}
          label={statusOptions.find(opt => opt.value === status)?.label}
          color={getPaymentStatusColor ? getPaymentStatusColor(status) : undefined}
        />
        {renderPaymentProofButton()}
      </>
    );
  };

  // Render payment proof button
  const renderPaymentProofButton = () => {
    if (!showPaymentProof || status !== 'PAID') return null;

    const buttonClasses = paymentProofUrl
      ? "flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
      : "flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-400 text-xs font-medium rounded cursor-not-allowed";

    const buttonTitle = paymentProofUrl ? "Xem chứng từ thanh toán" : "Chưa có chứng từ";
    const buttonText = paymentProofUrl ? "Xem chứng từ" : "Chưa có chứng từ";

    return (
      <button
        onClick={paymentProofUrl ? () => window.open(paymentProofUrl, '_blank') : undefined}
        className={buttonClasses}
        disabled={!paymentProofUrl}
        title={buttonTitle}
      >
        <OpenInNewIcon sx={{ fontSize: 14 }} />
        <span>{buttonText}</span>
      </button>
    );
  };

  // Render icon section
  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mr-3">
        {icon}
      </div>
    );
  };

  return (
    <div className={`px-4 py-3 border-b border-gray-200 flex justify-between items-center ${className}`} id={id}>
      <div className="flex items-center gap-3">
        {renderIcon()}
        
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <span className="text-sm text-gray-600">
              {subtitle}
            </span>
          )}
        </div>
        
        {renderStatusSection()}
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      
      {showCloseButton && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Đóng"
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </button>
      )}
    </div>
  );
};

ModalHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  icon: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string,
  
  // Status management
  status: PropTypes.string,
  statusOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  isEditing: PropTypes.bool,
  onStatusChange: PropTypes.func,
  showStatusBadge: PropTypes.bool,
  
  // Payment proof
  showPaymentProof: PropTypes.bool,
  paymentProofUrl: PropTypes.string,
  
  // Entity data
  entityData: PropTypes.object,
  loading: PropTypes.bool,
  
  // Customization
  showCloseButton: PropTypes.bool,
  id: PropTypes.string
};

export default ModalHeader;