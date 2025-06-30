# API Integration Migration Guide

## Overview

This guide helps migrate from the old API integration (`src/services/api/`) to the new TypeScript-based, React Query-powered API system (`src/api/`).

## Key Changes

### 1. File Structure

```
Old: src/services/api/
New: src/api/
├── client/         # Enhanced API client
├── types/          # TypeScript type definitions
├── services/       # Business logic services
├── hooks/          # React Query hooks
├── schemas/        # Zod validation schemas
└── utils/          # Error handling, loading states
```

### 2. Import Changes

```typescript
// Old
import { authApi } from '@services/api/authApi';
import { expenseApi } from '@services/api/expenseApi';

// New
import { useLogin, useProfile } from '@api/hooks';
import { authService } from '@api/services';
```

### 3. Usage Patterns

#### Authentication

```typescript
// Old
const handleLogin = async () => {
  try {
    const response = await authApi.login(username, password);
    // Handle response manually
  } catch (error) {
    // Handle error manually
  }
};

// New
const loginMutation = useLogin();
const handleLogin = async () => {
  try {
    await loginMutation.mutateAsync({ username, password });
    // Automatic cache invalidation and state management
  } catch (error) {
    // Enhanced error handling
  }
};
```

#### Data Fetching

```typescript
// Old
const [expenses, setExpenses] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await expenseApi.getAll();
      setExpenses(response.data);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  fetchExpenses();
}, []);

// New
const {
  data: expenses,
  isLoading,
  error,
} = useExpenses({
  page: 1,
  limit: 10,
});
// Automatic loading states, error handling, caching, refetching
```

#### Creating Data

```typescript
// Old
const handleCreateExpense = async expenseData => {
  try {
    await expenseApi.create(expenseData);
    // Manually refetch data
    await fetchExpenses();
  } catch (error) {
    // Handle error
  }
};

// New
const createExpenseMutation = useCreateExpense();
const handleCreateExpense = async expenseData => {
  try {
    await createExpenseMutation.mutateAsync(expenseData);
    // Automatic cache invalidation and UI updates
  } catch (error) {
    // Enhanced error handling
  }
};
```

## Migration Steps

### Step 1: Install Dependencies (Already Done)

- TypeScript
- React Query
- Zod schemas

### Step 2: Update Components Gradually

1. **Start with leaf components** (components that don't have children using the old API)
2. **Replace useState/useEffect patterns** with React Query hooks
3. **Update import statements**
4. **Remove manual loading/error state management**

### Step 3: Component Migration Examples

#### Simple List Component

```typescript
// Old component
const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await expenseApi.getAll();
        setExpenses(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {expenses.map(expense => (
        <div key={expense.id}>{expense.vendor_name}</div>
      ))}
    </div>
  );
};

// New component
import { useExpenses } from '@api/hooks';
import { LoadingWrapper } from '@api/utils/loadingStates';

const ExpenseList = () => {
  const { data: expensesResponse, isLoading, error } = useExpenses();

  return (
    <LoadingWrapper isLoading={isLoading} error={error}>
      <div>
        {expensesResponse?.data?.map(expense => (
          <div key={expense.id}>{expense.vendor_name}</div>
        ))}
      </div>
    </LoadingWrapper>
  );
};
```

#### Form Component with Mutations

```typescript
// Old component
const ExpenseForm = ({ onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await expenseApi.create(formData);
      onSuccess();
    } catch (error) {
      alert('Error creating expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Expense'}
      </button>
    </form>
  );
};

// New component
import { useCreateExpense } from '@api/hooks';

const ExpenseForm = ({ onSuccess }) => {
  const createExpenseMutation = useCreateExpense();

  const handleSubmit = async (formData) => {
    try {
      await createExpenseMutation.mutateAsync(formData);
      onSuccess();
    } catch (error) {
      alert('Error creating expense');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={createExpenseMutation.isPending}>
        {createExpenseMutation.isPending ? 'Creating...' : 'Create Expense'}
      </button>
    </form>
  );
};
```

### Step 4: Benefits You'll Get

1. **Automatic Caching**: No more manual cache management
2. **Background Refetching**: Data stays fresh automatically
3. **Optimistic Updates**: Instant UI feedback
4. **Error Boundaries**: Consistent error handling
5. **Loading States**: Built-in loading indicators
6. **Type Safety**: Full TypeScript support
7. **DevTools**: React Query DevTools for debugging

### Step 5: Testing the Migration

1. **Check React Query DevTools**: Verify queries are working
2. **Test Error Scenarios**: Ensure proper error handling
3. **Verify Caching**: Check that data doesn't refetch unnecessarily
4. **Test Mutations**: Ensure optimistic updates work
5. **Check TypeScript**: Verify no type errors

### Step 6: Cleanup

After migration is complete:

1. Remove old API files from `src/services/api/`
2. Update imports throughout the codebase
3. Remove manual loading/error state management
4. Update documentation

## Common Patterns

### Pagination

```typescript
// Old: Manual pagination
const [page, setPage] = useState(1);
const [expenses, setExpenses] = useState([]);

// New: Built-in pagination
const { data, fetchNextPage, hasNextPage } = useInfiniteExpenses(filters);
```

### Real-time Updates

```typescript
// Old: Manual polling
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 30000);
  return () => clearInterval(interval);
}, []);

// New: Built-in refetching
const { data } = useExpenses(
  {},
  {
    refetchInterval: 30000,
  }
);
```

### Dependent Queries

```typescript
// Old: Nested useEffect
useEffect(() => {
  if (expenseId) {
    fetchExpense(expenseId).then(expense => {
      if (expense.tractor_id) {
        fetchTractor(expense.tractor_id);
      }
    });
  }
}, [expenseId]);

// New: Enabled queries
const { data: expense } = useExpense(expenseId);
const { data: tractor } = useTractor(expense?.data?.tractor_id, {
  enabled: !!expense?.data?.tractor_id,
});
```

## Troubleshooting

### Common Issues

1. **Query Key Conflicts**: Ensure unique query keys
2. **Stale Closures**: Use React Query's callbacks
3. **Memory Leaks**: React Query handles cleanup automatically
4. **Type Errors**: Use the provided TypeScript types

### Performance Tips

1. **Use staleTime**: Reduce unnecessary refetches
2. **Implement proper query keys**: Enable automatic cache invalidation
3. **Use select**: Transform data efficiently
4. **Implement infinite queries**: For large lists

This migration provides a modern, scalable, and maintainable API integration that will significantly improve developer experience and application performance.
