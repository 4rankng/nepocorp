import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Button,
  Collapse,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import FilterChips from '@/components/ui/FilterChips';
import { countActiveFilters } from '@/features/bang-cong-no/types';

const FilterSection = ({
  title = 'Bộ lọc',
  filters = {},
  customers = [],
  partners = [],
  onRemoveFilter,
  onClearFilters,
  expanded: controlledExpanded,
  onExpandedChange,
  showActiveFilters = true,
  showExpandButton = true,
  children,
  loading = false,
  sx = {},
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const setExpanded = controlledExpanded !== undefined ? onExpandedChange : setInternalExpanded;

  const activeFilterCount = countActiveFilters(filters);
  const hasActiveFilters = activeFilterCount > 0;

  const handleToggleExpanded = () => {
    setExpanded && setExpanded(!isExpanded);
  };

  const handleClearAll = () => {
    onClearFilters && onClearFilters();
  };

  const handleRemoveFilter = filterKey => {
    onRemoveFilter && onRemoveFilter(filterKey);
  };

  return (
    <Paper elevation={1} sx={{ mb: 3, overflow: 'hidden', ...sx }}>
      {/* Filter Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isExpanded || hasActiveFilters ? '1px solid #e0e0e0' : 'none',
          bgcolor: 'grey.50',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon color="primary" />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
            }}
          >
            {title}
          </Typography>
          {hasActiveFilters && (
            <Chip
              label={activeFilterCount}
              size="small"
              color="primary"
              sx={{
                minWidth: 24,
                height: 20,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          {hasActiveFilters && (
            <Button
              startIcon={<ClearIcon />}
              onClick={handleClearAll}
              size="small"
              color="inherit"
              disabled={loading}
              sx={{
                textTransform: 'none',
                fontSize: '0.875rem',
              }}
            >
              Xóa bộ lọc
            </Button>
          )}

          {showExpandButton && (
            <IconButton onClick={handleToggleExpanded} size="small" disabled={loading}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Active Filters Display */}
      {showActiveFilters && hasActiveFilters && (
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
          <FilterChips
            filters={filters}
            customers={customers}
            partners={partners}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAll}
          />
        </Box>
      )}

      {/* Filter Controls */}
      {showExpandButton ? (
        <Collapse in={isExpanded}>
          <Box sx={{ p: 3, bgcolor: 'background.paper' }}>{children}</Box>
        </Collapse>
      ) : (
        <Box sx={{ p: 3, bgcolor: 'background.paper' }}>{children}</Box>
      )}
    </Paper>
  );
};

export default FilterSection;
