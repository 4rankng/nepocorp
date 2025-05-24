import React from 'react';
import { IconButton, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { PencilIcon, TrashIcon } from '../../assets/icons';
import { PlusIcon } from '@heroicons/react/24/outline';

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
  ...props
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
      {...props}
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
  ...props
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
      {...props}
    >
      <TrashIcon />
    </IconButton>
  );
};

export const AddButton = ({
  onClick,
  disabled = false,
  children,
  size = 'small',
  className = '',
  ...props
}) => {
  return (
    <Button
      variant="contained"
      onClick={onClick}
      disabled={disabled}
      size={size}
      sx={{
        backgroundColor: theme.palette.primary.main,
        color: '#fff',
        borderRadius: '6px',
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
        },
        '&.Mui-disabled': {
          backgroundColor: 'action.disabledBackground',
          color: 'text.disabled',
        },
        ...(size === 'small' && {
          height: '36px',
          px: '16px',
          fontSize: '0.875rem',
          fontWeight: 500,
        }),
        ...(size === 'medium' && {
          height: '40px',
          px: '20px',
          fontSize: '0.9375rem',
          fontWeight: 500,
        }),
      }}
      startIcon={<PlusIcon style={{ width: '20px', height: '20px' }} />}
      {...props}
    >
      {children}
    </Button>
  );
};

export default { EditButton, DeleteButton, AddButton };
