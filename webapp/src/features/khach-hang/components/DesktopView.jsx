import React from 'react';
import { Box, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CustomerListResponsive from '@features/khach-hang/components/CustomerListResponsive';
import FAB from '@/components/FAB';
const DesktopView = ({ customers, loading, error, onEdit, onDelete, onAdd }) => {
  return (
    <Box sx={{ p: 0, pb: { xs: 10, sm: 11 } }}>
      <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
        <CustomerListResponsive
          customers={customers}
          loading={loading}
          onEdit={onEdit}
          onDelete={onDelete}
          error={error}
          emptyMessage="Chưa có khách hàng nào"
        />
      </Paper>
      {/* Floating Action Button */}
      <FAB
        onClick={onAdd}
        icon={<AddIcon />}
        ariaLabel="Thêm khách hàng"
        loading={loading}
      />
    </Box>
  );
};
export default DesktopView;
