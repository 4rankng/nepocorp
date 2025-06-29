import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip,
  LinearProgress
} from '@mui/material';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';

const StatCard = ({
  title,
  value,
  type = 'currency', // 'currency', 'number', 'percentage'
  color = '#1976d2',
  icon: IconComponent,
  trend,
  trendLabel,
  subtitle,
  loading = false,
  variant = 'default', // 'default', 'highlighted', 'danger'
  onClick,
  sx = {}
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'highlighted':
        return {
          border: `2px solid ${color}`,
          bgcolor: `${color}05`,
          '&:hover': {
            bgcolor: `${color}10`,
            boxShadow: 3
          }
        };
      case 'danger':
        return {
          border: '2px solid #d32f2f',
          bgcolor: '#d32f2f05',
          '&:hover': {
            bgcolor: '#d32f2f10',
            boxShadow: 3
          }
        };
      default:
        return {
          border: `1px solid ${color}30`,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 2,
            borderColor: `${color}60`
          }
        };
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text.secondary';
    if (trend > 0) return '#2e7d32';
    if (trend < 0) return '#d32f2f';
    return 'text.secondary';
  };

  const renderValue = () => {
    if (loading) {
      return (
        <Box sx={{ width: '80%', mt: 1 }}>
          <LinearProgress variant="indeterminate" />
        </Box>
      );
    }

    switch (type) {
      case 'currency':
        return (
          <CurrencyDisplay 
            amount={value}
            variant="h4"
            sx={{ 
              fontWeight: 700,
              fontFamily: "'SF Mono', Monaco, monospace"
            }}
          />
        );
      
      case 'number':
        return (
          <Typography variant="h4" sx={{ 
            fontWeight: 700,
            color: color,
            fontFamily: "'SF Mono', Monaco, monospace"
          }}>
            {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
          </Typography>
        );
      
      case 'percentage':
        return (
          <Typography variant="h4" sx={{ 
            fontWeight: 700,
            color: color,
            fontFamily: "'SF Mono', Monaco, monospace"
          }}>
            {typeof value === 'number' ? `${value.toFixed(1)}%` : value}
          </Typography>
        );
      
      default:
        return (
          <Typography variant="h4" sx={{ 
            fontWeight: 700,
            color: color
          }}>
            {value}
          </Typography>
        );
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        ...getVariantStyles(),
        ...sx
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header with icon and title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {IconComponent && (
            <Box sx={{ 
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color: color,
              display: 'flex',
              mr: 2
            }}>
              <IconComponent fontSize="medium" />
            </Box>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ 
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'
            }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Main value */}
        <Box sx={{ mb: trend || trendLabel ? 2 : 0 }}>
          {renderValue()}
        </Box>

        {/* Trend and additional info */}
        {(trend !== undefined || trendLabel) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {trend !== undefined && (
              <Chip
                label={`${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
                size="small"
                sx={{
                  bgcolor: `${getTrendColor()}15`,
                  color: getTrendColor(),
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24
                }}
              />
            )}
            {trendLabel && (
              <Typography variant="caption" color="text.secondary">
                {trendLabel}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;