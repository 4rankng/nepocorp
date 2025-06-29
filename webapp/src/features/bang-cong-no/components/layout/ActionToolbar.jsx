import React from 'react';
import {
  Box,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Zoom,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  FileDownload as FileDownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const ActionToolbar = ({
  primaryAction,
  secondaryActions = [],
  variant = 'fab', // 'fab', 'speed-dial'
  position = 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
  visible = true,
  loading = false,
  sx = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed',
      zIndex: 1000
    };

    switch (position) {
      case 'bottom-left':
        return {
          ...baseStyles,
          bottom: 24,
          left: 24
        };
      case 'top-right':
        return {
          ...baseStyles,
          top: 24,
          right: 24
        };
      case 'top-left':
        return {
          ...baseStyles,
          top: 24,
          left: 24
        };
      default: // bottom-right
        return {
          ...baseStyles,
          bottom: 24,
          right: 24
        };
    }
  };

  const renderFab = () => {
    if (!primaryAction) return null;

    return (
      <Zoom in={visible && !loading}>
        <Fab
          color={primaryAction.color || 'primary'}
          aria-label={primaryAction.label}
          onClick={primaryAction.onClick}
          disabled={loading || primaryAction.disabled}
          size={isMobile ? 'medium' : 'large'}
          sx={{
            ...getPositionStyles(),
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6,
              transform: 'scale(1.05)'
            },
            transition: 'all 0.2s ease-in-out',
            ...sx
          }}
        >
          {primaryAction.icon ? <primaryAction.icon /> : <AddIcon />}
        </Fab>
      </Zoom>
    );
  };

  const renderSpeedDial = () => {
    const actions = secondaryActions.map((action) => ({
      ...action,
      icon: action.icon ? <action.icon /> : <AddIcon />,
      name: action.label
    }));

    // Add primary action to speed dial if provided
    if (primaryAction) {
      actions.unshift({
        icon: primaryAction.icon ? <primaryAction.icon /> : <AddIcon />,
        name: primaryAction.label,
        onClick: primaryAction.onClick
      });
    }

    return (
      <SpeedDial
        ariaLabel="Actions"
        sx={{
          ...getPositionStyles(),
          '& .MuiFab-primary': {
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6
            }
          },
          ...sx
        }}
        icon={<SpeedDialIcon />}
        open={visible}
        direction={position.includes('top') ? 'down' : 'up'}
        FabProps={{
          size: isMobile ? 'medium' : 'large',
          disabled: loading
        }}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.key || action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
            sx={{
              '& .MuiSpeedDialAction-fab': {
                bgcolor: action.color ? `${action.color}.main` : 'background.paper',
                color: action.color ? `${action.color}.contrastText` : 'text.primary',
                '&:hover': {
                  bgcolor: action.color ? `${action.color}.dark` : 'grey.100'
                }
              }
            }}
          />
        ))}
      </SpeedDial>
    );
  };

  if (!visible) return null;

  if (variant === 'speed-dial' && (secondaryActions.length > 0 || primaryAction)) {
    return renderSpeedDial();
  }

  return renderFab();
};

// Predefined common actions
export const COMMON_ACTIONS = {
  ADD: {
    key: 'add',
    icon: AddIcon,
    label: 'Thêm mới',
    color: 'primary'
  },
  EXPORT: {
    key: 'export',
    icon: FileDownloadIcon,
    label: 'Xuất Excel',
    color: 'success'
  },
  PRINT: {
    key: 'print',
    icon: PrintIcon,
    label: 'In',
    color: 'inherit'
  },
  REFRESH: {
    key: 'refresh',
    icon: RefreshIcon,
    label: 'Làm mới',
    color: 'inherit'
  },
  IMPORT: {
    key: 'import',
    icon: UploadIcon,
    label: 'Nhập dữ liệu',
    color: 'info'
  },
  SETTINGS: {
    key: 'settings',
    icon: SettingsIcon,
    label: 'Cài đặt',
    color: 'inherit'
  }
};

export default ActionToolbar;