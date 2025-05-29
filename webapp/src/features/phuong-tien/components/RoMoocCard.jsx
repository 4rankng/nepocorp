import React from 'react';
import { Card, CardContent, Box, Typography, Chip } from '@mui/material';
import { EditButton, DeleteButton } from '@/components/ActionButtons';
import TrailerIcon from '@mui/icons-material/RvHookup';

const RoMoocCard = ({ data, onEdit, onDelete, isLoading }) => (
  <Card
    sx={{
      mb: 1,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      '&:hover': {
        borderColor: 'secondary.main',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      transition: 'all 0.2s ease-in-out',
    }}
  >
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <TrailerIcon color="secondary" sx={{ fontSize: 20 }} />
          <Typography fontWeight={600} color="secondary.main">
            {data.bien_so || 'Chưa có biển số'}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <EditButton size="small" onClick={() => onEdit(data)} disabled={isLoading} />
          <DeleteButton size="small" onClick={() => onDelete(data)} disabled={isLoading} />
        </Box>
      </Box>
      {data.mo_ta && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {data.mo_ta}
        </Typography>
      )}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip
          label="Rơ-Mooc"
          size="small"
          color="secondary"
          variant="outlined"
          sx={{ fontSize: '0.7rem' }}
        />
      </Box>
    </CardContent>
  </Card>
);

export default RoMoocCard;
