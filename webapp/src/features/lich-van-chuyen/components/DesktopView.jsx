import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Fab,
  Typography,
  useTheme,
  TableSortLabel,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import StandardTable from '@/components/StandardTable';

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
  const createSortHandler = property => event => {
    onRequestSort(event, property);
  };
  const theme = useTheme(); // Initialize theme
  // We'll use shipmentPlans directly as they're already filtered in QuanLyLichVanChuyen
  return (
    <Box>
      {/* Search bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo biển số xe, đối tác, khách hàng..."
          value={searchTerm}
          onChange={onSearchTermChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {/* Guidance Message */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 0.3,
          p: 0.5,
          backgroundColor: theme.palette.action.hover,
          borderRadius: 1,
        }}
      >
        <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          Bấm vào hàng trong bảng để xem chi tiết
        </Typography>
      </Box>
      <Paper elevation={0} sx={{ p: 0 }}>
        {console.log('Rendering StandardTable with columns:', columns)}
        <StandardTable
          columns={columns.map(column => ({
            ...column,
            header: column.header,
            sortable: column.sortable,
            onSort: column.sortable ? createSortHandler(column.id) : undefined
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
  onItemClick: PropTypes.func,
  order: PropTypes.oneOf(['asc', 'desc']),
  orderBy: PropTypes.string,
  onRequestSort: PropTypes.func,
  renderActions: PropTypes.func,
};

DesktopView.defaultProps = {
  order: 'asc',
  orderBy: '',
  onRequestSort: () => {},
};

export default DesktopView;
