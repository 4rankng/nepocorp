import React from 'react';
import PropTypes from 'prop-types';

const StatusBadge = ({ 
  status, 
  label, 
  color,
  backgroundColor,
  className = '',
  size = 'medium',
  style = {}
}) => {
  const sizeStyles = {
    small: {
      padding: '2px 6px',
      fontSize: '10px',
      minWidth: '60px'
    },
    medium: {
      padding: '4px 8px',
      fontSize: '11px',
      minWidth: '80px'
    },
    large: {
      padding: '6px 12px',
      fontSize: '13px',
      minWidth: '100px'
    }
  };

  const badgeStyle = {
    display: 'inline-block',
    border: `1px solid ${color}`,
    borderRadius: '4px',
    fontWeight: '600',
    color: color,
    backgroundColor: backgroundColor || `${color}15`,
    textAlign: 'center',
    ...sizeStyles[size],
    ...style
  };

  return (
    <span
      className={className}
      style={badgeStyle}
    >
      {label || status}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  label: PropTypes.string,
  color: PropTypes.string.isRequired,
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  style: PropTypes.object
};

export default StatusBadge;