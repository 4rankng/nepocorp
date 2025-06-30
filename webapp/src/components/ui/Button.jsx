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
  iconOnly = false,
  href,
  target,
  ...props 
}) => {
  const baseClasses = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full-width',
    disabled && 'btn--disabled',
    loading && 'btn--loading',
    iconOnly && 'btn--icon-only',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  // Render as link if href is provided
  if (href) {
    return (
      <a
        href={href}
        target={target}
        className={baseClasses}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <span className="btn-spinner" />
        )}
        {!loading && icon && iconPosition === 'start' && (
          <span className="btn-icon btn-icon--start">{icon}</span>
        )}
        {!iconOnly && <span className="btn-content">{children}</span>}
        {!loading && icon && iconPosition === 'end' && (
          <span className="btn-icon btn-icon--end">{icon}</span>
        )}
      </a>
    );
  }

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
      {!iconOnly && <span className="btn-content">{children}</span>}
      {!loading && icon && iconPosition === 'end' && (
        <span className="btn-icon btn-icon--end">{icon}</span>
      )}
    </button>
  );
};

export default Button;