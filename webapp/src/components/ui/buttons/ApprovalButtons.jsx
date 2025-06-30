import React from 'react';
import Button from '../Button';

const ApprovalButtons = ({
  onApprove,
  onReject,
  approveText = 'Phê duyệt',
  rejectText = 'Từ chối',
  approveIcon,
  rejectIcon,
  disabled = false,
  loading = false,
  size = 'medium',
  className = '',
  ...props
}) => {
  return (
    <div className={`approval-buttons ${className}`} {...props}>
      <Button
        variant="success"
        size={size}
        onClick={onApprove}
        disabled={disabled}
        loading={loading}
        icon={approveIcon}
      >
        {approveText}
      </Button>
      <Button
        variant="danger"
        size={size}
        onClick={onReject}
        disabled={disabled}
        loading={loading}
        icon={rejectIcon}
      >
        {rejectText}
      </Button>
    </div>
  );
};

export default ApprovalButtons;