import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

// Import simplified components
import { StatsGrid, StatementTable, TransactionModal, TransactionViewModal } from './components';
import ConfirmDialog from '@components/ConfirmDialog';

// Import hooks
import {
  useFinancialLedger,
  useTransactionModal,
  useCustomersPartners,
  useTransactionActions,
} from './hooks';

const QuanLyBangCongNo = () => {
  const { currentUser } = useAuth();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, transaction: null });
  const [batchDeleteDialog, setBatchDeleteDialog] = useState({ open: false, transactions: [] });

  // Main financial ledger hook
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
    refresh,
  } = useFinancialLedger();

  // Customer and partner data
  const { customers, partners, loading: customersPartnersLoading } = useCustomersPartners();

  // Modal management
  const {
    modalOpen,
    modalMode,
    modalTransaction,
    viewModalOpen,
    viewModalTransaction,
    openCreateModal,
    openEditModal,
    closeModal,
    closeViewModal,
    handleView,
    handleEditFromView,
  } = useTransactionModal();

  // Transaction actions
  const {
    handleCreate,
    handleUpdate,
    handleDelete,
    confirmDelete,
    handleBatchDelete,
    confirmBatchDelete,
    loading: actionLoading,
    error: actionError,
  } = useTransactionActions({
    onCreateTransaction: createTransaction,
    onUpdateTransaction: updateTransaction,
    onDeleteTransaction: deleteTransaction,
    onRefresh: refresh,
  });

  // Snackbar management
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // Handle transaction save (create or update)
  const handleTransactionSave = useCallback(
    async transactionData => {
      try {
        let result;

        if (modalMode === 'create') {
          result = await handleCreate(transactionData);
        } else {
          result = await handleUpdate(modalTransaction.id, transactionData);
        }

        if (result.success) {
          showSnackbar(result.message, 'success');
          closeModal();
        } else {
          showSnackbar(result.error, 'error');
        }
      } catch (error) {
        showSnackbar('Có lỗi xảy ra khi lưu giao dịch', 'error');
      }
    },
    [modalMode, modalTransaction, handleCreate, handleUpdate, showSnackbar, closeModal]
  );

  // Handle transaction delete - opens confirmation dialog
  const handleTransactionDelete = useCallback(
    transaction => {
      const result = handleDelete(transaction);
      if (result.needsConfirmation) {
        setDeleteDialog({ open: true, transaction: result.transaction });
      }
    },
    [handleDelete]
  );

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.transaction) return;

    const result = await confirmDelete(deleteDialog.transaction.id);
    
    if (result.success) {
      showSnackbar(result.message, 'success');
      setDeleteDialog({ open: false, transaction: null });
      closeViewModal();
    } else {
      showSnackbar(result.error, 'error');
    }
  }, [deleteDialog.transaction, confirmDelete, showSnackbar, closeViewModal]);

  // Handle batch delete - opens confirmation dialog
  const handleTransactionBatchDelete = useCallback(
    transactions => {
      const result = handleBatchDelete(transactions);
      if (result.needsConfirmation) {
        setBatchDeleteDialog({ open: true, transactions: result.transactions });
      }
    },
    [handleBatchDelete]
  );

  // Handle batch delete confirmation
  const handleBatchDeleteConfirm = useCallback(async () => {
    if (!batchDeleteDialog.transactions || batchDeleteDialog.transactions.length === 0) return;

    const result = await confirmBatchDelete(batchDeleteDialog.transactions);
    
    if (result.success) {
      showSnackbar(result.message, 'success');
      setBatchDeleteDialog({ open: false, transactions: [] });
    } else {
      showSnackbar(result.error, 'error');
    }
  }, [batchDeleteDialog.transactions, confirmBatchDelete, showSnackbar]);

  // Handle edit transaction
  const handleEditTransaction = useCallback(
    transaction => {
      openEditModal(transaction);
    },
    [openEditModal]
  );

  // Handle search
  const handleSearchChange = useCallback(event => {
    setSearchTerm(event.target.value);
  }, []);

  // Handle status filter change
  const handleStatusFilterChange = useCallback(event => {
    setStatusFilter(event.target.value);
  }, []);

  // Loading state
  if (!currentUser) {
    return (
      <Box
        sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title */}
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a202c', mb: 3 }}>
        BẢNG TỔNG HỢP CÔNG NỢ PHẢI THU
      </Typography>

      {/* Statistics Overview */}
      <StatsGrid transactions={transactions} loading={loading} variant="html-demo" sx={{ mb: 3 }} />

      {/* Main Card */}
      <Paper
        sx={{ borderRadius: 2, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}
      >
        {/* Header with Search and Add Button */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <TextField
              placeholder="Tìm kiếm khách hàng..."
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ width: 320 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#a0aec0' }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Status Filter */}
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Trạng thái</InputLabel>
              <Select value={statusFilter} onChange={handleStatusFilterChange} label="Trạng thái">
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="debt">Có nợ</MenuItem>
                <MenuItem value="paid">Đã thanh toán</MenuItem>
                <MenuItem value="overdue">Quá hạn</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Add Transaction Button */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateModal}
            sx={{
              bgcolor: '#3182ce',
              '&:hover': {
                bgcolor: '#2c5282',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            Thêm Giao Dịch Mới
          </Button>
        </Box>

        {/* Transaction Table */}
        <StatementTable
          transactions={transactions}
          loading={loading}
          error={error}
          pagination={pagination}
          onView={handleView}
          onEdit={handleEditTransaction}
          onDelete={handleTransactionDelete}
          showActions={true}
          variant="html-demo"
        />
      </Paper>

      {/* Transaction Form Modal */}
      <TransactionModal
        open={modalOpen}
        onClose={closeModal}
        onSave={handleTransactionSave}
        transaction={modalTransaction}
        mode={modalMode}
        customers={customers}
        partners={partners}
        loading={actionLoading}
      />

      {/* Transaction View Modal */}
      <TransactionViewModal
        open={viewModalOpen}
        onClose={closeViewModal}
        onEdit={handleEditFromView}
        onDelete={handleTransactionDelete}
        transaction={viewModalTransaction}
        showActions={true}
      />

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

      {/* Error handling */}
      {actionError && (
        <Snackbar
          open={!!actionError}
          autoHideDuration={6000}
          onClose={() => {}}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert severity="error" sx={{ width: '100%' }}>
            {actionError}
          </Alert>
        </Snackbar>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onCancel={() => setDeleteDialog({ open: false, transaction: null })}
        onConfirm={handleDeleteConfirm}
        isLoading={actionLoading}
        type="delete"
        title="Xóa giao dịch"
        message="Bạn có chắc chắn muốn xóa giao dịch này?"
        details={
          deleteDialog.transaction
            ? {
                'Loại': deleteDialog.transaction.transaction_type,
                'Ngày': new Date(deleteDialog.transaction.transaction_date).toLocaleDateString('vi-VN'),
                'Số tiền': `${deleteDialog.transaction.debit > 0 ? deleteDialog.transaction.debit : deleteDialog.transaction.credit} VND`
              }
            : null
        }
      />

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmDialog
        open={batchDeleteDialog.open}
        onCancel={() => setBatchDeleteDialog({ open: false, transactions: [] })}
        onConfirm={handleBatchDeleteConfirm}
        isLoading={actionLoading}
        type="delete"
        title="Xóa nhiều giao dịch"
        message={`Bạn có chắc chắn muốn xóa ${batchDeleteDialog.transactions.length} giao dịch đã chọn?`}
        details={null}
      />
    </Box>
  );
};

export default QuanLyBangCongNo;
