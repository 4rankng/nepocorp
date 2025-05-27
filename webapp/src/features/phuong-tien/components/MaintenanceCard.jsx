import React, { useState } from 'react';
import { Card, CardContent, Box, Typography, Chip, Collapse, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const MaintenanceCard = ({ record, onEdit, onDelete, isLoading }) => {
  const [expanded, setExpanded] = useState(false);

  // Calculate expiration date if not present
  const getExpirationDate = (record) => {
    if (record.ngayHetHan) return new Date(record.ngayHetHan);
    if (record.replacementDate && record.warrantyPeriod) {
      const date = new Date(record.replacementDate);
      date.setMonth(date.getMonth() + Number(record.warrantyPeriod));
      return date;
    }
    return null;
  };

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Card
      onClick={handleExpandClick}
      sx={{
        mb: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'none',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 1,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Primary Information - Always Visible */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'primary.main',
                mb: 0.5,
              }}
            >
              {record.licensePlate}
            </Typography>
            <Chip
              label={new Date(record.replacementDate).toLocaleDateString('vi-VN')}
              size="small"
              sx={{
                backgroundColor: 'primary.light',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Arrow as indicator only - not clickable */}
            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
          </Box>
        </Box>

        {/* Secondary Information - Collapsed by default */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: expanded ? 1 : 0,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {record.quantity} x {formatCurrency(record.unitPrice)}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {formatCurrency(record.total)}
          </Typography>
        </Box>

        {/* Expandable Section - Detailed Information */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ pt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Số lượng
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {record.quantity}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Đơn giá
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCurrency(record.unitPrice)}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Thời hạn bảo hành
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {record.warrantyPeriod} tháng
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Thành tiền
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'success.main', fontFamily: 'monospace' }}
                >
                  {formatCurrency(record.total)}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Ngày hết hạn
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {getExpirationDate(record)?.toLocaleDateString('vi-VN') || '-'}
                </Typography>
              </Box>
              {record.note && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Ghi chú
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    {record.note}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Action Buttons - Only visible in expanded mode at bottom */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
              <EditButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  onEdit(record);
                }}
                disabled={isLoading}
              />
              <DeleteButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(record);
                }}
                disabled={isLoading}
              />
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default MaintenanceCard;
