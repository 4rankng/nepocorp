import React, { useState, useContext, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import ExpenseForm from '@/components/shared/ExpenseForm';
import ExpenseList from '@/components/shared/ExpenseList';
import InvoiceModal from '@/components/InvoiceModal';
import useExpenses from './hooks/useExpenses';
import useExpenseForm from '@/hooks/useExpenseForm';
import { expenseApi } from '@services/api/expenseApi';
import { Fab, Zoom, Snackbar, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const QuanLyPhieuChi = () => {
  const { currentUser } = useAuth();
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpenseId, setViewingExpenseId] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
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

  // Single form manager that updates based on editing state
  const formManager = useExpenseForm({
    initialFormData: getInitialFormData(),
    onSuccess: (message) => {
      showSnackbar(message, 'success');
      setShowExpenseForm(false);
      setEditingExpense(null);
    },
    onError: (error) => {
      showSnackbar(error.message, 'error');
    },
    fetchData: pagination.onPageChange ? () => pagination.onPageChange(pagination.page) : null,
    isEdit: !!editingExpense,
    api: expenseApi
  });

  // Update form data when editingExpense changes
  useEffect(() => {
    if (showExpenseForm) {
      const newFormData = getInitialFormData();
      formManager.setFormData(newFormData);
      formManager.setErrors({}); // Clear any previous errors
    }
  }, [editingExpense, showExpenseForm]);

  const handleAddExpense = async () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
    // Ensure vehicle data is loaded
    await fetchTractors();
    await fetchTrailers();
  };

  const handleEditExpense = async (expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
    // Ensure vehicle data is loaded
    await fetchTractors();
    await fetchTrailers();
  };

  const handleViewExpense = (expense) => {
    setViewingExpenseId(expense.id);
    setShowInvoiceModal(true);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const handleCloseInvoiceModal = () => {
    setShowInvoiceModal(false);
    setViewingExpenseId(null);
  };

  const handleDeleteExpense = async (expense) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phiếu chi này?')) {
      try {
        await deleteExpense(expense.id);
        showSnackbar('Xóa phiếu chi thành công', 'success');
      } catch (error) {
        showSnackbar('Không thể xóa phiếu chi', 'error');
      }
    }
  };

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

      {/* Invoice Modal */}
      <InvoiceModal
        open={showInvoiceModal}
        onClose={handleCloseInvoiceModal}
        expenseId={viewingExpenseId}
      />

      {/* FAB Button - Hidden when modals are open */}
      <Zoom in={!showExpenseForm && !showInvoiceModal}>
        <Fab
          color="primary"
          aria-label="Thêm"
          onClick={handleAddExpense}
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
    </div>
  );
};

export default QuanLyPhieuChi;
