import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FormCol, FormLabel, ErrorText, HelperText } from './index';
import './Dropdown.css';

const Dropdown = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  required = false,
  disabled = false,
  loading = false,
  error = null,
  helperText = null,
  className = '',
  multiple = false,
  searchable = true,
  clearable = true,
  maxHeight = '300px',
  noOptionsText = 'Không có lựa chọn',
  loadingText = 'Đang tải...',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    
    return options.filter(option => {
      const label = option.label || option.displayText || option.text || option.name || '';
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [options, searchTerm, searchable]);

  // Get display value for the dropdown trigger
  const getDisplayValue = () => {
    if (loading) return loadingText;
    
    if (multiple) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return placeholder;
      }
      const selectedOptions = options.filter(opt => 
        Array.isArray(value) ? value.includes(opt.value) : false
      );
      return selectedOptions.length === 1 
        ? selectedOptions[0].label || selectedOptions[0].displayText || selectedOptions[0].text
        : `${selectedOptions.length} mục đã chọn`;
    } else {
      if (!value) return placeholder;
      const selectedOption = options.find(opt => opt.value === value);
      return selectedOption 
        ? (selectedOption.label || selectedOption.displayText || selectedOption.text)
        : placeholder;
    }
  };

  // Handle option selection
  const handleOptionSelect = (optionValue) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      
      onChange?.(name ? { target: { name, value: newValues } } : newValues);
    } else {
      onChange?.(name ? { target: { name, value: optionValue } } : optionValue);
      setIsOpen(false);
    }
  };

  // Handle clear all selections
  const handleClear = (e) => {
    e.stopPropagation();
    const newValue = multiple ? [] : '';
    onChange?.(name ? { target: { name, value: newValue } } : newValue);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, searchable]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setSearchTerm('');
        }
        break;
      case 'ArrowDown':
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        }
        break;
      default:
        break;
    }
  };

  const shouldShowClear = clearable && !disabled && (
    (multiple && Array.isArray(value) && value.length > 0) ||
    (!multiple && value)
  );

  return (
    <FormCol className={className}>
      {label && <FormLabel required={required}>{label}</FormLabel>}
      
      <div 
        ref={dropdownRef}
        className={`dropdown ${disabled ? 'dropdown--disabled' : ''} ${error ? 'dropdown--error' : ''}`}
      >
        <button
          type="button"
          className="dropdown__trigger"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          {...props}
        >
          <span className="dropdown__value">
            {getDisplayValue()}
          </span>
          <div className="dropdown__icons">
            {shouldShowClear && (
              <button
                type="button"
                className="dropdown__clear"
                onClick={handleClear}
                aria-label="Xóa lựa chọn"
              >
                ×
              </button>
            )}
            <span className={`dropdown__arrow ${isOpen ? 'dropdown__arrow--open' : ''}`}>
              ▼
            </span>
          </div>
        </button>

        {isOpen && (
          <div 
            className="dropdown__menu"
            style={{ maxHeight }}
          >
            {searchable && (
              <div className="dropdown__search">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="dropdown__search-input"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="dropdown__options">
              {loading ? (
                <div className="dropdown__option dropdown__option--disabled">
                  {loadingText}
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="dropdown__option dropdown__option--disabled">
                  {searchTerm ? `Không tìm thấy "${searchTerm}"` : noOptionsText}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = multiple 
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value;

                  return (
                    <div
                      key={option.value}
                      className={`dropdown__option ${isSelected ? 'dropdown__option--selected' : ''}`}
                      onClick={() => handleOptionSelect(option.value)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {multiple && (
                        <span className={`dropdown__checkbox ${isSelected ? 'dropdown__checkbox--checked' : ''}`}>
                          {isSelected && '✓'}
                        </span>
                      )}
                      <span className="dropdown__option-text">
                        {option.label || option.displayText || option.text || option.name}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {helperText && <HelperText>{helperText}</HelperText>}
    </FormCol>
  );
};

export default Dropdown;