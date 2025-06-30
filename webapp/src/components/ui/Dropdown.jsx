import React, { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FormCol, FormLabel, ErrorText, HelperText } from './index';
import { Z_INDEX, getChildZIndex } from '@constants/zIndex';
import { vietnameseSearch } from '@utils/vietnameseSearch';
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
  zIndex = null,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropUp, setDropUp] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const menuRef = useRef(null);

  // Filter options based on search term with Vietnamese support
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    
    return options.filter(option => {
      const label = option.label || option.displayText || option.text || option.name || '';
      return vietnameseSearch(label, searchTerm);
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

  // Calculate z-index for dropdown menu
  const getDropdownZIndex = () => {
    // If custom zIndex prop is provided, use it
    if (zIndex) {
      return zIndex;
    }
    
    // Use auto-incrementing z-index from parent (works for modals and other contexts)
    if (dropdownRef.current) {
      return getChildZIndex(dropdownRef.current, 1);
    }
    
    // Fallback to default dropdown z-index
    return Z_INDEX.DROPDOWN;
  };

  // Calculate position for dropdown
  const calculatePosition = () => {
    if (!dropdownRef.current) {
      return;
    }

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const menuHeight = parseInt(maxHeight, 10) || 300;


    // Determine if should drop up
    const shouldDropUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    setDropUp(shouldDropUp);

  };

  // Focus search input when dropdown opens and calculate position
  useEffect(() => {
    if (isOpen) {
      // Focus search input
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      
      calculatePosition();

      // Recalculate position on scroll or resize
      const handlePositionUpdate = () => calculatePosition();
      window.addEventListener('scroll', handlePositionUpdate, true);
      window.addEventListener('resize', handlePositionUpdate);

      return () => {
        window.removeEventListener('scroll', handlePositionUpdate, true);
        window.removeEventListener('resize', handlePositionUpdate);
      };
    }
  }, [isOpen, searchable, maxHeight]);

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

  // Filter out non-DOM props before spreading to button element
  const {
    label: _label,
    name: _name,
    value: _value,
    onChange: _onChange,
    options: _options,
    placeholder: _placeholder,
    searchPlaceholder: _searchPlaceholder,
    required: _required,
    disabled: _disabled,
    loading: _loading,
    error: _error,
    helperText: _helperText,
    className: _className,
    multiple: _multiple,
    searchable: _searchable,
    clearable: _clearable,
    maxHeight: _maxHeight,
    noOptionsText: _noOptionsText,
    loadingText: _loadingText,
    ...domProps
  } = props;

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
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          {...domProps}
        >
          <span className="dropdown__value">
            {getDisplayValue()}
          </span>
          <div className="dropdown__icons">
            {shouldShowClear && (
              <span
                className="dropdown__clear"
                onClick={handleClear}
                aria-label="Xóa lựa chọn"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClear(e);
                  }
                }}
              >
                ×
              </span>
            )}
            <span className={`dropdown__arrow ${isOpen ? 'dropdown__arrow--open' : ''}`}>
              ▼
            </span>
          </div>
        </button>

        {isOpen && (
          <div 
            ref={menuRef}
            className={`dropdown__menu ${dropUp ? 'dropdown__menu--dropup' : ''}`}
            style={{
              zIndex: getDropdownZIndex(),
              maxHeight
            }}
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

Dropdown.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  searchPlaceholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.string,
  helperText: PropTypes.string,
  className: PropTypes.string,
  multiple: PropTypes.bool,
  searchable: PropTypes.bool,
  clearable: PropTypes.bool,
  maxHeight: PropTypes.string,
  noOptionsText: PropTypes.string,
  loadingText: PropTypes.string,
  zIndex: PropTypes.number
};

export default Dropdown;