import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Fab,
  Zoom,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PartnerListResponsive from '@features/doi-tac/components/PartnerListResponsive';

const DesktopView = ({ 
  partners, 
  loading, 
  error, 
  onEdit, 
  onDelete, 
  onAddPartner 
}) => {
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
      <Zoom in={!loading}>
        <Fab
          color="primary"
          aria-label="Thêm đối tác"
          onClick={onAddPartner}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, sm: 32 },
            right: { xs: 24, sm: 32 },
            zIndex: 1201,
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 12px 40px rgba(25, 118, 210, 0.35)',
            },
            transition: 'all 0.2s ease-in-out',
            // Ensure visibility on all screen sizes
            width: { xs: 56, sm: 56 },
            height: { xs: 56, sm: 56 },
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default DesktopView;
