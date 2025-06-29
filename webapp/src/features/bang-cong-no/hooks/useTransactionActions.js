import { useState, useCallback } from 'react';

export const useTransactionActions = ({
  onCreateTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create transaction
  const handleCreate = useCallback(async (transactionData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await onCreateTransaction(transactionData);
      
      if (result.success) {
        // Refresh data after successful creation
        onRefresh && onRefresh();
        return { success: true, message: 'Tạo giao dịch thành công' };
      } else {
        setError(result.error || 'Không thể tạo giao dịch');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error creating transaction:', err);
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi tạo giao dịch';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [onCreateTransaction, onRefresh]);

  // Update transaction
  const handleUpdate = useCallback(async (id, transactionData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await onUpdateTransaction(id, transactionData);
      
      if (result.success) {
        // Refresh data after successful update
        onRefresh && onRefresh();
        return { success: true, message: 'Cập nhật giao dịch thành công' };
      } else {
        setError(result.error || 'Không thể cập nhật giao dịch');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error updating transaction:', err);
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật giao dịch';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [onUpdateTransaction, onRefresh]);

  // Delete transaction with confirmation
  const handleDelete = useCallback(async (transaction) => {
    const confirmMessage = `Bạn có chắc chắn muốn xóa giao dịch này?

Loại: ${transaction.transaction_type}
Ngày: ${new Date(transaction.transaction_date).toLocaleDateString('vi-VN')}
Số tiền: ${transaction.debit > 0 ? transaction.debit : transaction.credit} VND

Hành động này không thể hoàn tác.`;

    if (!window.confirm(confirmMessage)) {
      return { success: false, cancelled: true };
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await onDeleteTransaction(transaction.id);
      
      if (result.success) {
        // Refresh data after successful deletion
        onRefresh && onRefresh();
        return { success: true, message: 'Xóa giao dịch thành công' };
      } else {
        setError(result.error || 'Không thể xóa giao dịch');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi xóa giao dịch';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [onDeleteTransaction, onRefresh]);

  // Batch delete transactions
  const handleBatchDelete = useCallback(async (transactions) => {
    const confirmMessage = `Bạn có chắc chắn muốn xóa ${transactions.length} giao dịch đã chọn?

Hành động này không thể hoàn tác.`;

    if (!window.confirm(confirmMessage)) {
      return { success: false, cancelled: true };
    }

    try {
      setLoading(true);
      setError(null);
      
      const promises = transactions.map(transaction => 
        onDeleteTransaction(transaction.id)
      );
      
      const results = await Promise.allSettled(promises);
      
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      const failed = results.length - successful;
      
      // Refresh data after batch operation
      onRefresh && onRefresh();
      
      if (failed === 0) {
        return { 
          success: true, 
          message: `Đã xóa thành công ${successful} giao dịch` 
        };
      } else {
        const message = `Đã xóa ${successful} giao dịch thành công, ${failed} giao dịch lỗi`;
        setError(message);
        return { success: false, error: message, partial: true };
      }
    } catch (err) {
      console.error('Error batch deleting transactions:', err);
      const errorMessage = 'Có lỗi xảy ra khi xóa các giao dịch';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [onDeleteTransaction, onRefresh]);

  // Duplicate transaction
  const handleDuplicate = useCallback(async (transaction) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create a copy of the transaction with new date and cleared reference
      const duplicatedTransaction = {
        ...transaction,
        id: undefined, // Clear ID for new transaction
        transaction_date: new Date().toISOString().split('T')[0], // Today's date
        reference_number: '', // Clear reference number
        notes: transaction.notes ? `Sao chép từ: ${transaction.reference_number || 'N/A'}` : '',
        created_at: undefined,
        updated_at: undefined
      };
      
      const result = await onCreateTransaction(duplicatedTransaction);
      
      if (result.success) {
        // Refresh data after successful duplication
        onRefresh && onRefresh();
        return { success: true, message: 'Sao chép giao dịch thành công' };
      } else {
        setError(result.error || 'Không thể sao chép giao dịch');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error duplicating transaction:', err);
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi sao chép giao dịch';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [onCreateTransaction, onRefresh]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,

    // Actions
    handleCreate,
    handleUpdate,
    handleDelete,
    handleBatchDelete,
    handleDuplicate,
    clearError,

    // Utilities
    isProcessing: loading
  };
};