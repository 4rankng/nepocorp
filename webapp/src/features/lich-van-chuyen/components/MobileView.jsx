import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper, LinearProgress, Fab } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AddIcon from '@mui/icons-material/Add';
import MobileShipmentCard from './MobileShipmentCard';
import MobileSearchHeader from './MobileSearchHeader';

const MobileView = ({
  searchTerm,
  onSearchTermChange,
  filterStatus,
  onFilterStatusChange,
  filteredPlans,
  isLoading,
  expandedCard,
  onCardExpand,
  onEdit,
  onDelete,
  onAdd,
  canAddPlan,
}) => {
  return (
    <Box>
      {/* Mobile Search Header */}
      <MobileSearchHeader
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        filterStatus={filterStatus}
        onFilterStatusChange={onFilterStatusChange}
        resultCount={filteredPlans.length}
      />

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress sx={{ borderRadius: 1 }} />
        </Box>
      )}

      {/* Mobile Cards List */}
      <Box sx={{ mb: 2 }}>
        {filteredPlans.length === 0 ? (
          <Paper sx={{ textAlign: 'center', py: 6, border: '1px dashed', borderColor: 'divider' }}>
            <LocalShippingIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {searchTerm || filterStatus
                ? 'Không tìm thấy kết quả'
                : 'Chưa có lịch vận chuyển nào'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm || filterStatus
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'
                : 'Nhấn nút "Thêm" để tạo lịch vận chuyển mới'}
            </Typography>
          </Paper>
        ) : (
          <Box>
            {filteredPlans.map(plan => (
              <MobileShipmentCard
                key={plan.id}
                plan={plan}
                isExpanded={expandedCard === plan.id}
                onCardExpand={onCardExpand}
                onEdit={onEdit}
                onDelete={onDelete}
                canEditDelete={canAddPlan}
              />
            ))}
          </Box>
        )}
      </Box>

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

MobileView.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchTermChange: PropTypes.func.isRequired,
  filterStatus: PropTypes.string.isRequired,
  onFilterStatusChange: PropTypes.func.isRequired,
  filteredPlans: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  expandedCard: PropTypes.string,
  onCardExpand: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  canAddPlan: PropTypes.bool.isRequired,
};

export default MobileView;
