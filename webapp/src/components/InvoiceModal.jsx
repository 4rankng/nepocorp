import React, { useState, useEffect } from 'react';
import {
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
  Grid,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { expenseApi } from '@services/api/expenseApi';
import { Modal, FormContainer, FormHeader, FormBody } from './ui';

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

  console.log('InvoiceModal render:', { open, expenseId, hasData: !!expenseData });

  useEffect(() => {
    console.log('InvoiceModal useEffect triggered:', { open, expenseId });
    if (open && expenseId) {
      console.log('Starting to fetch expense data for ID:', expenseId);
      fetchExpenseData();
    }
  }, [open, expenseId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open]);

  const fetchExpenseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseApi.getById(expenseId);
      // Handle API wrapper format: response.data.data
      const expenseData = response.data?.data || response.data || response;
      console.log('Invoice data fetched:', expenseData);
      setExpenseData(expenseData);
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
    <Modal isOpen={open} onClose={handleClose} size="large">
      <FormContainer>
        <FormHeader
          title="Chi tiết hóa đơn"
          icon={<ReceiptIcon />}
          onClose={handleClose}
        />

        <FormBody>
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
            <Box className="space-y-6">
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" className="mb-1">
                      Biển số xe
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {expenseData.items?.[0]?.license_plate || '-'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" className="mb-1">
                      Nhà cung cấp
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {expenseData.vendor_name || '-'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" className="mb-1">
                      Trạng thái thanh toán
                    </Typography>
                    <Chip
                      label={getPaymentStatusText(expenseData.payment_status)}
                      color={getPaymentStatusColor(expenseData.payment_status)}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" className="mb-1">
                      Ngày tạo
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDate(expenseData.created_at)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider />

              <Box>
                <Typography variant="h6" className="mb-4">
                  Chi tiết các hạng mục
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Hạng mục</TableCell>
                        <TableCell align="center">Biển số xe</TableCell>
                        <TableCell align="center">Số lượng</TableCell>
                        <TableCell align="right">Đơn giá</TableCell>
                        <TableCell align="center">Thuế (%)</TableCell>
                        <TableCell align="center">Ngày lắp đặt</TableCell>
                        <TableCell align="center">Ngày hết hạn</TableCell>
                        <TableCell align="right">Thành tiền</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {expenseData.items && expenseData.items.length > 0 ? (
                        expenseData.items.map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>{item.item_name || '-'}</TableCell>
                            <TableCell align="center">{item.license_plate || '-'}</TableCell>
                            <TableCell align="center">{item.quantity || 0}</TableCell>
                            <TableCell align="right">{formatCurrency(item.price || 0)}</TableCell>
                            <TableCell align="center">{item.tax_rate || 0}%</TableCell>
                            <TableCell align="center">{formatDate(item.install_date)}</TableCell>
                            <TableCell align="center">{formatDate(item.expiry_date)}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.total || 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography color="text.secondary">
                              Không có dữ liệu hạng mục
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box className="flex justify-end">
                <Box className="min-w-64">
                  <Divider className="mb-4" />
                  {(() => {
                    // Calculate subtotal and tax from items
                    const items = expenseData.items || [];
                    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const totalWithTax = items.reduce((sum, item) => sum + item.total, 0);
                    const totalTax = totalWithTax - subtotal;

                    return (
                      <>
                        <Box className="flex justify-between mb-2">
                          <Typography variant="body2">Tổng cộng (chưa thuế):</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatCurrency(subtotal)}
                          </Typography>
                        </Box>
                        <Box className="flex justify-between mb-2">
                          <Typography variant="body2">Thuế:</Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatCurrency(totalTax)}
                          </Typography>
                        </Box>
                        <Divider className="my-2" />
                        <Box className="flex justify-between">
                          <Typography variant="h6">Tổng:</Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(expenseData.total || totalWithTax)}
                          </Typography>
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              </Box>

              {expenseData.remark && (
                <Box>
                  <Typography variant="body2" color="text.secondary" className="mb-2">
                    Ghi chú
                  </Typography>
                  <Box className="p-3 bg-gray-50 rounded border border-gray-200">
                    <Typography variant="body2">
                      {expenseData.remark}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </FormBody>

        <Box className="flex justify-end gap-3 p-4 border-t">
          <Button onClick={handleClose} variant="outlined">
            Đóng
          </Button>
        </Box>
      </FormContainer>
    </Modal>
  );
};

export default InvoiceModal;
