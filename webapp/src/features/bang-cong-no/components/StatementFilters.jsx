import React, { useState, useEffect } from 'react';
import {
  Paper,
  Grid,
  Typography,
  Button,
  Box,
  Chip,
  Collapse,
  IconButton
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import Dropdown from '@/components/ui/Dropdown';
import { FILTER_OPTIONS, getDateRange } from '../constants';

const StatementFilters = ({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  customers = [],
  partners = [],
  loading = false 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [dateRange, setDateRange] = useState('');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  // Transform data for dropdowns
  const customerOptions = customers.map(customer => ({
    value: customer.id,
    label: customer.name,
    displayText: customer.name
  }));

  const partnerOptions = partners.map(partner => ({
    value: partner.id,
    label: partner.name,
    displayText: partner.name
  }));

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    
    if (range === 'custom') {
      // For custom range, user will set dates manually
      return;
    }
    
    if (range === '') {
      // Clear date filter
      onFiltersChange({
        start_date: null,
        end_date: null
      });
      setCustomDateStart('');
      setCustomDateEnd('');
      return;
    }

    const dateRangeData = getDateRange(range);
    if (dateRangeData) {
      onFiltersChange({
        start_date: dateRangeData.startDate,
        end_date: dateRangeData.endDate
      });
    }
  };

  // Handle custom date changes
  const handleCustomDateChange = (field, value) => {
    if (field === 'start') {
      setCustomDateStart(value);
      if (value && customDateEnd) {
        onFiltersChange({
          start_date: value,
          end_date: customDateEnd
        });
      }
    } else {
      setCustomDateEnd(value);
      if (customDateStart && value) {
        onFiltersChange({
          start_date: customDateStart,
          end_date: value
        });
      }
    }
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.customer_id) count++;
    if (filters.partner_id) count++;
    if (filters.transaction_type) count++;
    if (filters.start_date && filters.end_date) count++;
    if (filters.search) count++;
    return count;
  };

  // Clear all filters
  const handleClearAll = () => {
    setDateRange('');
    setCustomDateStart('');
    setCustomDateEnd('');
    onClearFilters();
  };

  // Get active filter chips
  const getActiveFilters = () => {
    const chips = [];
    
    if (filters.customer_id) {
      const customer = customers.find(c => c.id === filters.customer_id);
      chips.push({
        key: 'customer',
        label: `KH: ${customer?.name || 'N/A'}`,
        onDelete: () => onFiltersChange({ customer_id: null })
      });
    }
    
    if (filters.partner_id) {
      const partner = partners.find(p => p.id === filters.partner_id);
      chips.push({
        key: 'partner',
        label: `ĐT: ${partner?.name || 'N/A'}`,
        onDelete: () => onFiltersChange({ partner_id: null })
      });
    }
    
    if (filters.transaction_type) {
      const type = FILTER_OPTIONS.TRANSACTION_TYPES.find(t => t.value === filters.transaction_type);
      chips.push({
        key: 'type',
        label: type?.label || filters.transaction_type,
        onDelete: () => onFiltersChange({ transaction_type: null })
      });
    }
    
    if (filters.start_date && filters.end_date) {
      chips.push({
        key: 'date',
        label: `${filters.start_date} → ${filters.end_date}`,
        onDelete: () => {
          setDateRange('');
          setCustomDateStart('');
          setCustomDateEnd('');
          onFiltersChange({ start_date: null, end_date: null });
        }
      });
    }
    
    return chips;
  };

  const activeFilterCount = getActiveFilterCount();
  const activeFilters = getActiveFilters();

  return (
    <Paper elevation={1} sx={{ mb: 3 }}>
      {/* Filter Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: expanded ? '1px solid #e0e0e0' : 'none'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Bộ lọc
          </Typography>
          {activeFilterCount > 0 && (
            <Chip 
              label={activeFilterCount}
              size="small"
              color="primary"
              sx={{ minWidth: 24, height: 20 }}
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {activeFilterCount > 0 && (
            <Button
              startIcon={<ClearIcon />}
              onClick={handleClearAll}
              size="small"
              color="inherit"
            >
              Xóa bộ lọc
            </Button>
          )}
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {activeFilters.map((filter) => (
              <Chip
                key={filter.key}
                label={filter.label}
                onDelete={filter.onDelete}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Filter Controls */}
      <Collapse in={expanded}>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Customer Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Dropdown
                label="Khách hàng"
                value={filters.customer_id || ''}
                onChange={(value) => onFiltersChange({ customer_id: value || null })}
                options={customerOptions}
                placeholder="Chọn khách hàng"
                clearable
                searchable
                disabled={loading}
              />
            </Grid>

            {/* Partner Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Dropdown
                label="Đối tác"
                value={filters.partner_id || ''}
                onChange={(value) => onFiltersChange({ partner_id: value || null })}
                options={partnerOptions}
                placeholder="Chọn đối tác"
                clearable
                searchable
                disabled={loading}
              />
            </Grid>

            {/* Transaction Type Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Dropdown
                label="Loại giao dịch"
                value={filters.transaction_type || ''}
                onChange={(value) => onFiltersChange({ transaction_type: value || null })}
                options={FILTER_OPTIONS.TRANSACTION_TYPES}
                placeholder="Chọn loại giao dịch"
                clearable
                searchable={false}
                disabled={loading}
              />
            </Grid>

            {/* Date Range Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <Dropdown
                label="Khoảng thời gian"
                value={dateRange}
                onChange={handleDateRangeChange}
                options={FILTER_OPTIONS.DATE_RANGES}
                placeholder="Chọn khoảng thời gian"
                clearable
                searchable={false}
                disabled={loading}
              />
            </Grid>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Từ ngày
                    </Typography>
                    <input
                      type="date"
                      value={customDateStart}
                      onChange={(e) => handleCustomDateChange('start', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      disabled={loading}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Đến ngày
                    </Typography>
                    <input
                      type="date"
                      value={customDateEnd}
                      onChange={(e) => handleCustomDateChange('end', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      disabled={loading}
                    />
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default StatementFilters;