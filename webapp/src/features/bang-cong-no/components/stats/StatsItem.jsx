import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';

const StatsItem = ({
  label,
  value,
  type = 'currency', // 'currency', 'number', 'percentage', 'text'
  color = '#1976d2',
  icon: IconComponent,
  trend,
  highlighted = false,
  size = 'medium', // 'small', 'medium', 'large'
  orientation = 'vertical', // 'vertical', 'horizontal'
  sx = {}
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          valueVariant: 'h6',
          labelVariant: 'caption',
          iconSize: 'small',
          spacing: 1
        };
      case 'large':
        return {
          valueVariant: 'h3',
          labelVariant: 'body1',
          iconSize: 'large',
          spacing: 3
        };
      default:
        return {
          valueVariant: 'h5',
          labelVariant: 'body2',
          iconSize: 'medium',
          spacing: 2
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
    const styles = getSizeStyles();
    
    switch (type) {
      case 'currency':
        return (
          <CurrencyDisplay 
            amount={value}
            variant={styles.valueVariant}
            sx={{ 
              fontWeight: 700,
              color: highlighted ? color : 'text.primary',
              fontFamily: "'SF Mono', Monaco, monospace"
            }}
          />
        );
      
      case 'number':
        return (
          <Typography variant={styles.valueVariant} sx={{ 
            fontWeight: 700,
            color: highlighted ? color : 'text.primary',
            fontFamily: "'SF Mono', Monaco, monospace"
          }}>
            {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
          </Typography>
        );
      
      case 'percentage':
        return (
          <Typography variant={styles.valueVariant} sx={{ 
            fontWeight: 700,
            color: highlighted ? color : 'text.primary',
            fontFamily: "'SF Mono', Monaco, monospace"
          }}>
            {typeof value === 'number' ? `${value.toFixed(1)}%` : value}
          </Typography>
        );
      
      default:
        return (
          <Typography variant={styles.valueVariant} sx={{ 
            fontWeight: 600,
            color: highlighted ? color : 'text.primary',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'
          }}>
            {value}
          </Typography>
        );
    }
  };

  const styles = getSizeStyles();
  const isHorizontal = orientation === 'horizontal';

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        alignItems: isHorizontal ? 'center' : 'flex-start',
        gap: styles.spacing,
        p: highlighted ? 2 : 0,
        borderRadius: highlighted ? 2 : 0,
        bgcolor: highlighted ? `${color}05` : 'transparent',
        border: highlighted ? `1px solid ${color}30` : 'none',
        ...sx
      }}
    >
      {/* Icon and Label */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        minWidth: isHorizontal ? 'auto' : undefined,
        flex: isHorizontal ? 1 : undefined
      }}>
        {IconComponent && (
          <Box sx={{ 
            p: size === 'small' ? 0.5 : size === 'large' ? 1.5 : 1,
            borderRadius: 1,
            bgcolor: highlighted ? `${color}15` : `${color}10`,
            color: color,
            display: 'flex'
          }}>
            <IconComponent fontSize={styles.iconSize} />
          </Box>
        )}
        <Typography 
          variant={styles.labelVariant} 
          color="text.secondary"
          sx={{ 
            fontWeight: 500,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'
          }}
        >
          {label}
        </Typography>
      </Box>

      {/* Value */}
      <Box sx={{ 
        textAlign: isHorizontal ? 'right' : 'left',
        minWidth: isHorizontal ? 'auto' : undefined
      }}>
        {renderValue()}
        
        {/* Trend */}
        {trend !== undefined && (
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={`${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
              size="small"
              sx={{
                bgcolor: `${getTrendColor()}15`,
                color: getTrendColor(),
                fontWeight: 600,
                fontSize: size === 'small' ? '0.65rem' : '0.75rem',
                height: size === 'small' ? 20 : 24
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default StatsItem;