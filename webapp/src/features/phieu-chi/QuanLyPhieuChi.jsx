import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ExpenseForm from '@/components/shared/ExpenseForm';
import ExpenseList from '@/components/shared/ExpenseList';
import { PlusIcon } from '@assets/icons';

const QuanLyPhieuChi = () => {
  const { currentUser } = useAuth();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
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
          onEdit={handleEditExpense}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};

export default QuanLyPhieuChi;
