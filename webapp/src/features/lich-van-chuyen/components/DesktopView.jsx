import React from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Fab, Typography, useTheme, TableSortLabel } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import StandardTable from '@/components/StandardTable';
import { SearchBar } from '@/components';
const DesktopView = ({
  searchTerm,
  onSearchTermChange,
  columns,
  shipmentPlans,
  isLoading,
  onAdd,
  canAddPlan,
  onItemClick,
  order = 'asc',
  orderBy = '',
  onRequestSort = () => {},
  renderActions,
}) => {
  const theme = useTheme();
  const createSortHandler = property => event => {
    onRequestSort(event, property);
  };
  return (
    <Box sx={{ pb: { xs: 10, md: 11 } }}>
      {/* Search bar */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchTerm}
          onChange={onSearchTermChange}
          placeholder="Tìm kiếm theo biển số xe, đối tác, khách hàng..."
        />
      </Box>
      <Paper elevation={0} sx={{ p: 0 }}>
        <StandardTable
          columns={columns.map(col => ({
            field: col.id, // id -> field
            headerName: col.header, // header -> headerName
            width: col.width ? parseInt(col.width) : undefined, // Ensure width is numeric if present
            align: col.align,
            headerAlign: col.align, // Added headerAlign
            sortable: col.sortable,
            // renderCell needs to be adapted if col.render exists. Assuming col.render has signature (value, row, index)
            // The new StandardTable expects renderCell as (params) or handles col.render itself.
            // StandardTable's column transformer:
            // if (col.render) { newCol.renderCell = params => col.render(params.value, params.row, params.api.getRowIndex(params.row.id)); }
            // So, just passing col.render should be fine if its signature matches what StandardTable expects.
            // The propTypes for DesktopView's columns show `render: PropTypes.func`. Its signature is not specified here.
            // Let's assume the StandardTable wrapper handles the original render function correctly.
            render: col.render, // Pass original render, StandardTable wrapper will adapt it to renderCell
            // onSort logic is removed here, handled by StandardTable's onSortChange prop + sortable flag
          }))}
          sortable={true} // Enables sorting features in StandardTable
          onSortChange={onRequestSort ? (sortConfig) => onRequestSort(null, sortConfig.key, sortConfig.direction) : undefined} // Adapt from {key, direction} to (event, property, direction) if needed by parent
          defaultSort={{ key: orderBy, direction: order }} // This is correctly mapped to sortModel by StandardTable
          rows={shipmentPlans} // data -> rows
          onRowClick={onItemClick}
          loading={isLoading}
          renderActions={renderActions}
          emptyMessage={
            isLoading
              ? 'Đang tải dữ liệu...'
              : 'Chưa có lịch vận chuyển nào. Vui lòng thêm mới hoặc kiểm tra bộ lọc.'
          }
        />
      </Paper>
      {/* Floating Action Button for Add */}
      {canAddPlan && (
        <Fab
          color="primary"
          aria-label="add"
          onClick={onAdd}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, md: 32 },
            right: { xs: 24, md: 32 },
            zIndex: 1201,
            boxShadow: 6,
            '&:hover': {
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};
DesktopView.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchTermChange: PropTypes.func.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      header: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
      width: PropTypes.string,
      align: PropTypes.string,
      render: PropTypes.func,
      sortable: PropTypes.bool,
    })
  ).isRequired,
  shipmentPlans: PropTypes.array.isRequired,
  isLoading: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
  canAddPlan: PropTypes.bool.isRequired,
  onItemClick: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']),
  orderBy: PropTypes.string,
  onRequestSort: PropTypes.func,
  renderActions: PropTypes.func,
};
export default DesktopView;
