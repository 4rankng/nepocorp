import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Chip,
  Paper,
  ClickAwayListener
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import Dropdown from './Dropdown';
import { 
  DATE_RANGE_PRESETS, 
  DATE_RANGE_OPTIONS, 
  getDateRange,
  validateDateRange 
} from '@/features/bang-cong-no/types';

const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  label = "Khoảng thời gian",
  placeholder = "Chọn khoảng thời gian",
  disabled = false,
  error = false,
  helperText = "",
  sx = {}
}) => {
  const [preset, setPreset] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [startDateValue, setStartDateValue] = useState(startDate ? new Date(startDate) : null);
  const [endDateValue, setEndDateValue] = useState(endDate ? new Date(endDate) : null);
  const [validationError, setValidationError] = useState('');

  // Update internal state when props change
  useEffect(() => {
    setStartDateValue(startDate ? new Date(startDate) : null);
    setEndDateValue(endDate ? new Date(endDate) : null);
  }, [startDate, endDate]);

  const handlePresetChange = (selectedPreset) => {
    setPreset(selectedPreset);
    
    if (selectedPreset === DATE_RANGE_PRESETS.CUSTOM) {
      setCustomMode(true);
      return;
    }

    if (!selectedPreset) {
      // Clear selection
      setCustomMode(false);
      setStartDateValue(null);
      setEndDateValue(null);
      setValidationError('');
      onChange(null, null);
      return;
    }

    const dateRange = getDateRange(selectedPreset);
    if (dateRange) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      
      setStartDateValue(start);
      setEndDateValue(end);
      setCustomMode(false);
      setValidationError('');
      
      onChange(
        dateRange.startDate,
        dateRange.endDate
      );
    }
  };

  const handleCustomDateChange = (field, date) => {
    let newStartDate = startDateValue;
    let newEndDate = endDateValue;

    if (field === 'start') {
      newStartDate = date;
      setStartDateValue(date);
    } else {
      newEndDate = date;
      setEndDateValue(date);
    }

    // Validate and notify parent
    if (newStartDate && newEndDate) {
      const validation = validateDateRange(
        newStartDate.toISOString().split('T')[0],
        newEndDate.toISOString().split('T')[0]
      );

      if (validation.isValid) {
        setValidationError('');
        onChange(
          newStartDate.toISOString().split('T')[0],
          newEndDate.toISOString().split('T')[0]
        );
      } else {
        setValidationError(validation.error);
      }
    } else if (newStartDate || newEndDate) {
      // Partial date selection
      onChange(
        newStartDate ? newStartDate.toISOString().split('T')[0] : null,
        newEndDate ? newEndDate.toISOString().split('T')[0] : null
      );
    }
  };

  const clearSelection = () => {
    setPreset('');
    setCustomMode(false);
    setStartDateValue(null);
    setEndDateValue(null);
    setValidationError('');
    onChange(null, null);
  };

  const formatDisplayValue = () => {
    if (!startDateValue && !endDateValue) return '';
    
    if (startDateValue && endDateValue) {
      const start = startDateValue.toLocaleDateString('vi-VN');
      const end = endDateValue.toLocaleDateString('vi-VN');
      return start === end ? start : `${start} → ${end}`;
    }
    
    if (startDateValue) {
      return `Từ ${startDateValue.toLocaleDateString('vi-VN')}`;
    }
    
    if (endDateValue) {
      return `Đến ${endDateValue.toLocaleDateString('vi-VN')}`;
    }
    
    return '';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Box sx={{ ...sx }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          {label}
        </Typography>
        
        {/* Preset Selector */}
        <Dropdown
          value={preset}
          onChange={handlePresetChange}
          options={DATE_RANGE_OPTIONS}
          placeholder={placeholder}
          clearable
          searchable={false}
          disabled={disabled}
          error={error || !!validationError}
          sx={{ mb: customMode ? 2 : 0 }}
        />

        {/* Active Date Range Display */}
        {(startDateValue || endDateValue) && !customMode && (
          <Box sx={{ mt: 1 }}>
            <Chip
              label={formatDisplayValue()}
              onDelete={clearSelection}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
        )}

        {/* Custom Date Range Inputs */}
        {customMode && (
          <Paper elevation={1} sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Từ ngày"
                  value={startDateValue}
                  onChange={(date) => handleCustomDateChange('start', date)}
                  disabled={disabled}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Đến ngày"
                  value={endDateValue}
                  onChange={(date) => handleCustomDateChange('end', date)}
                  disabled={disabled}
                  minDate={startDateValue}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true
                    }
                  }}
                />
              </Grid>
            </Grid>

            {/* Active Custom Range Display */}
            {(startDateValue || endDateValue) && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Đã chọn:
                </Typography>
                <Chip
                  label={formatDisplayValue()}
                  onDelete={clearSelection}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            )}
          </Paper>
        )}

        {/* Error Display */}
        {(validationError || helperText) && (
          <Typography 
            variant="caption" 
            color={validationError ? 'error' : 'text.secondary'}
            sx={{ mt: 1, display: 'block' }}
          >
            {validationError || helperText}
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default DateRangePicker;