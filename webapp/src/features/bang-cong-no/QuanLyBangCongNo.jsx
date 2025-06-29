import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Snackbar, 
  Alert,
  Fab,
  Zoom
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { BalanceSummary, StatementFilters, StatementTable } from './components';
import { useFinancialLedger } from './hooks/useFinancialLedger';

// Mock data for customers and partners - in real app, these would come from API
const mockCustomers = [
  { id: 1, name: 'Công ty ABC' },
  { id: 2, name: 'Công ty XYZ' },
  { id: 3, name: 'Công ty DEF' }
];

const mockPartners = [
  { id: 1, name: 'Đối tác Alpha' },
  { id: 2, name: 'Đối tác Beta' },
  { id: 3, name: 'Đối tác Gamma' }
];

const QuanLyBangCongNo = () => {
  const { currentUser } = useAuth();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Financial ledger hook
  const {
    transactions,
    loading,
    error,
    pagination,
    filters,
    balanceSummary,
    updateFilters,
    clearFilters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refresh
  } = useFinancialLedger();

  // Snackbar handlers
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    updateFilters(newFilters);
  }, [updateFilters]);

  // Handle clear all filters
  const handleClearFilters = useCallback(() => {
    clearFilters();
    showSnackbar('Đã xóa tất cả bộ lọc', 'info');
  }, [clearFilters, showSnackbar]);

  // Handle view transaction
  const handleViewTransaction = useCallback((transaction) => {
    console.log('View transaction:', transaction);
    // TODO: Implement view transaction modal
    showSnackbar('Chức năng xem chi tiết đang được phát triển', 'info');
  }, [showSnackbar]);

  // Handle edit transaction
  const handleEditTransaction = useCallback((transaction) => {
    console.log('Edit transaction:', transaction);
    // TODO: Implement edit transaction modal
    showSnackbar('Chức năng chỉnh sửa đang được phát triển', 'info');
  }, [showSnackbar]);

  // Handle delete transaction
  const handleDeleteTransaction = useCallback(async (transaction) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa giao dịch này?\n\nLoại: ${transaction.transaction_type}\nNgày: ${new Date(transaction.transaction_date).toLocaleDateString('vi-VN')}\nSố tiền: ${transaction.debit > 0 ? transaction.debit : transaction.credit} VND`)) {
      try {
        const result = await deleteTransaction(transaction.id);
        if (result.success) {
          showSnackbar('Xóa giao dịch thành công', 'success');
        } else {
          showSnackbar(result.error || 'Không thể xóa giao dịch', 'error');
        }
      } catch (err) {
        showSnackbar('Có lỗi xảy ra khi xóa giao dịch', 'error');
      }
    }
  }, [deleteTransaction, showSnackbar]);

  // Handle add new transaction
  const handleAddTransaction = useCallback(() => {
    console.log('Add new transaction');
    // TODO: Implement add transaction modal
    showSnackbar('Chức năng thêm giao dịch đang được phát triển', 'info');
  }, [showSnackbar]);

  // Handle error from hook
  useEffect(() => {
    if (error) {
      showSnackbar(error, 'error');
    }
  }, [error, showSnackbar]);

  if (!currentUser) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
          Bảng công nợ
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Quản lý và theo dõi các giao dịch tài chính với khách hàng và đối tác
        </Typography>
      </Box>

      {/* Balance Summary */}
      <BalanceSummary balanceSummary={balanceSummary} loading={loading} />

      {/* Filters */}
      <StatementFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        customers={mockCustomers}
        partners={mockPartners}
        loading={loading}
      />

      {/* Transaction Table */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden' }}>
        <StatementTable
          transactions={transactions}
          loading={loading}
          error={error}
          pagination={pagination}
          onView={handleViewTransaction}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          showActions={true}
        />
      </Box>

      {/* Floating Action Button */}
      <Zoom in={!loading}>
        <Fab
          color="primary"
          aria-label="Thêm giao dịch"
          onClick={handleAddTransaction}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6,
            },
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QuanLyBangCongNo;