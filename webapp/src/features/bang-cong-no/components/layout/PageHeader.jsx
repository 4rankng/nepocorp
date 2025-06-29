import React from 'react';
import {
  Box,
  Typography,
  Button,
  Breadcrumbs,
  Link,
  Stack,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
  Print as PrintIcon
} from '@mui/icons-material';

const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions = [],
  showRefresh = false,
  showExport = false,
  showPrint = false,
  onRefresh,
  onExport,
  onPrint,
  loading = false,
  sx = {}
}) => {
  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return (
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 1 }}
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          if (isLast || !crumb.href) {
            return (
              <Typography 
                key={index}
                color={isLast ? 'text.primary' : 'text.secondary'}
                variant="body2"
                sx={{ fontWeight: isLast ? 500 : 400 }}
              >
                {crumb.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              color="inherit"
              href={crumb.href}
              onClick={crumb.onClick}
              underline="hover"
              variant="body2"
              sx={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'
              }}
            >
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  const renderActions = () => {
    const actionButtons = [...actions];
    
    // Add built-in action buttons
    if (showRefresh) {
      actionButtons.push({
        key: 'refresh',
        icon: RefreshIcon,
        label: 'Làm mới',
        onClick: onRefresh,
        variant: 'outlined',
        color: 'inherit'
      });
    }

    if (showExport) {
      actionButtons.push({
        key: 'export',
        icon: FileDownloadIcon,
        label: 'Xuất Excel',
        onClick: onExport,
        variant: 'outlined',
        color: 'success'
      });
    }

    if (showPrint) {
      actionButtons.push({
        key: 'print',
        icon: PrintIcon,
        label: 'In',
        onClick: onPrint,
        variant: 'outlined',
        color: 'inherit'
      });
    }

    if (actionButtons.length === 0) return null;

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        {actionButtons.map((action) => {
          if (action.type === 'icon') {
            return (
              <Tooltip key={action.key} title={action.label}>
                <IconButton
                  onClick={action.onClick}
                  disabled={loading || action.disabled}
                  color={action.color || 'default'}
                  size="small"
                >
                  <action.icon />
                </IconButton>
              </Tooltip>
            );
          }

          return (
            <Button
              key={action.key}
              variant={action.variant || 'contained'}
              color={action.color || 'primary'}
              startIcon={action.icon ? <action.icon /> : undefined}
              onClick={action.onClick}
              disabled={loading || action.disabled}
              size={action.size || 'medium'}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                px: 2.5,
                ...action.sx
              }}
            >
              {action.label}
            </Button>
          );
        })}
      </Stack>
    );
  };

  return (
    <Box sx={{ mb: 3, ...sx }}>
      {/* Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* Main header content */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        gap: 2,
        mb: subtitle ? 1 : 0
      }}>
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600, 
              color: 'text.primary',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
              lineHeight: 1.2
            }}
          >
            {title}
          </Typography>
          
          {subtitle && (
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                mt: 0.5,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Actions */}
        {renderActions()}
      </Box>

      {/* Divider */}
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
};

export default PageHeader;