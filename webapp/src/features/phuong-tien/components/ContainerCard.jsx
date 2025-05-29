import React from 'react';
import { Card, CardContent, Box, Typography, Chip } from '@mui/material';
import { EditButton, DeleteButton } from '@/components/ActionButtons';
import InventoryIcon from '@mui/icons-material/Inventory2';

const ContainerCard = ({ data, onEdit, onDelete, isLoading }) => (
  <Card
    sx={{
      mb: 1,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      '&:hover': {
        borderColor: 'success.main',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      transition: 'all 0.2s ease-in-out',
    }}
  >
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <InventoryIcon color="success" sx={{ fontSize: 20 }} />
          <Typography fontWeight={600} color="success.main">
            {data.phan_loai || 'Chưa có phân loại'}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <EditButton size="small" onClick={() => onEdit(data)} disabled={isLoading} />
          <DeleteButton size="small" onClick={() => onDelete(data)} disabled={isLoading} />
        </Box>
      </Box>
      {data.id && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          ID: {data.id}
        </Typography>
      )}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip
          label="Container"
          size="small"
          color="success"
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Box>
    </CardContent>
  </Card>
);

export default ContainerCard;
