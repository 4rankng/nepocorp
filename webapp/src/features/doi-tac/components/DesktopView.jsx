import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PartnerListResponsive from '@features/doi-tac/components/PartnerListResponsive';
import FAB from '@/components/FAB';
const DesktopView = ({ partners, loading, error, onEdit, onDelete, onAdd }) => {
  return (
    <Box sx={{ p: 0, pb: { xs: 10, sm: 11 } }}>
      <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
        <PartnerListResponsive
          partners={partners}
          loading={loading}
          onEdit={onEdit}
          onDelete={onDelete}
          error={error}
          emptyMessage="Chưa có đối tác nào"
        />
      </Paper>
      {/* Floating Action Button */}
      <FAB onClick={onAdd} icon={<AddIcon />} ariaLabel="Thêm đối tác" loading={loading} />
    </Box>
  );
};
export default DesktopView;
