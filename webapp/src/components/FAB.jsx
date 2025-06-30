import React from 'react';
import { Fab, Zoom } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useModalVisibility } from '@hooks/useModalVisibility';
import { Z_INDEX } from '@constants/zIndex';

const FAB = ({
  onClick,
  icon = <AddIcon />,
  ariaLabel = 'Add',
  color = 'primary',
  size = 'large',
  disabled = false,
  loading = false,
  hideOnModal = true,
  sx = {},
  ...props
}) => {
  const { hasActiveModal } = useModalVisibility();

  // Determine if FAB should be visible
  const isVisible = !loading && (!hideOnModal || !hasActiveModal) && !disabled;

  return (
    <Zoom in={isVisible}>
      <Fab
        color={color}
        size={size}
        aria-label={ariaLabel}
        onClick={onClick}
        disabled={disabled || loading}
        sx={{
          position: 'fixed',
          bottom: { xs: 24, sm: 32 },
          right: { xs: 24, sm: 32 },
          zIndex: Z_INDEX.FLOATING,
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 12px 40px rgba(25, 118, 210, 0.35)',
          },
          transition: 'all 0.2s ease-in-out',
          width: 56,
          height: 56,
          ...sx,
        }}
        {...props}
      >
        {icon}
      </Fab>
    </Zoom>
  );
};

export default FAB;
