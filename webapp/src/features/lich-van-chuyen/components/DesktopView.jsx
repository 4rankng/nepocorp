import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Fab,
  Typography,
  useTheme,
  TableSortLabel,
} from '@mui/material';
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
          columns={columns.map(column => ({
            ...column,
            header: column.header,
            sortable: column.sortable,
            onSort: column.sortable ? createSortHandler(column.id) : undefined,
          }))}
          sortable={true}
          defaultSort={{ key: orderBy, direction: order }}
          data={shipmentPlans}
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
