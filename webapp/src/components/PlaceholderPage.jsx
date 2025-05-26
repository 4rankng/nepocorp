import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction'; // Or any suitable icon

const PlaceholderPage = ({ title }) => {
  return (
    <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
      <ConstructionIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
      <Typography variant="h5" component="h1" color="text.primary">
        {title || 'Tính năng đang phát triển'}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Chức năng này sẽ sớm được cập nhật. Vui lòng quay lại sau!
      </Typography>
    </Paper>
  );
};

export default PlaceholderPage;
