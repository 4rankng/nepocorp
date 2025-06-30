import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import { formatDate, formatDateTime, formatTransactionType } from '@/features/bang-cong-no/utils';
import { TRANSACTION_TYPE_COLORS, TRANSACTION_TYPE_LABELS } from '@/features/bang-cong-no/types';

const TransactionViewModal = ({
  open = false,
  onClose,
  onEdit,
  onDelete,
  transaction = null,
  showActions = true,
}) => {
  if (!transaction) {
    return null;
  }

  const handleEdit = () => {
    onEdit && onEdit(transaction);
    onClose();
  };

  const handleDelete = () => {
    onDelete && onDelete(transaction);
    onClose();
  };

  const getEntityDisplay = () => {
    if (transaction.customer) {
      return {
        type: 'Khách hàng',
        name: transaction.customer.name,
        icon: PersonIcon,
        color: '#1976d2',
      };
    }

    if (transaction.partner) {
      return {
        type: 'Đối tác',
        name: transaction.partner.name,
        icon: BusinessIcon,
        color: '#9c27b0',
      };
    }

    return null;
  };

  const getAmountDisplay = () => {
    const debit = parseFloat(transaction.debit) || 0;
    const credit = parseFloat(transaction.credit) || 0;

    if (debit > 0) {
      return {
        type: 'Nợ (Debit)',
        amount: debit,
        color: '#d32f2f',
      };
    }

    if (credit > 0) {
      return {
        type: 'Có (Credit)',
        amount: credit,
        color: '#2e7d32',
      };
    }

    return null;
  };

  const entity = getEntityDisplay();
  const amount = getAmountDisplay();
  const typeColor = TRANSACTION_TYPE_COLORS[transaction.transaction_type] || '#616161';
  const typeLabel =
    TRANSACTION_TYPE_LABELS[transaction.transaction_type] || transaction.transaction_type;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Chi tiết giao dịch
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>
          {/* Transaction Type */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                Loại giao dịch:
              </Typography>
              <Chip
                label={typeLabel}
                sx={{
                  bgcolor: `${typeColor}15`,
                  color: typeColor,
                  border: `1px solid ${typeColor}30`,
                  fontWeight: 500,
                }}
              />
            </Box>
          </Paper>

          {/* Entity Information */}
          {entity && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: `${entity.color}15`,
                  display: 'flex',
                }}
              >
                <entity.icon sx={{ color: entity.color, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {entity.type}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {entity.name}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Date Information */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: '#ff980015',
                display: 'flex',
              }}
            >
              <CalendarIcon sx={{ color: '#ff9800', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Ngày giao dịch
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formatDate(transaction.transaction_date)}
              </Typography>
            </Box>
          </Box>

          {/* Amount Information */}
          {amount && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: `${amount.color}15`,
                  display: 'flex',
                }}
              >
                <ReceiptIcon sx={{ color: amount.color, fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {amount.type}
                </Typography>
                <CurrencyDisplay amount={amount.amount} variant="h6" color={amount.color} />
              </Box>
            </Box>
          )}

          {/* Reference Number */}
          {transaction.reference_number && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Số tham chiếu / Diễn giải
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  fontFamily: "'SF Mono', Monaco, monospace",
                }}
              >
                {transaction.reference_number}
              </Typography>
            </Box>
          )}

          {/* Notes */}
          {transaction.notes && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <NotesIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Typography variant="body2" color="text.secondary">
                  Ghi chú
                </Typography>
              </Box>
              <Typography
                variant="body1"
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  lineHeight: 1.6,
                }}
              >
                {transaction.notes}
              </Typography>
            </Box>
          )}

          {/* Timestamps */}
          <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Ngày tạo
                </Typography>
                <Typography variant="body2">{formatDateTime(transaction.created_at)}</Typography>
              </Grid>
              {transaction.updated_at && transaction.updated_at !== transaction.created_at && (
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Cập nhật lần cuối
                  </Typography>
                  <Typography variant="body2">{formatDateTime(transaction.updated_at)}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Đóng
        </Button>

        {showActions && (
          <>
            <Button
              onClick={handleEdit}
              variant="outlined"
              startIcon={<EditIcon />}
              color="primary"
            >
              Chỉnh sửa
            </Button>

            <Button
              onClick={handleDelete}
              variant="outlined"
              startIcon={<DeleteIcon />}
              color="error"
            >
              Xóa
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransactionViewModal;
