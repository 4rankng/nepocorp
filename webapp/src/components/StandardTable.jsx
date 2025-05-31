import { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

const StandardTable = ({
  columns = [],
  data = [],
  renderActions = null,
  loading = false,
  error = null,
  emptyMessage = 'Chưa có dữ liệu',
  pagination: enablePagination = false, // Renamed to avoid conflict with AgGridReact prop
  rowsPerPage: initialRowsPerPage = 10,
  // page: initialPage = 0, // Removed, AG Grid handles current page
  // totalCount: initialTotalCount = 0, // Removed, AG Grid handles for client-side
  // onPageChange: initialOnPageChange = () => {}, // Removed
  // onRowsPerPageChange: initialOnRowsPerPageChange = () => {}, // Removed
  // paginationProps = null, // Removed
  headerAction = null,
  onRowClick = null,
  rowKeyField,
  minHeight,
  sortable = true,
  // defaultSort = null, // Removed, AG Grid handles sort state internally
  // onSortChange = null, // Removed, AG Grid has onSortChanged event
  // customRowsPerPageOptions = [5, 10, 50, 100], // Removed
  showSTT = true
  // ...tableProps // Removed MUI specific tableProps
}) => {
  const gridApiRef = useRef(null);
  const [overlayNoRowsTemplate, setOverlayNoRowsTemplate] = useState(emptyMessage);

  const onGridReady = params => {
    gridApiRef.current = params.api;
  };

  useEffect(() => {
    if (!gridApiRef.current) return;

    if (loading) {
      gridApiRef.current.showLoadingOverlay();
    } else if (error) {
      setOverlayNoRowsTemplate(error);
      gridApiRef.current.showNoRowsOverlay();
    } else if (!rowData || rowData.length === 0) {
      setOverlayNoRowsTemplate(emptyMessage);
      gridApiRef.current.showNoRowsOverlay();
    } else {
      gridApiRef.current.hideOverlay();
    }
  }, [loading, error, rowData, emptyMessage, gridApiRef.current]);


  // Internal sort state - Removed
  // const [sortConfig, setSortConfig] = useState(defaultSort || { key: null, direction: 'asc' });
  // Handle sort request - Removed
  // const handleSort = columnKey => { ... };
  // Sort data if not handled externally - Removed (AG Grid handles this)
  // const sortedData = useMemo(() => { ... });

  const columnDefs = useMemo(() => {
    let mappedColumns = effectiveColumns.map(col => {
      const colDef = {
        field: col.key || col.id,
        headerName: col.label || col.header,
        width: col.width,
        sortable: col.sortable !== false && sortable, // Respect global sortable and individual column sortable
        cellRenderer: col.render ? params => col.render(params.value, params.data, params.rowIndex) : undefined,
        // AG Grid specific: custom cell renderers can be components too via cellRendererFramework
        // For STT, the render prop is already a function.
      };
      if (col.align) {
        colDef.cellClass = `ag-${col.align}-aligned-cell`;
      }
      // TODO: Map other props like numeric, getColor, fontWeight, maxWidth, noWrap if needed
      return colDef;
    });

    if (renderActions) {
      mappedColumns.push({
        headerName: 'Thao tác',
        cellRenderer: params => renderActions(params.data),
        width: 120, // Default width for actions, can be made configurable
        sortable: false,
        filter: false,
        pinned: 'right', // Pin actions column to the right
        resizable: false,
      });
    }
    return mappedColumns;
  }, [effectiveColumns, renderActions, sortable]);

  // Insert STT column as the first column if showSTT is true
  const effectiveColumns = useMemo(() => {
    if (!showSTT) return columns;
    return [
      {
        key: '__stt',
        label: 'STT',
        align: 'left',
        sortable: false, // STT column is usually not sortable by value
        width: 60,
        // The render function for STT needs access to AG Grid's api.valueGetter for row index
        // For now, this simple index might be offset if pagination is client-side with AG Grid.
        // AG Grid provides rowIndex in params. A valueGetter might be better.
        // valueGetter for STT needs to be aware of AG Grid pagination
        valueGetter: params => {
          if (params.node && params.node.rowIndex != null) {
            // For client-side pagination, rowIndex is 0-based for current page.
            // For a global STT: (currentPage * pageSize) + rowIndex + 1
            // This requires gridApi.paginationGetCurrentPage() and gridApi.paginationGetPageSize()
            // A simpler approach for display if full dataset is given to AG Grid:
            // If pagination is active, this is index on page. Otherwise, global index.
            // For now, let's provide index on page, can be enhanced with gridApi later if global STT needed.
            // A common simple way:
            // return params.node.rowIndex + 1;
            // More robust with access to API (e.g. via onGridReady or if cellRendererFramework used)
            // For now, this will be index on page if ag-grid pagination is on.
            // If enablePagination is false, it's global index as data is not paginated by AG Grid.
            if (enablePagination && params.api) {
              return (params.api.paginationGetCurrentPage() * params.api.paginationGetPageSize()) + params.node.rowIndex + 1;
            }
            return params.node.rowIndex + 1; // Fallback or for non-paginated
          }
          return ''; // Should not happen for valid rows
        },
      },
      ...columns,
    ];
  }, [columns, showSTT, enablePagination]); // Removed dependencies on old pagination props

  const rowData = data;

  const getRowId = useMemo(() => {
    if (rowKeyField) {
      return params => params.data[rowKeyField];
    }
    return undefined;
  }, [rowKeyField]);

  // Validate data and columns - AG Grid handles invalid rowData (shows no rows). Column validation is separate.
  // if (!Array.isArray(rowData)) {
  //   return (
  //     <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
  //       Lỗi: Dữ liệu không hợp lệ
  //     </Alert>
  //   );
  // }
  // if (!Array.isArray(columns)) {
  //   return (
  //     <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
  //       Lỗi: Cấu hình cột không hợp lệ
  //     </Alert>
  //   );
  // }
  // Extract and omit non-DOM props to prevent them from being passed to the DOM
  // const { jsx: _jsx, component: _component, ...filteredTableProps } = tableProps || {};

  // Old loading, error, and empty message handling removed
  // if (loading) { ... }
  // if (error) { ... }
  // if (!loading && !error && rowData.length === 0) { ... }

  // Extract and omit non-DOM props to prevent them from being passed to DOM - Removed
  // const {
  //   rowKeyField: _rowKeyField,
  //   minHeight: _minHeight,
  //   jsx: _jsxProp,
  //   component: _componentProp,
  //   sortable: _sortable,
  //   defaultSort: _defaultSort,
  //   onSortChange: _onSortChange,
  //   ...cleanTableProps
  // } = tableProps || {};
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
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
      {/* AG Grid component */}
      <div className="ag-theme-alpine" style={{ height: minHeight || '500px', width: '100%' }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowData={rowData}
          getRowId={getRowId}
          onRowClicked={onRowClick ? params => onRowClick(params.data) : undefined}
          onGridReady={onGridReady}
          // AG Grid Overlays
          overlayLoadingTemplate='<span class="ag-overlay-loading-center">Đang tải...</span>'
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          // AG Grid Pagination
          pagination={enablePagination}
          paginationPageSize={initialRowsPerPage}
          // Default AG Grid options
          domLayout="normal" // or 'autoHeight' or 'print'
          rowSelection="single" // Example, can be 'multiple'
          // TODO: Add more AG Grid features as needed: sorting, filtering
        />
      </div>
      {/* MUI Pagination removed */}
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
  pagination: PropTypes.bool, // Keep this to enable/disable AG Grid pagination
  rowsPerPage: PropTypes.number, // For initial page size
  // page: PropTypes.number, // Removed
  // totalCount: PropTypes.number, // Removed
  // onPageChange: PropTypes.func, // Removed
  // onRowsPerPageChange: PropTypes.func, // Removed
  headerAction: PropTypes.node,
  onRowClick: PropTypes.func,
  rowKeyField: PropTypes.string,
  minHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sortable: PropTypes.bool,
  // defaultSort: PropTypes.shape({ // Removed
  //   key: PropTypes.string.isRequired,
  //   direction: PropTypes.oneOf(['asc', 'desc']).isRequired,
  // }),
  // onSortChange: PropTypes.func, // Removed
  // paginationProps: PropTypes.object, // Removed
  // customRowsPerPageOptions: PropTypes.array, // Removed
  showSTT: PropTypes.bool,
};
export default StandardTable;
