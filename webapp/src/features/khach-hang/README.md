# Customer Management (Khách hàng) - Reusable Components

This module provides reusable components for customer management functionality with a simplified data structure.

## Customer Data Structure

```javascript
{
  id: string,           // Auto-generated
  name: string,         // Required - Customer name
  address: string,      // Optional - Customer address
  taxCode: string,      // Optional - Tax code
}
```

## Components

### 1. CustomerForm

A reusable form component for adding/editing customers.

```jsx
import { CustomerForm } from '@features/khach-hang';

<CustomerForm
  open={isFormOpen}
  onClose={() => setIsFormOpen(false)}
  onSave={(formData) => handleSave(formData)}
  customer={selectedCustomer} // null for add, object for edit
  isLoading={loading}
  error={errorMessage}
/>
```

**Props:**
- `open` (boolean): Controls form visibility
- `onClose` (function): Called when form is closed
- `onSave` (function): Called when form is submitted with form data
- `customer` (object|null): Customer data for editing, null for adding
- `isLoading` (boolean): Shows loading state
- `error` (string): Error message to display

### 2. CustomerList

A reusable list component for displaying customers in a table.

```jsx
import { CustomerList } from '@features/khach-hang';

<CustomerList
  customers={customerArray}
  loading={isLoading}
  onEdit={(customer) => handleEdit(customer)}
  onDelete={(customer) => handleDelete(customer)}
  error={errorMessage}
  emptyMessage="No customers found"
/>
```

**Props:**
- `customers` (array): Array of customer objects
- `loading` (boolean): Shows loading state
- `onEdit` (function): Called when edit button is clicked
- `onDelete` (function): Called when delete button is clicked
- `error` (string): Error message to display
- `emptyMessage` (string): Message when no data

### 3. CustomerManagement

A complete customer management component with all functionality.

```jsx
import { CustomerManagement } from '@features/khach-hang';

// Use as-is for complete functionality
<CustomerManagement />
```

### 4. useCustomerManagement Hook

A custom hook for managing customer state and API calls.

```jsx
import { useCustomerManagement } from '@features/khach-hang';

const {
  // State
  customers,
  loading,
  error,

  // Actions
  fetchCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
  clearError,
} = useCustomerManagement();
```

**Hook Methods:**
- `fetchCustomers()`: Reload customer list
- `addCustomer(data)`: Add new customer
- `updateCustomer(id, data)`: Update existing customer
- `deleteCustomer(id)`: Delete customer
- `getCustomerById(id)`: Get single customer
- `clearError()`: Clear error state

All CRUD methods return `{ success: boolean, data?: object, error?: string }`

## Usage Examples

### Example 1: Complete Management Component

```jsx
import { CustomerManagement } from '@features/khach-hang';

const MyPage = () => {
  return <CustomerManagement />;
};
```

### Example 2: Custom Implementation with Hook

```jsx
import { useCustomerManagement, CustomerForm, CustomerList } from '@features/khach-hang';

const CustomCustomerPage = () => {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomerManagement();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const handleSave = async (formData) => {
    const result = selectedCustomer
      ? await updateCustomer(selectedCustomer.id, formData)
      : await addCustomer(formData);

    if (result.success) {
      setIsFormOpen(false);
      setSelectedCustomer(null);
    }
  };

  return (
    <div>
      <button onClick={() => setIsFormOpen(true)}>Add Customer</button>

      <CustomerList
        customers={customers}
        loading={loading}
        onEdit={(customer) => {
          setSelectedCustomer(customer);
          setIsFormOpen(true);
        }}
        onDelete={(customer) => deleteCustomer(customer.id)}
      />

      <CustomerForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        customer={selectedCustomer}
        isLoading={loading}
      />
    </div>
  );
};
```

### Example 3: Just the Form

```jsx
import { CustomerForm } from '@features/khach-hang';

const AddCustomerModal = ({ open, onClose }) => {
  const handleSave = (formData) => {
    // Your custom save logic
    console.log('Customer data:', formData);
    onClose();
  };

  return (
    <CustomerForm
      open={open}
      onClose={onClose}
      onSave={handleSave}
    />
  );
};
```

## API Integration

The components use the mock API service by default. To integrate with a real API, update the `customerApi` in `@services/mockApi`.

## Features

- ✅ Add, edit, delete customers
- ✅ Form validation (name required, optional fields)
- ✅ Loading states
- ✅ Error handling
- ✅ Confirmation dialogs
- ✅ Success notifications
- ✅ Keyboard navigation (ESC to close)
- ✅ Responsive design
- ✅ TypeScript-friendly prop types

## Dependencies

- React 18+
- Material-UI (MUI)
- Custom shared components (`@shared/components`)

## File Structure

```
khach-hang/
├── components/
│   ├── CustomerForm.jsx       # Reusable form component
│   ├── CustomerList.jsx       # Reusable list component
│   ├── CustomerManagement.jsx # Complete management component
│   ├── KhachHangList.jsx     # Legacy component
│   └── index.js              # Component exports
├── hooks/
│   ├── useCustomerManagement.js # Custom hook for state management
│   └── index.js              # Hook exports
├── examples/
│   └── BasicCustomerUsage.jsx # Usage examples
├── QuanLyKhachHang.jsx       # Main entry point
├── index.js                  # Main module exports
└── README.md                 # This file
```
