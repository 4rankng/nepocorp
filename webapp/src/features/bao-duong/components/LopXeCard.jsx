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

const LopXeCard = ({ record, onEdit, onDelete, isLoading }) => {
  const [expanded, setExpanded] = useState(false);

  // Calculate expiration date if not present
  const getExpirationDate = record => {
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
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {record.licensePlate}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Thay lốp: {new Date(record.replacementDate).toLocaleDateString('vi-VN')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <EditButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                onEdit(record);
              }}
            />
            <DeleteButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                onDelete(record);
              }}
            />
          </Box>
        </Box>

        {/* Secondary Information - Visible on Expand */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Bảo hành:
              </Typography>
              <Typography variant="body2">{record.warrantyPeriod} tháng</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Hết hạn:
              </Typography>
              <Typography variant="body2">
                {getExpirationDate(record)
                  ? getExpirationDate(record).toLocaleDateString('vi-VN')
                  : 'N/A'}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Số lượng:
              </Typography>
              <Typography variant="body2">{record.quantity}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Đơn giá:
              </Typography>
              <Typography variant="body2">{formatCurrency(record.unitPrice)}</Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Thành tiền:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(record.total)}
              </Typography>
            </Box>
            {record.note && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Ghi chú:
                </Typography>
                <Typography variant="body2">{record.note}</Typography>
              </Box>
            )}
          </Box>
        </Collapse>

        {/* Expand/Collapse Indicator */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mt: 1,
          }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </Box>
      </CardContent>
    </Card>
  );
};

export default LopXeCard;
