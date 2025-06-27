import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { PAYMENT_STATUS_LABELS } from '@constants/payment';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const ExpenseDetailDialog = ({ open, onClose, expense, categories = [] }) => {
  if (!expense) return null;

  const category = categories.find(cat => cat.id === expense.expense_category_id);
  const categoryName = category ? category.name : '-';
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'PENDING': return 'warning';
      case 'PAID': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Typography variant="h6" component="h2">
          Chi tiết phiếu chi
        </Typography>
        <Button
          onClick={onClose}
          sx={{
            minWidth: 'auto',
            p: 1,
            color: 'text.secondary',
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Thông tin chung
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Ngày tạo
              </Typography>
              <Typography variant="body1">
                {formatDate(expense.created_at)}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                Trạng thái
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  label={PAYMENT_STATUS_LABELS[expense.payment_status] || expense.payment_status}
                  color={getStatusColor(expense.payment_status)}
                  size="small"
                />
              </Box>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                Hạng mục
              </Typography>
              <Typography variant="body1">
                {categoryName}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                {categoryName === 'Lương' ? 'Người nhận lương' : 'Nhà cung cấp'}
              </Typography>
              <Typography variant="body1">
                {categoryName === 'Lương' && expense.recipient_name 
                  ? expense.recipient_name 
                  : expense.vendor_name || '-'}
              </Typography>
            </Box>
            
            {expense.license_plate && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Biển số xe
                </Typography>
                <Typography variant="body1">
                  {expense.license_plate}
                </Typography>
              </Box>
            )}
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                Người tạo
              </Typography>
              <Typography variant="body1">
                {expense.created_by_user?.name || 
                 expense.created_by_user?.email || 
                 expense.created_by || '-'}
              </Typography>
            </Box>
          </Box>
          
          {expense.remark && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Ghi chú
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5 }}>
                {expense.remark}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Expense Items */}
        {expense.expense_items && expense.expense_items.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Chi tiết các mục chi
            </Typography>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Mô tả</TableCell>
                    <TableCell align="right">Số lượng</TableCell>
                    <TableCell align="right">Đơn giá</TableCell>
                    <TableCell align="right">Thành tiền</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expense.expense_items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell align="right">{item.quantity || 1}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.unit_price || 0)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency((item.quantity || 1) * (item.unit_price || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold' }}>
                      Tổng cộng
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(expense.total || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Total Amount if no items */}
        {(!expense.expense_items || expense.expense_items.length === 0) && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Tổng tiền
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, color: 'primary.main' }}>
              {formatCurrency(expense.total || 0)}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseDetailDialog;