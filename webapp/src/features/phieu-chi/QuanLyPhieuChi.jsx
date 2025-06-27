import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ExpenseForm from '@/components/shared/ExpenseForm';
import ExpenseList from '@/components/shared/ExpenseList';
import InvoiceModal from '@/components/InvoiceModal';
import useExpenses from './hooks/useExpenses';
import { Fab, Zoom } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const QuanLyPhieuChi = () => {
  const { currentUser } = useAuth();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpenseId, setViewingExpenseId] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  const {
    expenses,
    categories,
    isLoading,
    error,
    deleteExpense,
    pagination,
  } = useExpenses();

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
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
      } catch (error) {
        // Error is already handled in the hook
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
          expense={editingExpense}
          onClose={handleCloseForm}
          isOpen={showExpenseForm}
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

      {/* FAB Button */}
      <Zoom in={true}>
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
    </div>
  );
};

export default QuanLyPhieuChi;
