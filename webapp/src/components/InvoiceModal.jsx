import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { expenseApi } from '@services/api/expenseApi';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'DRAFT':
      return 'default';
    default:
      return 'default';
  }
};

const getPaymentStatusText = (status) => {
  switch (status) {
    case 'PAID':
      return 'Đã thanh toán';
    case 'PENDING':
      return 'Chờ thanh toán';
    case 'DRAFT':
      return 'Nháp';
    default:
      return status;
  }
};

const InvoiceModal = ({ open, onClose, expenseId }) => {
  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && expenseId) {
      fetchExpenseData();
    }
  }, [open, expenseId]);

  const fetchExpenseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseApi.getById(expenseId);
      setExpenseData(response.data || response);
    } catch (err) {
      setError('Không thể tải thông tin hóa đơn');
      console.error('Error fetching expense data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setExpenseData(null);
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <ReceiptIcon />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Chi tiết hóa đơn
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ color: 'inherit' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {expenseData && !loading && (
          <Box>
            {/* Header Information */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Biển số xe
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {expenseData.license_plate || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Nhà cung cấp
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {expenseData.vendor_name || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Trạng thái thanh toán
                </Typography>
                <Chip
                  label={getPaymentStatusText(expenseData.payment_status)}
                  color={getPaymentStatusColor(expenseData.payment_status)}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Ngày tạo
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(expenseData.created_at)}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Items Table */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Chi tiết các hạng mục
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Hạng mục</TableCell>
                    <TableCell align="center">Số lượng</TableCell>
                    <TableCell align="right">Đơn giá</TableCell>
                    <TableCell align="center">Ngày lắp đặt</TableCell>
                    <TableCell align="center">Ngày hết hạn</TableCell>
                    <TableCell align="right">Thành tiền</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenseData.items && expenseData.items.length > 0 ? (
                    expenseData.items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{item.item_name || 'N/A'}</TableCell>
                        <TableCell align="center">{item.quantity || 0}</TableCell>
                        <TableCell align="right">{formatCurrency(item.price || 0)}</TableCell>
                        <TableCell align="center">{formatDate(item.install_date)}</TableCell>
                        <TableCell align="center">{formatDate(item.expiry_date)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency((item.price || 0) * (item.quantity || 0))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          Không có dữ liệu hạng mục
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ minWidth: 250 }}>
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2">Tổng cộng:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(expenseData.total || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2">Thuế ({expenseData.tax_rate || 0}%):</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency((expenseData.total || 0) * (expenseData.tax_rate || 0) / 100)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Tổng thanh toán:</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(
                      (expenseData.total || 0) * (1 + (expenseData.tax_rate || 0) / 100)
                    )}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Remarks */}
            {expenseData.remark && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Ghi chú
                </Typography>
                <Typography variant="body2" sx={{ 
                  p: 2, 
                  backgroundColor: 'grey.50', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  {expenseData.remark}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceModal;