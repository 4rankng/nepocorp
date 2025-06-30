import React from 'react';
import { IconButton, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { PencilIcon, TrashIcon } from '@assets/icons';
import { useTheme } from '@mui/material';
import {
  Add as AddIcon,
  Receipt as ReceiptIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { forwardRef } from 'react';
// Enhanced theme configuration based on DinhMucDau.jsx
const theme = {
  palette: {
    primary: { main: '#1976d2' },
    text: { secondary: '#6b7280' },
    error: { main: '#d32f2f' },
  },
};
export const EditButton = forwardRef(
  (
    {
      onClick,
      size = 'small',
      disabled = false,
      tooltip = 'Chỉnh sửa',
      // Extract and omit the jsx prop to prevent it from being passed to DOM
      jsx: _jsx,
      ...props
    },
    ref
  ) => {
    // Filter out the jsx prop before spreading the rest
    const { jsx: _, ...filteredProps } = props || {};
    return (
      <IconButton
        ref={ref}
        size={size}
        onClick={onClick}
        disabled={disabled}
        title={tooltip}
        sx={{
          color: theme.palette.text.secondary,
          '&:hover': {
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
          p: 0.5,
          '& .MuiSvgIcon-root': {
            fontSize: '1.125rem',
          },
          '&.Mui-disabled': {
            color: 'rgba(0, 0, 0, 0.26)',
          },
        }}
        {...filteredProps}
      >
        <PencilIcon />
      </IconButton>
    );
  }
);
EditButton.displayName = 'EditButton';
export const DeleteButton = forwardRef(
  (
    {
      onClick,
      size = 'small',
      disabled = false,
      tooltip = 'Xóa',
      // Extract and omit the jsx prop to prevent it from being passed to DOM
      jsx: _jsx,
      ...props
    },
    ref
  ) => {
    // Filter out the jsx prop before spreading the rest
    const { jsx: _, ...filteredProps } = props || {};
    return (
      <IconButton
        ref={ref}
        size={size}
        onClick={onClick}
        disabled={disabled}
        title={tooltip}
        sx={{
          color: theme.palette.text.secondary,
          '&:hover': {
            color: theme.palette.error.main,
            backgroundColor: alpha(theme.palette.error.main, 0.08),
          },
          p: 0.5,
          '& .MuiSvgIcon-root': {
            fontSize: '1.125rem',
          },
          '&.Mui-disabled': {
            color: 'rgba(0, 0, 0, 0.26)',
          },
        }}
        {...filteredProps}
      >
        <TrashIcon />
      </IconButton>
    );
  }
);
DeleteButton.displayName = 'DeleteButton';
export const AddButton = forwardRef(
  (
    {
      onClick,
      disabled = false,
      children,
      size = 'medium',
      variant = 'contained',
      className = '',
      fullWidth = false,
      loading = false,
      iconOnly = false,
      'aria-label': ariaLabel,
      // Extract and omit the jsx prop to prevent it from being passed to DOM
      jsx: _jsx,
      sx: sxProp,
      ...buttonProps
    },
    ref
  ) => {
    const theme = useTheme();
    const isIconOnly = iconOnly || !children || children === '';
    // Size configurations
    const sizeConfig = {
      small: {
        height: isIconOnly ? 36 : 36,
        width: isIconOnly ? 36 : 'auto',
        minWidth: isIconOnly ? 36 : 64,
        padding: isIconOnly ? 0 : '6px 16px',
        fontSize: '0.8125rem',
        iconSize: isIconOnly ? 18 : 16,
      },
      medium: {
        height: isIconOnly ? 40 : 40,
        width: isIconOnly ? 40 : 'auto',
        minWidth: isIconOnly ? 40 : 80,
        padding: isIconOnly ? 0 : '8px 20px',
        fontSize: '0.875rem',
        iconSize: isIconOnly ? 20 : 18,
      },
      large: {
        height: isIconOnly ? 48 : 48,
        width: isIconOnly ? 48 : 'auto',
        minWidth: isIconOnly ? 48 : 96,
        padding: isIconOnly ? 0 : '10px 24px',
        fontSize: '0.9375rem',
        iconSize: isIconOnly ? 24 : 20,
      },
    };
    const currentSize = sizeConfig[size];
    return (
      <Button
        ref={ref}
        variant={variant}
        onClick={onClick}
        disabled={disabled || loading}
        size={size}
        fullWidth={fullWidth}
        className={className}
        startIcon={
          !isIconOnly && !loading ? <AddIcon sx={{ fontSize: currentSize.iconSize }} /> : null
        }
        aria-label={ariaLabel || (isIconOnly ? 'Add item' : undefined)}
        sx={{
          // Base styles
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          // Size-specific styles
          height: currentSize.height,
          width: fullWidth ? '100%' : currentSize.width,
          minWidth: fullWidth ? '100%' : currentSize.minWidth,
          padding: currentSize.padding,
          fontSize: currentSize.fontSize,
          // Variant-specific styles
          ...(variant === 'contained' && {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            boxShadow: theme.shadows[2],
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
              boxShadow: theme.shadows[4],
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: theme.shadows[2],
            },
          }),
          ...(variant === 'outlined' && {
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              transform: 'translateY(-1px)',
              boxShadow: theme.shadows[2],
            },
          }),
          ...(variant === 'text' && {
            color: theme.palette.primary.main,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              transform: 'translateY(-1px)',
            },
          }),
          // Disabled state styles
          '&.Mui-disabled': {
            backgroundColor:
              variant === 'contained' ? theme.palette.action.disabledBackground : 'transparent',
            color: theme.palette.action.disabled,
            boxShadow: 'none',
            transform: 'none',
          },
          // Loading state styles
          ...(loading && {
            color: 'transparent',
            '&:after': {
              content: '""',
              position: 'absolute',
              width: 20,
              height: 20,
              top: '50%',
              left: '50%',
              margin: -10,
              border: '2px solid',
              borderColor: 'currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            },
          }),
          // Icon-only button styles
          ...(isIconOnly && {
            width: 44,
            height: 44,
            minWidth: 44,
          }),
          // Ripple effect enhancement
          '& .MuiTouchRipple-root': {
            color: theme.palette.primary.main,
          },
          // Custom styles override
          ...sxProp,
        }}
        // Filter out the jsx prop before spreading the rest
        {...Object.fromEntries(Object.entries(buttonProps || {}).filter(([key]) => key !== 'jsx'))}
      >
        {isIconOnly ? (
          loading ? null : (
            <AddIcon sx={{ fontSize: currentSize.iconSize }} />
          )
        ) : (
          children
        )}
        {/* Add keyframes for loading animation */}
        <style jsx="true">{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </Button>
    );
  }
);
AddButton.displayName = 'AddButton';

export const InvoiceButton = forwardRef(
  (
    {
      onClick,
      size = 'small',
      disabled = false,
      tooltip = 'Xem phiếu thu',
      // Extract and omit the jsx prop to prevent it from being passed to DOM
      jsx: _jsx,
      ...props
    },
    ref
  ) => {
    // Filter out the jsx prop before spreading the rest
    const { jsx: _, ...filteredProps } = props || {};
    return (
      <IconButton
        ref={ref}
        size={size}
        onClick={onClick}
        disabled={disabled}
        title={tooltip}
        sx={{
          color: theme.palette.text.secondary,
          '&:hover': {
            color: '#4caf50', // Green color for invoice/success
            backgroundColor: alpha('#4caf50', 0.08),
          },
          p: 0.5,
          '& .MuiSvgIcon-root': {
            fontSize: '1.125rem',
          },
          '&.Mui-disabled': {
            color: 'rgba(0, 0, 0, 0.26)',
          },
        }}
        {...filteredProps}
      >
        <ReceiptIcon />
      </IconButton>
    );
  }
);
InvoiceButton.displayName = 'InvoiceButton';

export const ViewButton = forwardRef(
  (
    {
      onClick,
      size = 'small',
      disabled = false,
      tooltip = 'Xem chi tiết',
      // Extract and omit the jsx prop to prevent it from being passed to DOM
      jsx: _jsx,
      ...props
    },
    ref
  ) => {
    // Filter out the jsx prop before spreading the rest
    const { jsx: _, ...filteredProps } = props || {};
    return (
      <IconButton
        ref={ref}
        size={size}
        onClick={onClick}
        disabled={disabled}
        title={tooltip}
        sx={{
          color: theme.palette.text.secondary,
          '&:hover': {
            color: '#2196f3', // Blue color for view/info
            backgroundColor: alpha('#2196f3', 0.08),
          },
          p: 0.5,
          '& .MuiSvgIcon-root': {
            fontSize: '1.125rem',
          },
          '&.Mui-disabled': {
            color: 'rgba(0, 0, 0, 0.26)',
          },
        }}
        {...filteredProps}
      >
        <VisibilityIcon />
      </IconButton>
    );
  }
);
ViewButton.displayName = 'ViewButton';
