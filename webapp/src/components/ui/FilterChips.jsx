import React from 'react';
import { Box, Chip, Typography, Fade } from '@mui/material';
import { formatDateRange, formatCurrency } from '@/features/bang-cong-no/utils';
import { TRANSACTION_TYPE_LABELS } from '@/features/bang-cong-no/types';

const FilterChips = ({
  filters = {},
  customers = [],
  partners = [],
  onRemoveFilter,
  onClearAll,
  sx = {}
}) => {
  const getFilterChips = () => {
    const chips = [];

    // Customer filter
    if (filters.customer_id) {
      const customer = customers.find(c => c.id === filters.customer_id);
      chips.push({
        key: 'customer',
        label: `KH: ${customer?.name || 'N/A'}`,
        color: 'primary',
        onDelete: () => onRemoveFilter('customer_id')
      });
    }

    // Partner filter
    if (filters.partner_id) {
      const partner = partners.find(p => p.id === filters.partner_id);
      chips.push({
        key: 'partner',
        label: `ĐT: ${partner?.name || 'N/A'}`,
        color: 'secondary',
        onDelete: () => onRemoveFilter('partner_id')
      });
    }

    // Transaction type filter
    if (filters.transaction_type) {
      const typeLabel = TRANSACTION_TYPE_LABELS[filters.transaction_type] || filters.transaction_type;
      chips.push({
        key: 'transaction_type',
        label: `Loại: ${typeLabel}`,
        color: 'info',
        onDelete: () => onRemoveFilter('transaction_type')
      });
    }

    // Date range filter
    if (filters.start_date && filters.end_date) {
      const dateLabel = formatDateRange(filters.start_date, filters.end_date);
      chips.push({
        key: 'date_range',
        label: `Ngày: ${dateLabel}`,
        color: 'warning',
        onDelete: () => {
          onRemoveFilter('start_date');
          onRemoveFilter('end_date');
        }
      });
    } else if (filters.start_date) {
      chips.push({
        key: 'start_date',
        label: `Từ: ${filters.start_date}`,
        color: 'warning',
        onDelete: () => onRemoveFilter('start_date')
      });
    } else if (filters.end_date) {
      chips.push({
        key: 'end_date',
        label: `Đến: ${filters.end_date}`,
        color: 'warning',
        onDelete: () => onRemoveFilter('end_date')
      });
    }

    // Amount range filter
    if (filters.amount_min || filters.amount_max) {
      let amountLabel = 'Số tiền: ';
      if (filters.amount_min && filters.amount_max) {
        amountLabel += `${formatCurrency(filters.amount_min, { showSymbol: false })} - ${formatCurrency(filters.amount_max)}`;
      } else if (filters.amount_min) {
        amountLabel += `≥ ${formatCurrency(filters.amount_min)}`;
      } else {
        amountLabel += `≤ ${formatCurrency(filters.amount_max)}`;
      }
      
      chips.push({
        key: 'amount_range',
        label: amountLabel,
        color: 'success',
        onDelete: () => {
          onRemoveFilter('amount_min');
          onRemoveFilter('amount_max');
        }
      });
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      chips.push({
        key: 'search',
        label: `Tìm kiếm: "${filters.search}"`,
        color: 'default',
        onDelete: () => onRemoveFilter('search')
      });
    }

    return chips;
  };

  const filterChips = getFilterChips();

  if (filterChips.length === 0) {
    return null;
  }

  return (
    <Fade in={filterChips.length > 0}>
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1, 
        alignItems: 'center',
        ...sx 
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          Bộ lọc đang áp dụng:
        </Typography>
        
        {filterChips.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            onDelete={chip.onDelete}
            size="small"
            color={chip.color}
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              '& .MuiChip-deleteIcon': {
                fontSize: '0.875rem'
              }
            }}
          />
        ))}

        {filterChips.length > 1 && (
          <Chip
            label="Xóa tất cả"
            onClick={onClearAll}
            size="small"
            variant="outlined"
            color="error"
            sx={{
              fontSize: '0.75rem',
              ml: 1
            }}
          />
        )}
      </Box>
    </Fade>
  );
};

export default FilterChips;