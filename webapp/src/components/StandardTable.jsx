import React from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  TablePagination,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
    grey: { 100: '#f3f4f6', 200: '#e5e7eb' },
    success: { light: '#4caf50', main: '#2e7d32' },
    warning: { light: '#ff9800', main: '#ed6c02' },
    error: { main: '#d32f2f' },
  },
  shape: { borderRadius: 6 },
  shadows: ['none', '0px 2px 8px rgba(0, 0, 0, 0.08)', '0px 4px 12px rgba(0, 0, 0, 0.1)'],
};

const spacing = value => `${value * theme.spacing}px`;

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
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  headerAction = null,
  onRowClick = null, // Added onRowClick prop
  rowKeyField, // Destructure rowKeyField
  minHeight, // Destructure minHeight
  ...tableProps
}) => {
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

  // Extract and omit search-related props and non-DOM props to prevent them from being passed to DOM
  const {
    searchTerm: _searchTerm,
    onSearchChange: _onSearchChange,
    searchPlaceholder: _searchPlaceholder,
    rowKeyField: _rowKeyField, // Ensure rowKeyField is not in cleanTableProps
    minHeight: _minHeight, // Ensure minHeight is not in cleanTableProps
    jsx: _jsxProp,
    component: _componentProp,
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
      {/* Search Input */}
      {(onSearchChange || headerAction) && (
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {onSearchChange && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={onSearchChange}
              sx={{
                flex: 1,
                maxWidth: 400,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          )}
          {headerAction && <Box sx={{ ml: 'auto' }}>{headerAction}</Box>}
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
              },
            },
            '& .MuiTableBody-root': {
              '& tr:last-child td': {
                borderBottom: 'none',
              },
              '& tr': {
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  cursor: onRowClick ? 'pointer' : 'default',
                  transform: onRowClick ? 'translateY(-1px)' : 'none',
                  boxShadow: onRowClick ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
                },
                '&:active': onRowClick
                  ? {
                      transform: 'translateY(0)',
                      boxShadow: 'none',
                    }
                  : {},
              },
              '& tr.Mui-selected, & tr.Mui-selected:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
            },
            ...(filteredTableProps.sx || {}), // Merge any additional sx props
          }}
          {...filteredTableProps} // Spread filtered props (excluding jsx)
        >
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell
                  key={column.key || column.id}
                  align={column.align || (column.numeric ? 'right' : 'left')}
                  sx={{ width: column.width }}
                >
                  {column.label || column.header}
                </TableCell>
              ))}
              {renderActions && (
                <TableCell align="right" sx={{ width: '120px' }}>
                  Thao tác
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
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
              data.map((row, index) => {
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
                          color: column.getColor ? column.getColor(row[column.key], row) : 'inherit',
                          fontWeight: column.fontWeight || 'inherit',
                          maxWidth: column.maxWidth,
                          whiteSpace: column.noWrap ? 'nowrap' : 'normal',
                          overflow: column.maxWidth ? 'hidden' : 'visible',
                          textOverflow: column.maxWidth ? 'ellipsis' : 'clip',
                        }}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </TableCell>
                    ))}
                    {renderActions && (
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
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
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          labelRowsPerPage="Hàng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          sx={{
            borderTop: `1px solid ${theme.palette.grey[200]}`,
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: theme.typography.body2.fontSize,
            },
          }}
        />
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
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  headerAction: PropTypes.node,
  onRowClick: PropTypes.func, // Added propType for onRowClick
};

export default StandardTable;
