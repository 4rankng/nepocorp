import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

const getTitle = (type, data) => {
  if (type === 'container') return data.phan_loai;
  return data.bien_so;
};

const getDescription = (type, data) => {
  if (type === 'container') return '';
  return data.mo_ta || '';
};

const VehicleCard = ({ data, type, onEdit, onDelete, isLoading }) => (
  <Card sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography fontWeight={600}>{getTitle(type, data)}</Typography>
        <Box display="flex" gap={1}>
          <EditButton size="small" onClick={() => onEdit(data)} disabled={isLoading} />
          <DeleteButton size="small" onClick={() => onDelete(data)} disabled={isLoading} />
        </Box>
      </Box>
      {getDescription(type, data) && (
        <Typography variant="body2" color="text.secondary">
          {getDescription(type, data)}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default VehicleCard;
