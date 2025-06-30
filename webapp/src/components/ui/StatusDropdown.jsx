import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormCol, FormLabel, ErrorText, HelperText } from './index';
import { Z_INDEX, getChildZIndex } from '@constants/zIndex';
import './Dropdown.css'; // Reusing the existing CSS for now, will adjust as needed

const StatusDropdown = ({
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);

  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  // Get display value for the dropdown trigger
  const getDisplayValue = () => {
    if (loading) return 'Đang tải...';
    if (!value) return placeholder;
    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption
      ? selectedOption.label || selectedOption.displayText || selectedOption.text
      : placeholder;
  };

  // Handle option selection
  const handleOptionSelect = optionValue => {
    onChange?.(name ? { target: { name, value: optionValue } } : optionValue);
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate z-index for dropdown menu
  const getDropdownZIndex = () => {
    if (dropdownRef.current) {
      return getChildZIndex(dropdownRef.current, 1);
    }
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
    const menuHeight = 300; // Assuming a max height for the dropdown menu

    const shouldDropUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    setDropUp(shouldDropUp);
  };

  // Focus search input when dropdown opens and calculate position
  useEffect(() => {
    if (isOpen) {
      calculatePosition();

      const handlePositionUpdate = () => calculatePosition();
      window.addEventListener('scroll', handlePositionUpdate, true);
      window.addEventListener('resize', handlePositionUpdate);

      return () => {
        window.removeEventListener('scroll', handlePositionUpdate, true);
        window.removeEventListener('resize', handlePositionUpdate);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = e => {
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

  const selectedOption = options.find(opt => opt.value === value);
  const selectedColor = selectedOption?.color;

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
          style={{
            border: selectedColor ? `1px solid ${selectedColor}` : '1px solid #d1d5db', // Default border color
            borderRadius: '4px', // Small rounded corner
            minWidth: '120px', // Fixed width to display longest status text
            padding: '4px 8px', // Smaller padding
            fontSize: '11px', // Smaller font size
            ...(selectedColor && {
              boxShadow: isOpen ? `0 0 0 1px ${selectedColor}` : 'none', // Colored box-shadow on focus/open
            }),
          }}
          onMouseEnter={e => {
            if (!disabled && selectedColor) {
              e.currentTarget.style.borderColor = selectedColor;
            }
          }}
          onMouseLeave={e => {
            if (!disabled && selectedColor) {
              e.currentTarget.style.borderColor = selectedColor;
            }
          }}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
            }
          }}
          onFocus={e => {
            if (!disabled && selectedColor) {
              e.currentTarget.style.borderColor = selectedColor;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${selectedColor}`;
            }
          }}
          onBlur={e => {
            if (!disabled && selectedColor) {
              e.currentTarget.style.borderColor = selectedColor;
              e.currentTarget.style.boxShadow = '';
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          {...props}
        >
          <span
            className="dropdown__value"
            style={{
              fontSize: '13px',
              textAlign: 'center',
              color: selectedColor,
              backgroundColor: selectedColor ? `${selectedColor}15` : 'transparent',
              fontWeight: '600',
            }}
          >
            {getDisplayValue()}
          </span>
          <div className="dropdown__icons">
            <span className={`dropdown__arrow ${isOpen ? 'dropdown__arrow--open' : ''}`}>▼</span>
          </div>
        </button>

        {isOpen && (
          <div
            ref={menuRef}
            className={`dropdown__menu ${dropUp ? 'dropdown__menu--dropup' : ''}`}
            style={{
              zIndex: getDropdownZIndex(),
            }}
          >
            <div className="dropdown__options">
              {loading ? (
                <div className="dropdown__option dropdown__option--disabled">Đang tải...</div>
              ) : options.length === 0 ? (
                <div className="dropdown__option dropdown__option--disabled">Không có lựa chọn</div>
              ) : (
                options.map(option => {
                  const isSelected = value === option.value;

                  return (
                    <div
                      key={option.value}
                      className={`dropdown__option ${isSelected ? 'dropdown__option--selected' : ''}`}
                      style={{
                        border: option.color ? `1px solid ${option.color}` : '1px solid #d1d5db',
                        borderRadius: '4px', // Small rounded corner
                        margin: '2px 4px', // Proper spacing
                        padding: '4px 8px', // Proper padding
                        color: option.color,
                        backgroundColor: option.color ? `${option.color}15` : 'transparent',
                        fontWeight: '600',
                        textAlign: 'center',
                        fontSize: '11px', // Smaller font size
                      }}
                      onClick={() => handleOptionSelect(option.value)}
                      role="option"
                      aria-selected={isSelected}
                    >
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

StatusDropdown.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.any,
  onChange: PropTypes.func,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.string,
  helperText: PropTypes.string,
  className: PropTypes.string,
};

export default StatusDropdown;
