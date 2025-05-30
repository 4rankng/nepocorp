import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

const ProfileCard = ({
  item,
  identifier,
  name,
  infoLine1,
  infoLine2,
  infoLine3,
  extraContent,
  onEdit,
  onDelete,
  loading = false,
  sx = {},
}) => {
  return (
    <Card elevation={2} sx={{ borderRadius: 2, width: '100%', ...sx }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {identifier && (
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="medium"
                  sx={{
                    px: 1,
                    py: 0.25,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0.5,
                    fontSize: '0.75rem',
                    backgroundColor: 'background.paper',
                  }}
                >
                  {identifier}
                </Typography>
              </Box>
            )}
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                mb: 1,
                fontSize: '1.1rem',
                wordBreak: 'break-word',
              }}
            >
              {name}
            </Typography>
            {infoLine1 && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.5, wordBreak: 'break-word' }}
              >
                {infoLine1}
              </Typography>
            )}
            {infoLine2 && (
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {infoLine2}
              </Typography>
            )}
            {infoLine3 && (
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {infoLine3}
              </Typography>
            )}
            {extraContent && <Box sx={{ mt: 1 }}>{extraContent}</Box>}
          </Box>
          {(onEdit || onDelete) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
              {onEdit && (
                <EditButton
                  onClick={() => onEdit(item)}
                  disabled={loading}
                  size="small"
                  sx={{ minWidth: 32, height: 32 }}
                />
              )}
              {onDelete && (
                <DeleteButton
                  onClick={() => onDelete(item)}
                  disabled={loading}
                  size="small"
                  sx={{ minWidth: 32, height: 32 }}
                />
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
