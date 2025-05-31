import { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import { DataGrid, GridToolbarContainer, plPL, enUS } from '@mui/x-data-grid'; // Assuming plPL for Polish locale and enUS for English
import { alpha } from '@mui/material/styles';

// Theme (simplified for brevity, assuming it's defined elsewhere or using default MUI theme)
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
    primary: { main: '#1976d2' }, // Blue
    background: { default: '#f5f7fa', paper: '#ffffff' },
    text: { primary: '#1a1a1a', secondary: '#6b7280' },
    grey: { 50: '#fafafa', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db' }, // Added 300 for divider
    success: { light: '#4caf50', main: '#2e7d32' },
    warning: { light: '#ff9800', main: '#ed6c02' },
    error: { main: '#d32f2f' },
    divider: '#e5e7eb', // Example divider color
  },
  shape: { borderRadius: 6 },
  shadows: ['none', '0px 2px 8px rgba(0, 0, 0, 0.08)', '0px 4px 12px rgba(0, 0, 0, 0.1)'],
};

const CustomToolbar = ({ headerAction }) => (
  <GridToolbarContainer
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
  </GridToolbarContainer>
);

CustomToolbar.propTypes = {
  headerAction: PropTypes.node,
};

const StandardTable = ({
  columns: inputColumns = [],
  data: inputData = [],
  renderActions = null, // Will be handled as a special column
  loading = false,
  error = null,
  emptyMessage = 'Chưa có dữ liệu', // For Vietnamese, consider using localeText
  pagination = true, // DataGrid has pagination by default, this prop can control it
  page: pageProp = 0, // 0-indexed
  rowsPerPage: pageSizeProp = 10,
  totalCount: rowCountProp = 0,
  onPageChange: onPageChangeProp,
  onRowsPerPageChange: onPageSizeChangeProp,
  headerAction = null,
  onRowClick: onRowClickProp,
  rowKeyField = 'id', // Default to 'id'
  minHeight = 300, // Default minHeight
  sortable = true, // Prop to enable/disable sorting on all columns
  defaultSort = null, // { key, direction }
  onSortChange: onSortModelChangeProp,
  customRowsPerPageOptions = [5, 10, 50, 100],
  showSTT = true,
  // tableProps will be spread to DataGrid, filter out any that are not valid DataGrid props
  ...otherTableProps
}) => {
  const localeText = plPL.components.MuiDataGrid.defaultProps.localeText; // Or enUS

  const transformedColumns = useMemo(() => {
    let cols = inputColumns.map(col => {
      const newCol = {
        field: col.key || col.id,
        headerName: col.label || col.header,
        width: col.width || 150, // Default width
        align: col.align || (col.numeric ? 'right' : 'left'),
        headerAlign: col.align || (col.numeric ? 'right' : 'left'),
        sortable: sortable && (col.sortable !== false), // Overall sortable prop and individual column sortable
      };

      if (col.render) {
        newCol.renderCell = params => col.render(params.value, params.row, params.api.getRowIndex(params.row.id));
      } else if (col.Cell) {
        newCol.renderCell = params => <col.Cell row={params.row} value={params.value} column={col} index={params.api.getRowIndex(params.row.id)} />;
      }

      // Apply custom styling from original column definition if any
      if (col.sx) {
        newCol.cellClassName = 'custom-cell-style'; // Requires global CSS or sx on DataGrid for this class
        newCol.headerClassName = 'custom-header-style';
        // Or apply sx directly if possible, though DataGrid's column definition sx is limited.
        // For more complex styling, renderCell might be needed or sx on DataGrid targeting specific cells/headers.
      }
      if (col.numeric) {
         newCol.type = 'number';
      }
      if (col.maxWidth) {
        // DataGrid doesn't have maxWidth directly on column, but minWidth and flex can be used.
        // This might require manual width calculations or different approach. For now, we'll use width.
      }


      return newCol;
    });

    if (showSTT) {
      cols.unshift({
        field: '__stt',
        headerName: 'STT',
        width: 60,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: params => {
          // params.api.getRowIndex is deprecated, use params.api.getSortedRowIds().indexOf(params.id)
          // For client-side pagination:
          const rowIndex = params.api.getSortedRowIds().indexOf(params.id);
          return rowIndex + 1 + (pageProp * pageSizeProp); // Assumes pageProp and pageSizeProp reflect current pagination state
        },
        align: 'center',
        headerAlign: 'center',
      });
    }

    if (renderActions) {
        cols.push({
            field: '__actions',
            headerName: 'Thao tác',
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            width: typeof renderActions === 'function' && renderActions.width ? renderActions.width : 120, // Customizable width
            align: 'right',
            headerAlign: 'right',
            renderCell: params => renderActions(params.row),
        });
    }

    return cols;
  }, [inputColumns, showSTT, sortable, renderActions, pageProp, pageSizeProp]);

  const transformedRows = useMemo(() => {
    return inputData.map(row => ({
      ...row,
      id: row[rowKeyField] !== undefined ? row[rowKeyField] : row.id, // Ensure unique id
    }));
  }, [inputData, rowKeyField]);

  const sortModel = useMemo(() => {
    if (defaultSort && defaultSort.key) {
      return [{ field: defaultSort.key, sort: defaultSort.direction }];
    }
    return undefined;
  }, [defaultSort]);

  const handleSortModelChange = (model) => {
    if (onSortModelChangeProp) {
      if (model.length > 0) {
        onSortModelChangeProp({ key: model[0].field, direction: model[0].sort });
      } else {
        onSortModelChangeProp({ key: null, direction: null }); // Or however you want to signal no sort
      }
    }
  };

  const handlePageChange = (newPage) => {
    if (onPageChangeProp) {
      onPageChangeProp(null, newPage); // Old signature was (event, newPage)
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    if (onPageSizeChangeProp) {
      onPageSizeChangeProp({ target: { value: newPageSize } }); // Old signature was (event)
    }
  };


  if (!Array.isArray(inputData)) {
    return <Alert severity="error">Lỗi: Dữ liệu không hợp lệ</Alert>;
  }
  if (!Array.isArray(inputColumns)) {
    return <Alert severity="error">Lỗi: Cấu hình cột không hợp lệ</Alert>;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: minHeight || 200, width: '100%' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

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
        minHeight: minHeight,
        display: 'flex', // Added for flex layout
        flexDirection: 'column', // Added for flex layout
      }}
    >
      <DataGrid
        rows={transformedRows}
        columns={transformedColumns}
        loading={loading}
        error={error} // DataGrid handles error overlay internally for some cases like connectivity
        autoHeight={minHeight ? false : true} // Use autoHeight if no minHeight, otherwise let minHeight on Paper control
        pagination={pagination}
        page={pageProp}
        pageSize={pageSizeProp}
        rowCount={rowCountProp > 0 ? rowCountProp : transformedRows.length} // Use totalCount if provided, else length of current data
        paginationMode={rowCountProp > 0 && onPageChangeProp ? "server" : "client"}
        sortingMode={onSortModelChangeProp ? "server" : "client"}
        onPageChange={onPageChangeProp ? handlePageChange : undefined}
        onPageSizeChange={onPageSizeChangeProp ? handlePageSizeChange : undefined}
        onSortModelChange={onSortModelChangeProp ? handleSortModelChange : undefined}
        sortModel={sortModel}
        rowsPerPageOptions={customRowsPerPageOptions}
        onRowClick={onRowClickProp ? (params) => onRowClickProp(params.row) : undefined}
        disableSelectionOnClick // Common preference
        localeText={{
            ...localeText,
            noRowsLabel: emptyMessage,
            noResultsOverlayLabel: emptyMessage,
            toolbarExport: 'Xuất',
            toolbarExportCSV: 'Xuất CSV',
            toolbarColumns: 'Cột',
            toolbarFilters: 'Lọc',
            toolbarDensity: 'Độ dày',
            toolbarDensityCompact: 'Nhỏ gọn',
            toolbarDensityStandard: 'Tiêu chuẩn',
            toolbarDensityComfortable: 'Rộng rãi',
            MuiTablePagination: {
                labelRowsPerPage: "Hàng mỗi trang:",
                labelDisplayedRows: ({ from, to, count }) => `${from}–${to} trên ${count !== -1 ? count : `hơn ${to}`}`,
            }
        }}
        components={{
          Toolbar: headerAction ? CustomToolbar : null,
          // NoRowsOverlay: () => <Box sx={{p:2, textAlign: 'center'}}>{emptyMessage}</Box> // Alternative for empty message
        }}
        componentsProps={{
          toolbar: { headerAction },
        }}
        sx={{
          border: 'none', // Remove DataGrid's own border if Paper is handling it
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: theme.palette.grey[50],
            color: theme.palette.text.secondary,
            fontWeight: 600,
            fontSize: '0.75rem',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            borderBottom: '1px solid', // Thinner border for header bottom
            borderColor: 'divider',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
          },
          '& .MuiDataGrid-cell': {
            py: 1, // Match old padding
            px: 2,
            borderColor: theme.palette.grey[200],
            fontSize: theme.typography.body2.fontSize,
            // For hover effects similar to old table (might need more specific selectors or :hover on row)
          },
          '& .MuiDataGrid-row': {
            transition: 'all 0.1s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.04), // Lighter hover
              cursor: onRowClickProp ? 'pointer' : 'default',
            },
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: `1px solid ${theme.palette.grey[200]}`,
          },
           // Custom styling for specific column types if needed
          '& .custom-cell-style': {
            // Define your styles here, e.g.
            // color: col.getColor ? col.getColor(params.value, params.row) : 'inherit',
          },
          '& .custom-header-style': {
            // Define your styles here
          },
          // Spread other sx from props
          ...(otherTableProps.sx || {}),
        }}
        checkboxSelection={otherTableProps.checkboxSelection || false} // Example of forwarding other props
        {...otherTableProps} // Spread other valid DataGrid props
      />
    </Paper>
  );
};

StandardTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string, // or id
      id: PropTypes.string,
      label: PropTypes.string, // or header
      header: PropTypes.string,
      width: PropTypes.number,
      align: PropTypes.oneOf(['left', 'right', 'center']),
      sortable: PropTypes.bool,
      render: PropTypes.func, // (cellValue, row, index)
      Cell: PropTypes.elementType, // Custom component
      numeric: PropTypes.bool, // For alignment and potential type hints
      // For custom styling, not directly supported by DataGrid column def but can be handled via renderCell or sx
      getColor: PropTypes.func,
      fontWeight: PropTypes.string,
      maxWidth: PropTypes.number,
      noWrap: PropTypes.bool,
      sx: PropTypes.object, // For passing sx to custom renderers or for reference
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  renderActions: PropTypes.oneOfType([PropTypes.func, PropTypes.node]), // Function or ReactNode for actions column
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
  sortable: PropTypes.bool, // Global sort enable/disable
  defaultSort: PropTypes.shape({
    key: PropTypes.string, // maps to field
    direction: PropTypes.oneOf(['asc', 'desc']), // maps to sort
  }),
  onSortChange: PropTypes.func, // maps to onSortModelChange: ({ key, direction })
  customRowsPerPageOptions: PropTypes.array,
  showSTT: PropTypes.bool,
};

export default StandardTable;
