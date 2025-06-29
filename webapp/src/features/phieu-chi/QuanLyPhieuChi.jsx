import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import ExpenseForm from '@/components/shared/ExpenseForm';
import ExpenseList from '@/components/shared/ExpenseList';
import ExpenseViewModal from '@/components/ExpenseViewModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import useExpenses from './hooks/useExpenses';
import useExpenseForm from '@/hooks/useExpenseForm';
import { expenseApi } from '@services/api/expenseApi';
import { Fab, Zoom, Snackbar, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { PAYMENT_STATUS_LABELS } from '@constants/payment';
import { Z_INDEX } from '@constants/zIndex';
import { useModalVisibility } from '@hooks/useModalVisibility';

const QuanLyPhieuChi = () => {
  const { currentUser } = useAuth();
  const { hasActiveProfileModal } = useModalVisibility();
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);
  
  // Helper functions
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
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpenseId, setViewingExpenseId] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, expense: null });
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Snackbar handlers
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  const {
    expenses,
    categories,
    isLoading,
    error,
    deleteExpense,
    updateExpense,
    createExpense,
    pagination,
  } = useExpenses();

  // Transform expense data for editing (from API format to form format)
  const transformExpenseForForm = (expense) => {
    if (!expense) return null;
    
    return {
      id: expense.id,
      license_plate: expense.license_plate || '',
      vendor_name: expense.vendor_name || '',
      expense_category_id: expense.expense_category_id || '',
      payment_status: expense.payment_status || 'DRAFT',
      payment_proof: expense.payment_proof || '',
      remark: expense.remark || '',
      items: expense.items?.map(item => ({
        id: item.id,
        item_name: item.item_name || '',
        price: item.price?.toString() || '',
        quantity: item.quantity?.toString() || '1',
        install_date: item.install_date ? item.install_date.split('T')[0] : '',
        expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
      })) || [{
        item_name: '',
        price: '',
        quantity: '1',
        install_date: '',
        expiry_date: ''
      }]
    };
  };

  // Get license plates for dropdown
  const getAllLicensePlates = () => {
    const tractorPlates = tractors.map(t => ({
      value: t.license_plate,
      displayText: `${t.license_plate} (Đầu kéo)`,
      type: 'tractor'
    }));
    
    const trailerPlates = trailers.map(t => ({
      value: t.license_plate,
      displayText: `${t.license_plate} (Rơ moóc)`,
      type: 'trailer'
    }));
    
    return [...tractorPlates, ...trailerPlates];
  };

  // Get initial form data based on mode
  const getInitialFormData = () => {
    if (editingExpense) {
      return transformExpenseForForm(editingExpense);
    }
    return {
      license_plate: '',
      vendor_name: '',
      expense_category_id: '',
      payment_status: 'DRAFT',
      payment_proof: '',
      remark: '',
      items: [{
        item_name: '',
        price: '',
        quantity: '1',
        install_date: '',
        expiry_date: ''
      }]
    };
  };

  // Memoize the initial form data to prevent unnecessary recreations
  const initialFormData = useMemo(() => getInitialFormData(), [editingExpense]);
  
  // Single form manager that updates based on editing state
  const formManager = useExpenseForm({
    initialFormData,
    onSuccess: (message) => {
      showSnackbar(message, 'success');
      // Only close modal on actual success
      setShowExpenseForm(false);
      setEditingExpense(null);
    },
    onError: (error) => {
      showSnackbar(error.message, 'error');
      // NEVER close modal on errors - user should be able to fix and retry
    },
    fetchData: pagination.onPageChange ? () => pagination.onPageChange(pagination.page) : null,
    isEdit: !!editingExpense,
    api: expenseApi
  });


  const handleAddExpense = useCallback(async () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
    // Ensure vehicle data is loaded
    await fetchTractors();
    await fetchTrailers();
  }, [fetchTractors, fetchTrailers]);

  const handleEditExpense = useCallback(async (expense) => {
    try {
      // Show loading state while fetching full expense data
      showSnackbar('Đang tải thông tin phiếu chi...', 'info');
      
      // Fetch full expense data including items
      const response = await expenseApi.getById(expense.id);
      const fullExpenseData = response.data?.data || response.data || response;
      
      // Set the full expense data for editing
      setEditingExpense(fullExpenseData);
      setShowExpenseForm(true);
      
      // Ensure vehicle data is loaded
      await fetchTractors();
      await fetchTrailers();
    } catch (error) {
      console.error('Error fetching expense details:', error);
      showSnackbar('Không thể tải thông tin phiếu chi', 'error');
    }
  }, [fetchTractors, fetchTrailers, showSnackbar]);

  const handleViewExpense = useCallback((expense) => {
    setViewingExpenseId(expense.id);
    setShowInvoiceModal(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  }, []);

  const handleCloseInvoiceModal = useCallback(() => {
    setShowInvoiceModal(false);
    setViewingExpenseId(null);
  }, []);


  const handleDeleteExpense = useCallback((expense) => {
    setDeleteDialog({ open: true, expense });
  }, []);

  const handleDeleteClose = useCallback(() => {
    setDeleteDialog({ open: false, expense: null });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.expense) return;
    
    setIsDeletingExpense(true);
    try {
      await deleteExpense(deleteDialog.expense.id);
      showSnackbar('Xóa phiếu chi thành công', 'success');
      handleDeleteClose();
    } catch (error) {
      showSnackbar('Không thể xóa phiếu chi', 'error');
    } finally {
      setIsDeletingExpense(false);
    }
  }, [deleteDialog.expense, deleteExpense, showSnackbar, handleDeleteClose]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          open={showExpenseForm}
          isEdit={!!editingExpense}
          isLoading={formManager.isLoading}
          formData={formManager.formData}
          errors={formManager.errors}
          onClose={handleCloseForm}
          onChange={formManager.handleInputChange}
          onSave={formManager.handleSave}
          licensePlates={getAllLicensePlates()}
          isLoadingPlates={false}
          title={editingExpense ? 'Sửa phiếu chi' : 'Thêm phiếu chi mới'}
        />
      )}

      {/* Expense List */}
      <div className="bg-white rounded-lg shadow">
        <ExpenseList
          expenses={expenses}
          categories={categories}
          loading={isLoading}
          error={error}
          onView={handleViewExpense}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
          pagination={pagination}
          currentUser={currentUser}
        />
      </div>

      {/* Expense View Modal - Conditional rendering to prevent unnecessary re-renders */}
      {showInvoiceModal && (
        <ExpenseViewModal
          open={true}
          onClose={handleCloseInvoiceModal}
          expenseId={viewingExpenseId}
        />
      )}

      {/* FAB Button - Hidden when modals are open */}
      <Zoom in={!showExpenseForm && !showInvoiceModal && !hasActiveProfileModal}>
        <Fab
          color="primary"
          aria-label="Thêm"
          onClick={handleAddExpense}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: Z_INDEX.FLOATING,
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onCancel={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeletingExpense}
        type="delete"
        title="Xóa phiếu chi"
        message="Bạn có chắc chắn muốn xóa phiếu chi này?"
        details={deleteDialog.expense ? {
          'Nhà cung cấp': deleteDialog.expense.vendor_name || '-',
          'Loại chi phí': (() => {
            const category = categories.find(cat => cat.id === deleteDialog.expense.expense_category_id);
            return category ? category.name : '-';
          })(),
          'Tổng tiền': formatCurrency(deleteDialog.expense.total || 0),
          'Trạng thái': PAYMENT_STATUS_LABELS[deleteDialog.expense.payment_status] || deleteDialog.expense.payment_status || '-',
          'Ngày tạo': formatDate(deleteDialog.expense.created_at),
          ...(deleteDialog.expense.remark && { 'Ghi chú': deleteDialog.expense.remark }),
        } : null}
      />
    </div>
  );
};

export default QuanLyPhieuChi;
