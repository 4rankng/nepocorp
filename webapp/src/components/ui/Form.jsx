import React from 'react';
import './Form.css';

export const FormContainer = ({ children, className = '' }) => (
  <div className={`form-container ${className}`}>
    {children}
  </div>
);

export const FormHeader = ({ title, children, className = '' }) => (
  <div className={`form-header ${className}`}>
    {title && <h2 className="form-header-title">{title}</h2>}
    {children}
  </div>
);

export const FormBody = ({ children, onSubmit, className = '' }) => (
  <form className={`form-body ${className}`} onSubmit={onSubmit}>
    {children}
  </form>
);

export const FormSections = ({ children, columns = 2, className = '' }) => {
  const gridClass = columns === 1 ? 'form-sections--single' : 'form-sections--double';
  return (
    <div className={`form-sections ${gridClass} ${className}`}>
      {children}
    </div>
  );
};

export const FormSection = ({ title, children, className = '' }) => (
  <div className={`form-section ${className}`}>
    {title && <h3 className="section-title">{title}</h3>}
    {children}
  </div>
);

export const FormGroup = ({ children, className = '' }) => (
  <div className={`form-group ${className}`}>
    {children}
  </div>
);

export const FormRow = ({ children, className = '' }) => (
  <div className={`form-row ${className}`}>
    {children}
  </div>
);

export const FormCol = ({ children, className = '' }) => (
  <div className={`form-col ${className}`}>
    {children}
  </div>
);

export const FormLabel = ({ children, required = false, htmlFor, className = '' }) => (
  <label className={`form-label ${className}`} htmlFor={htmlFor}>
    {children}
    {required && <span className="required"> *</span>}
  </label>
);

export const FormControl = ({ 
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error = false,
  min,
  max,
  rows,
  children,
  className = '',
  id,
  ...props 
}) => {
  const baseClasses = `form-control ${error ? 'error' : ''} ${className}`;

  if (type === 'select') {
    return (
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={baseClasses}
        {...props}
      >
        {children}
      </select>
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows || 3}
        className={baseClasses}
        {...props}
      />
    );
  }

  return (
    <input
      id={id}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      min={min}
      max={max}
      className={baseClasses}
      {...props}
    />
  );
};

export const InputGroup = ({ children, className = '' }) => (
  <div className={`input-group ${className}`}>
    {children}
  </div>
);

export const InputAddon = ({ children, position = 'end', className = '' }) => (
  <span className={`input-addon input-addon--${position} ${className}`}>
    {children}
  </span>
);

export const DateInputWrapper = ({ children, className = '' }) => (
  <div className={`date-input-wrapper ${className}`}>
    {children}
  </div>
);

export const DateIcon = ({ className = '' }) => (
  <span className={`date-icon ${className}`}>📅</span>
);

export const FormActions = ({ children, className = '' }) => (
  <div className={`form-actions ${className}`}>
    {children}
  </div>
);

export const ErrorText = ({ children, className = '' }) => (
  <div className={`error-text ${className}`}>
    {children}
  </div>
);

export const HelperText = ({ children, className = '' }) => (
  <p className={`helper-text ${className}`}>
    {children}
  </p>
);

export const PriceDisplay = ({ value, className = '' }) => (
  <div className={`price-display ${className}`}>
    {value}
  </div>
);