import React from 'react';
import {
  useLogin,
  useProfile,
  useExpenses,
  useCreateExpense,
  useActiveTractors,
  useMaintenance,
  useApiStatus,
} from '@api/hooks';
import { CreateExpenseRequest, PaymentStatus, Currency } from '@api/types';

// Example: Authentication component
export const LoginExample: React.FC = () => {
  const loginMutation = useLogin();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const handleLogin = async () => {
    try {
      await loginMutation.mutateAsync({
        username: 'admin',
        password: 'password123',
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleLogin} disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Logging in...' : 'Login'}
      </button>

      {profileLoading && <p>Loading profile...</p>}
      {profile?.data && (
        <div>
          <h3>Welcome, {profile.data.name}</h3>
          <p>Role: {profile.data.role}</p>
        </div>
      )}
    </div>
  );
};

// Example: Expenses list with pagination
export const ExpensesExample: React.FC = () => {
  const {
    data: expenses,
    isLoading,
    error,
    refetch,
  } = useExpenses({
    page: 1,
    limit: 10,
  });

  if (isLoading) return <div>Loading expenses...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>Expenses ({expenses?.pagination?.records_count || 0} total)</h3>
      <button onClick={() => refetch()}>Refresh</button>

      {expenses?.data?.map(expense => (
        <div key={expense.id} style={{ border: '1px solid #ccc', margin: '8px', padding: '8px' }}>
          <h4>{expense.vendor_name}</h4>
          <p>
            Total: {expense.total.toLocaleString()} {expense.currency}
          </p>
          <p>Status: {expense.payment_status}</p>
          <p>Vehicle: {expense.tractor?.license_plate || expense.trailer?.license_plate}</p>
        </div>
      ))}
    </div>
  );
};

// Example: Create expense with optimistic updates
export const CreateExpenseExample: React.FC = () => {
  const createExpenseMutation = useCreateExpense();
  const { data: tractors } = useActiveTractors();

  const handleCreateExpense = async () => {
    const newExpense: CreateExpenseRequest = {
      tractor_id: tractors?.data?.[0]?.id || 1,
      vendor_name: 'Auto Parts Store',
      expense_category_id: 1,
      subtotal: 1000000,
      tax_rate: 10,
      total: 1100000,
      payment_status: PaymentStatus.PENDING,
      currency: Currency.VND,
      remark: 'Sample expense',
      items: [
        {
          item_name: 'Oil Change',
          price: 500000,
          quantity: 1,
          tax_rate: 10,
          total: 550000,
        },
        {
          item_name: 'Filter Replacement',
          price: 500000,
          quantity: 1,
          tax_rate: 10,
          total: 550000,
        },
      ],
    };

    try {
      await createExpenseMutation.mutateAsync(newExpense);
      alert('Expense created successfully!');
    } catch (error) {
      alert('Failed to create expense');
    }
  };

  return (
    <div>
      <button onClick={handleCreateExpense} disabled={createExpenseMutation.isPending}>
        {createExpenseMutation.isPending ? 'Creating...' : 'Create Sample Expense'}
      </button>
    </div>
  );
};

// Example: Maintenance records with real-time status
export const MaintenanceExample: React.FC = () => {
  const { data: maintenance, isLoading } = useMaintenance({ page: 1, limit: 5 });

  if (isLoading) return <div>Loading maintenance records...</div>;

  return (
    <div>
      <h3>Recent Maintenance</h3>
      {maintenance?.data?.map(record => (
        <div key={record.id} style={{ border: '1px solid #ccc', margin: '8px', padding: '8px' }}>
          <h4>{record.item_name}</h4>
          <p>Vehicle: {record.license_plate}</p>
          <p>Vendor: {record.vendor_name}</p>
          <p>Install Date: {new Date(record.install_date).toLocaleDateString()}</p>
          {record.expiry_date && <p>Expiry: {new Date(record.expiry_date).toLocaleDateString()}</p>}
          <p>Total: {record.total.toLocaleString()} VND</p>
        </div>
      ))}
    </div>
  );
};

// Example: API status monitoring
export const ApiStatusExample: React.FC = () => {
  const { isOnline, isLoading, error } = useApiStatus();

  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: isOnline ? '#d4edda' : '#f8d7da',
        border: `1px solid ${isOnline ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px',
      }}
    >
      {isLoading ? 'Checking API status...' : isOnline ? '✅ API is online' : '❌ API is offline'}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
};

// Example: Complete dashboard combining multiple hooks
export const DashboardExample: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Vehicle Management Dashboard</h1>

      <div style={{ marginBottom: '20px' }}>
        <ApiStatusExample />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <ExpensesExample />
        </div>
        <div>
          <MaintenanceExample />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <CreateExpenseExample />
      </div>
    </div>
  );
};
