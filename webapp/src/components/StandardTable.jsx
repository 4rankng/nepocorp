import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  Typography,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  CircularProgress,
  Alert,
  TableSortLabel,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
// Enhanced theme configuration based on DinhMucDau.jsx
const theme = {
  spacing: 8,
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h6: { fontSize: '1rem', fontWeight: 600 },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem', color: 'text.secondary' },
  },
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f5f7fa', paper: '#ffffff' },
    text: { primary: '#1a1a1a', secondary: '#6b7280' },
    grey: { 50: '#fafafa', 100: '#f3f4f6', 200: '#e5e7eb' },
    success: { light: '#4caf50', main: '#2e7d32' },
    warning: { light: '#ff9800', main: '#ed6c02' },
    error: { main: '#d32f2f' },
  },
  shape: { borderRadius: 6 },
  shadows: ['none', '0px 2px 8px rgba(0, 0, 0, 0.08)', '0px 4px 12px rgba(0, 0, 0, 0.1)'],
};
// Utility function for sorting data
const sortData = (data, sortConfig) => {
  if (!sortConfig || !sortConfig.key) return data;
  return [...data].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
    if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
    // Handle numeric values
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    // Handle date values
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortConfig.direction === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }
    // Handle string values (case-insensitive)
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
};
const StandardTable = ({
  columns = [],
  data = [],
  renderActions = null,
  loading = false,
  error = null,
  emptyMessage = 'Chưa có dữ liệu',
  pagination = false,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange = () => {},
  onRowsPerPageChange = () => {},
  headerAction = null,
  onRowClick = null,
  rowKeyField,
  minHeight,
  sortable = true, // New prop to enable/disable sorting
  defaultSort = null, // New prop for default sort configuration
  onSortChange = null, // New prop for external sort handling
  ...tableProps
}) => {
  // Internal sort state
  const [sortConfig, setSortConfig] = useState(defaultSort || { key: null, direction: 'asc' });
  // Handle sort request
  const handleSort = columnKey => {
    if (!sortable) return;
    const column = columns.find(col => (col.key || col.id) === columnKey);
    if (column && column.sortable === false) return;
    let direction = 'asc';
    if (sortConfig && sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const newSortConfig = { key: columnKey, direction };
    setSortConfig(newSortConfig);
    // Call external sort handler if provided
    if (onSortChange) {
      onSortChange(newSortConfig);
    }
  };
  // Sort data if not handled externally
  const sortedData = useMemo(() => {
    if (onSortChange) {
      // External sorting - return data as is
      return data;
    }
    // Internal sorting
    return sortData(data, sortConfig);
  }, [data, sortConfig, onSortChange]);
  // Validate data and columns
  if (!Array.isArray(data)) {
    console.error('StandardTable: data prop must be an array');
    return (
      <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
        Lỗi: Dữ liệu không hợp lệ
      </Alert>
    );
  }
  if (!Array.isArray(columns)) {
    console.error('StandardTable: columns prop must be an array');
    return (
      <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
        Lỗi: Cấu hình cột không hợp lệ
      </Alert>
    );
  }
  // Extract and omit non-DOM props to prevent them from being passed to the DOM
  const { jsx: _jsx, component: _component, ...filteredTableProps } = tableProps || {};
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
        {error}
      </Alert>
    );
  }
  // Extract and omit non-DOM props to prevent them from being passed to DOM
  const {
    rowKeyField: _rowKeyField,
    minHeight: _minHeight,
    jsx: _jsxProp,
    component: _componentProp,
    sortable: _sortable,
    defaultSort: _defaultSort,
    onSortChange: _onSortChange,
    ...cleanTableProps
  } = tableProps || {};
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${theme.shape.borderRadius}px`,
        boxShadow: theme.shadows[1],
        overflow: 'hidden',
        '&:hover': {
          boxShadow: theme.shadows[2],
        },
      }}
    >
      {/* Header Action */}
      {headerAction && (
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {headerAction}
        </Box>
      )}
      <TableContainer {...cleanTableProps} component="div" sx={{ minHeight: minHeight || 'auto' }}>
        <Table
          size="small"
          sx={{
            minWidth: 650,
            '& .MuiTableCell-root': {
              py: 1,
              px: 2,
              borderColor: theme.palette.grey[200],
              fontSize: theme.typography.body2.fontSize,
            },
            '& .MuiTableHead-root': {
              '& .MuiTableCell-root': {
                backgroundColor: theme.palette.grey[50],
                color: theme.palette.text.secondary,
                fontWeight: 600,
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                borderBottom: '2px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
              },
            },
            '& .MuiTableBody-root': {
              '& tr:last-child td': {
                borderBottom: 'none',
              },
              '& tr': {
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  cursor: onRowClick ? 'pointer' : 'default',
                  transform: onRowClick ? 'translateY(-1px)' : 'none',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  '& .MuiTableCell-root': {
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                  },
                },
                '&:active': onRowClick
                  ? {
                      transform: 'translateY(0)',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                    }
                  : {},
              },
              '& tr.Mui-selected, & tr.Mui-selected:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
            },
            ...(filteredTableProps.sx || {}), // Merge any additional sx props
          }}
          {...filteredTableProps} // Spread filtered props (excluding jsx)
        >
          <TableHead>
            <TableRow>
              {columns.map(column => {
                const columnKey = column.key || column.id;
                const isSortable = sortable && column.sortable !== false;
                const isSorted = sortConfig && sortConfig.key === columnKey;
                const sortDirection = isSorted
                  ? sortConfig.direction === 'desc'
                    ? 'desc'
                    : 'asc'
                  : 'asc';
                return (
                  <TableCell
                    key={columnKey}
                    align={column.align || (column.numeric ? 'right' : 'left')}
                    sx={{
                      width: column.width,
                      cursor: isSortable ? 'pointer' : 'default',
                    }}
                    sortDirection={isSorted ? sortDirection : undefined}
                  >
                    {isSortable ? (
                      <TableSortLabel
                        active={!!isSorted}
                        direction={sortDirection}
                        onClick={() => handleSort(columnKey)}
                        sx={{
                          '& .MuiTableSortLabel-icon': {
                            fontSize: '1rem',
                          },
                          '&:hover': {
                            color: theme.palette.primary.main,
                            cursor: 'pointer',
                          },
                          '&.Mui-active': {
                            color: theme.palette.primary.main,
                            '& .MuiTableSortLabel-icon': {
                              color: theme.palette.primary.main,
                            },
                          },
                          cursor: 'pointer',
                        }}
                      >
                        {column.label || column.header}
                      </TableSortLabel>
                    ) : (
                      column.label || column.header
                    )}
                  </TableCell>
                );
              })}
              {renderActions && (
                <TableCell align="right" sx={{ width: '120px' }}>
                  Thao tác
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  align="center"
                  sx={{ py: 3, color: 'text.secondary' }}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, index) => {
                const handleRowClick = onRowClick ? () => onRowClick(row) : undefined;
                return (
                  <TableRow
                    key={row.id || index}
                    hover
                    onClick={handleRowClick}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        },
                      },
                    }}
                  >
                    {columns.map((column, columnIndex) => (
                      <TableCell
                        key={`${row.id || index}-${column.key || column.id || columnIndex}`}
                        align={column.align || (column.numeric ? 'right' : 'left')}
                        sx={{
                          fontFamily: column.numeric ? 'monospace' : 'inherit',
                          color: column.getColor
                            ? column.getColor(row[column.key], row)
                            : 'inherit',
                          fontWeight: column.fontWeight || 'inherit',
                          maxWidth: column.maxWidth,
                          whiteSpace: column.noWrap ? 'nowrap' : 'normal',
                          overflow: column.maxWidth ? 'hidden' : 'visible',
                          textOverflow: column.maxWidth ? 'ellipsis' : 'clip',
                        }}
                      >
                        {column.Cell ? (
                          <column.Cell
                            row={row}
                            value={row[column.key || column.id]}
                            column={column}
                          />
                        ) : column.render ? (
                          column.render(row[column.key || column.id], row)
                        ) : (
                          row[column.key || column.id]
                        )}
                      </TableCell>
                    ))}
                    {renderActions && (
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 0.5,
                            justifyContent: 'flex-end',
                            '& button, & [role="button"]': {
                              cursor: 'pointer',
                            },
                            '& .MuiIconButton-root:hover': {
                              cursor: 'pointer',
                            },
                          }}
                        >
                          {renderActions(row)}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `1px solid ${theme.palette.grey[200]}`,
            p: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Hàng mỗi trang:
            </Typography>
            <Select
              value={rowsPerPage}
              onChange={onRowsPerPageChange}
              size="small"
              sx={{
                height: 32,
                '& .MuiSelect-select': {
                  py: 0.5,
                  fontSize: '0.875rem',
                },
              }}
            >
              {[5, 10, 25, 50, 100].map(rows => (
                <MenuItem key={rows} value={rows}>
                  {rows}
                </MenuItem>
              ))}
            </Select>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => onPageChange(null, page - 1)}
              disabled={page === 0}
              size="small"
              sx={{
                width: 32,
                height: 32,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            
            <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'center' }}>
              Trang {page + 1} / {Math.ceil(totalCount / rowsPerPage) || 1}
            </Typography>
            
            <IconButton
              onClick={() => onPageChange(null, page + 1)}
              disabled={page >= Math.ceil(totalCount / rowsPerPage) - 1}
              size="small"
              sx={{
                width: 32,
                height: 32,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
StandardTable.propTypes = {
  columns: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  renderActions: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.string,
  emptyMessage: PropTypes.string,
  pagination: PropTypes.bool,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  totalCount: PropTypes.number,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  headerAction: PropTypes.node,
  onRowClick: PropTypes.func,
  rowKeyField: PropTypes.string,
  minHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sortable: PropTypes.bool,
  defaultSort: PropTypes.shape({
    key: PropTypes.string.isRequired,
    direction: PropTypes.oneOf(['asc', 'desc']).isRequired,
  }),
  onSortChange: PropTypes.func,
};
export default StandardTable;
