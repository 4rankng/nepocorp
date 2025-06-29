import React from 'react';
import { Typography, Box } from '@mui/material';
import { formatCurrency, formatBalance } from '@/features/bang-cong-no/utils';

const CurrencyDisplay = ({ 
  amount, 
  type = 'currency', // 'currency', 'balance', 'debit-credit'
  variant = 'body1',
  color,
  showSign = false,
  showSymbol = true,
  sx = {},
  ...props 
}) => {
  const renderCurrency = () => {
    if (type === 'balance') {
      const balanceData = formatBalance(amount);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
          <Typography 
            variant={variant} 
            sx={{ 
              color: color || balanceData.color,
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif'
            }}
            {...props}
          >
            {balanceData.amount}
          </Typography>
          {balanceData.label !== 'Cân bằng' && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: color || balanceData.color,
                fontSize: '0.7rem',
                fontWeight: 500
              }}
            >
              ({balanceData.label})
            </Typography>
          )}
        </Box>
      );
    }

    if (type === 'debit-credit') {
      const debit = amount?.debit || 0;
      const credit = amount?.credit || 0;
      
      if (debit > 0) {
        return (
          <Typography 
            variant={variant} 
            sx={{ 
              color: color || '#d32f2f',
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
              ...sx
            }}
            {...props}
          >
            {formatCurrency(debit, { showSymbol })}
          </Typography>
        );
      }

      if (credit > 0) {
        return (
          <Typography 
            variant={variant} 
            sx={{ 
              color: color || '#2e7d32',
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
              ...sx
            }}
            {...props}
          >
            {formatCurrency(credit, { showSymbol })}
          </Typography>
        );
      }

      return (
        <Typography 
          variant={variant} 
          sx={{ 
            color: color || '#616161',
            fontWeight: 500,
            fontFamily: 'monospace',
            ...sx
          }}
          {...props}
        >
          -
        </Typography>
      );
    }

    // Default currency display
    const displayAmount = showSign && amount > 0 ? `+${amount}` : amount;
    const formattedAmount = formatCurrency(displayAmount, { showSymbol });

    return (
      <Typography 
        variant={variant} 
        sx={{ 
          color: color,
          fontWeight: 500,
          fontFamily: 'monospace',
          ...sx
        }}
        {...props}
      >
        {formattedAmount}
      </Typography>
    );
  };

  return renderCurrency();
};

export default CurrencyDisplay;