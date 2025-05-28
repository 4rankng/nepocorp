import React from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, TextField, InputAdornment, Fab, Typography, useTheme } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info'; // Added for Guidance Message
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
  onItemClick, // Added prop
}) => {
  const theme = useTheme(); // Initialize theme
  // Filter plans by search term for desktop
  const filteredPlans = shipmentPlans.filter(plan => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      plan.dienGiai?.toLowerCase().includes(searchLower) ||
      plan.khachHang?.toLowerCase().includes(searchLower) ||
      plan.bienSoXe?.toLowerCase().includes(searchLower) ||
      plan.doiTac?.toLowerCase().includes(searchLower) ||
      plan.tenDoiTac?.toLowerCase().includes(searchLower)
    );
  });
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
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.3, p: 0.5, backgroundColor: theme.palette.action.hover, borderRadius: 1 }}>
      <InfoIcon sx={{ mr: 1, color: theme.palette.info.main }} />
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
      Bấm vào hàng trong bảng để xem chi tiết
      </Typography>
    </Box>
      <Paper elevation={0} sx={{ p: 0 }}>
        <StandardTable
          columns={columns}
          data={filteredPlans}
          onRowClick={onItemClick} // Pass onItemClick to StandardTable
          loading={isLoading}
          emptyMessage="Chưa có lịch vận chuyển nào"
          // Remove headerAction - now using FAB
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
  columns: PropTypes.array.isRequired,
  shipmentPlans: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  canAddPlan: PropTypes.bool.isRequired,
  onItemClick: PropTypes.func, // Added prop type (can be .isRequired if always passed)
};

export default DesktopView;
