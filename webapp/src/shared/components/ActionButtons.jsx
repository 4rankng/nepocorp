import React from 'react';
import { IconButton, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { PencilIcon, TrashIcon } from '../../assets/icons';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { forwardRef } from 'react';

// Enhanced theme configuration based on DinhMucDau.jsx
const theme = {
  palette: {
    primary: { main: '#1976d2' },
    text: { secondary: '#6b7280' },
    error: { main: '#d32f2f' },
  },
};

export const EditButton = ({
  onClick,
  size = 'small',
  disabled = false,
  tooltip = 'Chỉnh sửa',
  jsx, // Extract jsx prop to prevent it from being passed to DOM
  ...buttonProps
}) => {
  return (
    <IconButton
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
      {...buttonProps}
    >
      <PencilIcon />
    </IconButton>
  );
};

export const DeleteButton = ({
  onClick,
  size = 'small',
  disabled = false,
  tooltip = 'Xóa',
  jsx, // Extract jsx prop to prevent it from being passed to DOM
  ...buttonProps
}) => {
  return (
    <IconButton
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
      {...buttonProps}
    >
      <TrashIcon />
    </IconButton>
  );
};

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
      jsx, // Extract jsx prop to prevent it from being passed to DOM
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
              backgroundColor: theme.palette.action.hover,
            },
          }),

          // Icon-only specific styles
          ...(isIconOnly && {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& .MuiButton-startIcon': {
              margin: 0,
            },
          }),

          // Disabled state
          '&.Mui-disabled': {
            backgroundColor: theme.palette.action.disabledBackground,
            color: theme.palette.text.disabled,
            transform: 'none',
            boxShadow: 'none',
            cursor: 'not-allowed',
          },

          // Loading state
          ...(loading && {
            color: 'transparent',
            '&::after': {
              content: '""',
              position: 'absolute',
              width: 16,
              height: 16,
              border: `2px solid ${theme.palette.primary.contrastText}`,
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            },
          }),

          // Focus styles for accessibility
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },

          // Mobile responsiveness
          [theme.breakpoints.down('sm')]: {
            ...(fullWidth && {
              width: '100%',
              minWidth: '100%',
            }),
            ...(isIconOnly && {
              width: 44,
              height: 44,
              minWidth: 44,
            }),
          },

          // Ripple effect enhancement
          '& .MuiTouchRipple-root': {
            color: theme.palette.primary.main,
          },

          // Custom styles override
          ...sxProp,
        }}
        {...buttonProps}
      >
        {isIconOnly ? (
          loading ? null : (
            <AddIcon sx={{ fontSize: currentSize.iconSize }} />
          )
        ) : (
          children
        )}

        {/* Add keyframes for loading animation */}
        <style jsx>{`
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

export default { EditButton, DeleteButton, AddButton };
