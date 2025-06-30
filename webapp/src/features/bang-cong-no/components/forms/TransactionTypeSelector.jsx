import React from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { TRANSACTION_TYPE_OPTIONS } from '@/features/bang-cong-no/types';

const TransactionTypeSelector = ({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = '',
  label = 'Loại giao dịch',
  required = false,
  variant = 'default', // 'default', 'chips'
  orientation = 'row', // 'row', 'column'
  sx = {},
}) => {
  const handleChange = event => {
    onChange && onChange(event.target.value);
  };

  if (variant === 'chips') {
    return (
      <FormControl component="fieldset" disabled={disabled} sx={sx}>
        <FormLabel component="legend" sx={{ mb: 2, fontWeight: 500 }}>
          {label} {required && '*'}
        </FormLabel>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {TRANSACTION_TYPE_OPTIONS.map(option => (
            <Chip
              key={option.value}
              label={option.label}
              onClick={() => !disabled && onChange && onChange(option.value)}
              variant={value === option.value ? 'filled' : 'outlined'}
              color={value === option.value ? 'primary' : 'default'}
              sx={{
                cursor: disabled ? 'default' : 'pointer',
                bgcolor: value === option.value ? `${option.color}15` : 'transparent',
                borderColor: option.color,
                color: value === option.value ? option.color : 'text.primary',
                '&:hover': disabled
                  ? {}
                  : {
                      bgcolor: `${option.color}10`,
                    },
                '& .MuiChip-label': {
                  fontWeight: value === option.value ? 600 : 500,
                },
              }}
            />
          ))}
        </Box>
        {(error || helperText) && (
          <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mt: 1 }}>
            {helperText}
          </Typography>
        )}
      </FormControl>
    );
  }

  return (
    <FormControl component="fieldset" disabled={disabled} error={error} sx={sx}>
      <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
        {label} {required && '*'}
      </FormLabel>
      <RadioGroup
        value={value}
        onChange={handleChange}
        row={orientation === 'row'}
        sx={{
          gap: orientation === 'row' ? 3 : 1,
          '& .MuiFormControlLabel-root': {
            mr: orientation === 'row' ? 0 : 1,
          },
        }}
      >
        {TRANSACTION_TYPE_OPTIONS.map(option => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size="small" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: option.color,
                    fontWeight: value === option.value ? 600 : 500,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
                  }}
                >
                  {option.label}
                </Typography>
                {option.isDebit !== null && (
                  <Chip
                    label={option.isDebit ? 'Nợ' : 'Có'}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      bgcolor: option.isDebit ? '#d32f2f15' : '#2e7d3215',
                      color: option.isDebit ? '#d32f2f' : '#2e7d32',
                    }}
                  />
                )}
              </Box>
            }
          />
        ))}
      </RadioGroup>
      {(error || helperText) && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mt: 1 }}>
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};

export default TransactionTypeSelector;
