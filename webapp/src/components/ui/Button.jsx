import React from 'react';
import './Button.css';

const Button = ({ 
  children,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon,
  iconPosition = 'start',
  fullWidth = false,
  ...props 
}) => {
  const baseClasses = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full-width',
    disabled && 'btn--disabled',
    loading && 'btn--loading',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={baseClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" />
      )}
      {!loading && icon && iconPosition === 'start' && (
        <span className="btn-icon btn-icon--start">{icon}</span>
      )}
      <span className="btn-content">{children}</span>
      {!loading && icon && iconPosition === 'end' && (
        <span className="btn-icon btn-icon--end">{icon}</span>
      )}
    </button>
  );
};

export default Button;