import React from 'react';
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
import { alpha, useTheme } from '@mui/material/styles';

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
  ...tableProps
}) => {
  const theme = useTheme();
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
        borderRadius: theme.shape.borderRadius,
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
      <TableContainer {...cleanTableProps} component="div">
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
              '& tr:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
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
                  key={column.key}
                  align={column.align || (column.numeric ? 'right' : 'left')}
                  sx={{ width: column.width }}
                >
                  {column.label}
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
              data.map((row, index) => (
                <TableRow key={row.id || index} hover>
                  {columns.map(column => (
                    <TableCell
                      key={column.key}
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
              ))
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

export default StandardTable;
