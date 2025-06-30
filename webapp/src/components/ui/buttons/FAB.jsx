import React from 'react';
import './FAB.css';

const FAB = ({
  children,
  onClick,
  icon,
  position = 'bottom-right',
  size = 'medium',
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  const classes = [
    'fab',
    `fab--${position}`,
    `fab--${size}`,
    `fab--${variant}`,
    disabled && 'fab--disabled',
    loading && 'fab--loading',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="fab-spinner" />
      )}
      {!loading && (icon || children)}
    </button>
  );
};

export default FAB;