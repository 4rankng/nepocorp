# Vehicle Management API Integration

A modern, type-safe, and scalable API integration for the NepoCorp Vehicle Management System.

## 🚀 Features

- **TypeScript-first**: Full type safety with runtime validation
- **React Query Integration**: Automatic caching, background updates, and optimistic UI
- **Error Handling**: Comprehensive error management with user-friendly messages
- **Loading States**: Built-in loading indicators and skeleton screens
- **Authentication**: JWT token management with automatic refresh
- **Validation**: Zod schemas for runtime data validation
- **Performance**: Intelligent caching and request deduplication
- **Developer Experience**: React Query DevTools and comprehensive TypeScript support

## 📁 Project Structure

```
src/api/
├── client/
│   └── apiClient.ts           # Enhanced Axios client with interceptors
├── types/
│   ├── auth.types.ts          # Authentication types
│   ├── expense.types.ts       # Expense domain types
│   ├── maintenance.types.ts   # Maintenance types
│   ├── vehicle.types.ts       # Vehicle types
│   ├── settings.types.ts      # Settings types
│   ├── common.types.ts        # Shared types
│   └── index.ts              # Type exports
├── services/
│   ├── base.service.ts        # Generic CRUD service base class
│   ├── auth.service.ts        # Authentication service
│   ├── expense.service.ts     # Expense operations
│   ├── maintenance.service.ts # Maintenance operations
│   ├── vehicle.service.ts     # Vehicle operations
│   ├── settings.service.ts    # Settings management
│   ├── health.service.ts      # API health checks
│   └── index.ts              # Service exports
├── hooks/
│   ├── useAuth.ts            # Authentication hooks
│   ├── useExpenses.ts        # Expense React Query hooks
│   ├── useMaintenance.ts     # Maintenance hooks
│   ├── useVehicles.ts        # Vehicle hooks
│   ├── useSettings.ts        # Settings hooks
│   ├── useHealth.ts          # API status hooks
│   ├── queryKeys.ts          # Centralized query key factory
│   └── index.ts              # Hook exports
├── schemas/
│   ├── auth.schemas.ts       # Zod validation schemas
│   ├── expense.schemas.ts    # Expense validation
│   ├── maintenance.schemas.ts# Maintenance validation
│   ├── vehicle.schemas.ts    # Vehicle validation
│   ├── settings.schemas.ts   # Settings validation
│   ├── common.schemas.ts     # Shared schemas
│   └── index.ts              # Schema exports
├── utils/
│   ├── errorHandling.ts      # Error handling utilities
│   └── loadingStates.tsx     # Loading components
├── examples/
│   └── usage-examples.tsx    # Implementation examples
├── MIGRATION_GUIDE.md        # Migration from old API
└── README.md                 # This file
```

## 🔧 Quick Start

### 1. Import and Use Hooks

```typescript
import { useExpenses, useCreateExpense } from '@api/hooks';

const ExpenseList = () => {
  const { data, isLoading, error } = useExpenses({ page: 1, limit: 10 });
  const createExpense = useCreateExpense();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.data?.map(expense => (
        <div key={expense.id}>{expense.vendor_name}</div>
      ))}
    </div>
  );
};
```

### 2. Authentication

```typescript
import { useLogin, useProfile } from '@api/hooks';

const LoginForm = () => {
  const login = useLogin();
  const { data: profile } = useProfile();

  const handleLogin = async () => {
    await login.mutateAsync({
      username: 'admin',
      password: 'password123'
    });
  };

  return (
    <div>
      {profile ? (
        <p>Welcome, {profile.data.name}!</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
};
```

### 3. Data Mutations

```typescript
import { useCreateExpense } from '@api/hooks';

const CreateExpense = () => {
  const createExpense = useCreateExpense();

  const handleCreate = async () => {
    await createExpense.mutateAsync({
      vendor_name: 'Auto Parts Store',
      tractor_id: 1,
      expense_category_id: 1,
      subtotal: 1000000,
      tax_rate: 10,
      total: 1100000,
      payment_status: 'PENDING',
      currency: 'VND',
      items: [{
        item_name: 'Oil Change',
        price: 500000,
        quantity: 1,
        tax_rate: 10,
        total: 550000
      }]
    });
  };

  return (
    <button 
      onClick={handleCreate}
      disabled={createExpense.isPending}
    >
      {createExpense.isPending ? 'Creating...' : 'Create Expense'}
    </button>
  );
};
```

## 🎯 Available Hooks

### Authentication
- `useLogin()` - User login
- `useProfile()` - Get user profile
- `useLogout()` - User logout

### Expenses
- `useExpenses(filters)` - List expenses with filters
- `useExpense(id)` - Get single expense
- `useCreateExpense()` - Create new expense
- `useUpdateExpense()` - Update expense
- `useDeleteExpense()` - Delete expense
- `useExpenseItems(expenseId)` - Get expense items
- `useCreateExpenseItem()` - Create expense item

### Maintenance
- `useMaintenance(filters)` - List maintenance records
- `useMaintenanceRecord(id)` - Get single record
- `useCreateMaintenance()` - Create maintenance record
- `useUpdateMaintenance()` - Update record
- `useDeleteMaintenance()` - Delete record
- `useExpiringMaintenance(days)` - Get expiring maintenance

### Vehicles
- `useTractors(filters)` - List tractors
- `useTrailers(filters)` - List trailers
- `useContainers(filters)` - List containers
- `useActiveTractors()` - Get active tractors only
- `useCreateTractor()` - Create new tractor
- `useUpdateTractor()` - Update tractor
- `useDeleteTractor()` - Delete tractor

### Settings
- `useSetting(key)` - Get setting by key
- `useUpdateSetting()` - Update setting
- `useDefaultTaxRate()` - Get default tax rate
- `useCurrency()` - Get currency setting

### Utilities
- `useApiStatus()` - Monitor API connectivity
- `useHealthCheck()` - API health status

## 🔒 Type Safety

All hooks are fully typed with TypeScript. Import types as needed:

```typescript
import { 
  CreateExpenseRequest, 
  Expense, 
  PaymentStatus,
  Currency 
} from '@api/types';

const expenseData: CreateExpenseRequest = {
  vendor_name: 'Store',
  payment_status: PaymentStatus.PENDING,
  currency: Currency.VND,
  // ... TypeScript will enforce correct structure
};
```

## 🛡️ Error Handling

```typescript
import { useErrorHandler } from '@api/utils/errorHandling';

const MyComponent = () => {
  const { data, error } = useExpenses();
  const errorHandler = useErrorHandler();

  if (error) {
    const message = errorHandler.getErrorMessage(error);
    const isAuthError = errorHandler.isUnauthorized(error);
    
    return <div>Error: {message}</div>;
  }

  return <div>{/* component content */}</div>;
};
```

## 🎨 Loading States

```typescript
import { LoadingWrapper, TableSkeleton } from '@api/utils/loadingStates';

const ExpenseTable = () => {
  const { data, isLoading, error } = useExpenses();

  return (
    <LoadingWrapper 
      isLoading={isLoading} 
      error={error}
      loadingComponent={<TableSkeleton rows={5} columns={4} />}
    >
      {/* table content */}
    </LoadingWrapper>
  );
};
```

## ⚙️ Configuration

### Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### React Query Configuration

React Query is configured in `src/main.jsx` with:
- 2 retry attempts for failed queries
- 5-minute stale time
- 10-minute garbage collection time
- Disabled refetch on window focus

## 🔍 DevTools

React Query DevTools are available in development mode. They appear as a floating icon in the bottom corner of your application.

## 📊 Performance Features

1. **Automatic Caching**: Data is cached automatically and shared between components
2. **Background Updates**: Data is refetched in the background to stay fresh
3. **Request Deduplication**: Identical requests are deduplicated automatically
4. **Infinite Queries**: Built-in support for pagination and infinite scrolling
5. **Optimistic Updates**: UI updates immediately for better user experience

## 🧪 Testing

The API integration is designed to be easily testable:

```typescript
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExpenses } from '@api/hooks';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('useExpenses hook', async () => {
  const { result } = renderHook(() => useExpenses(), {
    wrapper: createWrapper()
  });
  
  // Test hook behavior
});
```

## 🔄 Migration from Old API

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions on migrating from the old API integration.

## 📝 Examples

Check [examples/usage-examples.tsx](./examples/usage-examples.tsx) for comprehensive implementation examples.

## 🤝 Contributing

When adding new API endpoints:

1. Add types to the appropriate `types/*.types.ts` file
2. Create or update the service in `services/`
3. Add React Query hooks in `hooks/`
4. Include Zod schemas in `schemas/` if needed
5. Update query keys in `hooks/queryKeys.ts`
6. Add examples and update documentation

## 📋 API Documentation

The backend API follows RESTful conventions with the following base URL:
- Development: `http://localhost:8080/api/v1`
- Production: Configure via `VITE_API_BASE_URL`

All endpoints require JWT authentication except:
- `POST /auth/login`
- `POST /auth/refresh`

Response format:
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": { ... }
}
```

For detailed API documentation, see the backend API documentation in `/docs/product-spec/api/`.