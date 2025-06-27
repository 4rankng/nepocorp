import React from 'react';
import { FormCol, FormLabel, FormControl, ErrorText, HelperText, PriceDisplay, DateInputWrapper, DateIcon, InputGroup, InputAddon } from './index';

/**
 * SelectField - Reusable select field with consistent styling
 */
export const SelectField = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Chọn...',
  required = false,
  disabled = false,
  loading = false,
  error = null,
  helperText = null,
  className = '',
  ...props
}) => (
  <FormCol className={className}>
    <FormLabel required={required}>{label}</FormLabel>
    <FormControl
      type="select"
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled || loading}
      error={!!error}
      required={required}
      {...props}
    >
      <option value="">
        {loading ? 'Đang tải...' : placeholder}
      </option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label || option.displayText || option.text}
        </option>
      ))}
    </FormControl>
    {error && <ErrorText>{error}</ErrorText>}
    {helperText && <HelperText>{helperText}</HelperText>}
  </FormCol>
);

/**
 * TextField - Reusable text field with consistent styling
 */
export const TextField = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  error = null,
  helperText = null,
  className = '',
  ...props
}) => (
  <FormCol className={className}>
    <FormLabel required={required}>{label}</FormLabel>
    <FormControl
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      error={!!error}
      required={required}
      {...props}
    />
    {error && <ErrorText>{error}</ErrorText>}
    {helperText && <HelperText>{helperText}</HelperText>}
  </FormCol>
);

/**
 * NumberField - Specialized number field with currency formatting
 */
export const NumberField = ({
  label,
  name,
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder = '',
  required = false,
  disabled = false,
  error = null,
  helperText = null,
  showCurrency = false,
  currency = 'VND',
  className = '',
  ...props
}) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const displayHelperText = showCurrency 
    ? `Hiển thị: ${formatCurrency(value)}${helperText ? ` • ${helperText}` : ''}`
    : helperText;

  return (
    <FormCol className={className}>
      <FormLabel required={required}>{label}</FormLabel>
      <FormControl
        type="number"
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        error={!!error}
        required={required}
        min={min}
        step={step}
        {...props}
      />
      {error && <ErrorText>{error}</ErrorText>}
      {displayHelperText && <HelperText>{displayHelperText}</HelperText>}
    </FormCol>
  );
};

/**
 * CurrencyDisplay - Readonly currency display field
 */
export const CurrencyDisplay = ({
  label,
  value,
  currency = 'VND',
  helperText = null,
  className = '',
  style = {},
}) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const displayStyle = {
    height: '43px',
    lineHeight: '40px',
    padding: '0 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    backgroundColor: '#f9fafb',
    fontSize: '1rem',
    fontFamily: 'inherit',
    ...style
  };

  return (
    <FormCol className={className}>
      <FormLabel>{label}</FormLabel>
      <PriceDisplay
        value={formatCurrency(value)}
        style={displayStyle}
      />
      {helperText && <HelperText>{helperText}</HelperText>}
    </FormCol>
  );
};

/**
 * DateField - Reusable date field with consistent styling
 */
export const DateField = ({
  label,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  error = null,
  helperText = null,
  className = '',
  ...props
}) => (
  <FormCol className={className}>
    <FormLabel required={required}>{label}</FormLabel>
    <DateInputWrapper>
      <FormControl
        type="date"
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        error={!!error}
        required={required}
        {...props}
      />
      <DateIcon />
    </DateInputWrapper>
    {error && <ErrorText>{error}</ErrorText>}
    {helperText && <HelperText>{helperText}</HelperText>}
  </FormCol>
);

/**
 * TextareaField - Reusable textarea field
 */
export const TextareaField = ({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  rows = 3,
  required = false,
  disabled = false,
  error = null,
  helperText = null,
  className = '',
  ...props
}) => (
  <FormCol className={className}>
    <FormLabel required={required}>{label}</FormLabel>
    <FormControl
      type="textarea"
      name={name}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      error={!!error}
      required={required}
      rows={rows}
      {...props}
    />
    {error && <ErrorText>{error}</ErrorText>}
    {helperText && <HelperText>{helperText}</HelperText>}
  </FormCol>
);

/**
 * PercentageField - Number field with percentage addon
 */
export const PercentageField = ({
  label,
  name,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  required = false,
  disabled = false,
  error = null,
  helperText = null,
  className = '',
  ...props
}) => (
  <FormCol className={className}>
    <FormLabel required={required}>{label}</FormLabel>
    <InputGroup>
      <FormControl
        type="number"
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        error={!!error}
        required={required}
        min={min}
        max={max}
        step={step}
        {...props}
      />
      <InputAddon>%</InputAddon>
    </InputGroup>
    {error && <ErrorText>{error}</ErrorText>}
    {helperText && <HelperText>{helperText}</HelperText>}
  </FormCol>
);