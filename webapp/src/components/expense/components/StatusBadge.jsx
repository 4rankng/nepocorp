import React from 'react';
import PropTypes from 'prop-types';
import { PAYMENT_STATUS_LABELS } from '@constants/payment';

const STATUS_COLORS = {
  PAID: '#10b981',
  PENDING: '#f59e0b',
  DRAFT: '#6b7280',
  CANCELLED: '#ef4444',
};

const StatusBadge = ({ status, className = '', style = {} }) => {
  const color = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
  const label = PAYMENT_STATUS_LABELS[status] || status;

  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        border: `1px solid ${color}`,
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        color: color,
        backgroundColor: `${color}15`,
        minWidth: '80px',
        textAlign: 'center',
        ...style,
      }}
    >
      {label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default React.memo(StatusBadge);
