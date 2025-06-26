# Shared Expense Management Components

This directory contains reusable components and hooks for expense management across the application. These components were extracted from the BaoDuong (maintenance) feature to enable consistent expense handling for different expense categories.

## Components

### ExpenseForm
A comprehensive form component for creating and editing expenses.

**Props:**
- `open` (boolean): Whether the modal is open
- `isEdit` (boolean): Whether in edit mode
- `isLoading` (boolean): Loading state
- `formData` (object): Form data object
- `errors` (object): Validation errors
- `onClose` (function): Close handler
- `onChange` (function): Change handler
- `onSave` (function): Save handler
- `licensePlates` (array): Available license plates
- `isLoadingPlates` (boolean): License plates loading state
- `expenseCategoryId` (number, optional): Fixed expense category ID (if provided, category selection is hidden)
- `title` (string, optional): Custom form title

**Usage:**
```jsx
import { ExpenseForm } from '@components/shared';

// For BaoDuong (fixed category)
<ExpenseForm
  open={open}
  isEdit={isEdit}
  formData={formData}
  errors={errors}
  onClose={onClose}
  onChange={onChange}
  onSave={onSave}
  licensePlates={licensePlates}
  expenseCategoryId={1} // Fixed for maintenance
  title="Nhập thông tin bảo dưỡng"
/>

// For generic expenses (category selection enabled)
<ExpenseForm
  open={open}
  isEdit={isEdit}
  formData={formData}
  errors={errors}
  onClose={onClose}
  onChange={onChange}
  onSave={onSave}
  licensePlates={licensePlates}
/>
```

### ExpenseItemManager
Component for managing expense items (add, edit, remove).

**Props:**
- `items` (array): Array of expense items
- `onChange` (function): Items change handler
- `errors` (object): Validation errors
- `showInstallExpiry` (boolean): Whether to show install/expiry date fields

**Usage:**
```jsx
import { ExpenseItemManager } from '@components/shared';

<ExpenseItemManager
  items={formData.items}
  onChange={handleItemsChange}
  errors={errors}
  showInstallExpiry={true} // For maintenance items
/>
```

### ExpenseList
Responsive list/table component for displaying expenses.

**Props:**
- `expenses` (array): Array of expense records
- `loading` (boolean): Loading state
- `error` (object): Error state
- `onEdit` (function): Edit handler
- `onDelete` (function): Delete handler
- `pagination` (object, optional): Pagination configuration
- `searchTerm` (string): Search filter
- `selectedCategory` (string): Category filter
- `categories` (array): Available categories
- `showCategoryColumn` (boolean): Whether to show category column
- `CardComponent` (component, optional): Custom mobile card component
- `emptyMessage` (string): Empty state message

**Usage:**
```jsx
import { ExpenseList } from '@components/shared';

<ExpenseList
  expenses={expenses}
  loading={loading}
  error={error}
  onEdit={handleEdit}
  onDelete={handleDelete}
  pagination={pagination}
  categories={categories}
  showCategoryColumn={true}
/>
```

### PaymentManagement
Component for managing payment status and proof.

**Props:**
- `paymentStatus` (string): Current payment status
- `paymentProof` (string): Payment proof URL
- `onPaymentStatusChange` (function): Status change handler
- `onPaymentProofChange` (function): Proof change handler
- `errors` (object): Validation errors
- `disabled` (boolean): Whether inputs are disabled
- `showFileUpload` (boolean): Whether to show file upload

**Usage:**
```jsx
import { PaymentManagement } from '@components/shared';

<PaymentManagement
  paymentStatus={formData.payment_status}
  paymentProof={formData.payment_proof}
  onPaymentStatusChange={handleStatusChange}
  onPaymentProofChange={handleProofChange}
  errors={errors}
  showFileUpload={true}
/>
```

## Hooks

### useExpenseForm
A comprehensive hook for expense form management with validation and API integration.

**Parameters:**
- `initialFormData` (object): Initial form state
- `onSuccess` (function): Success callback
- `onError` (function): Error callback
- `fetchData` (function): Data refresh function
- `isEdit` (boolean): Whether in edit mode
- `api` (object): API service object
- `expenseCategoryId` (number, optional): Fixed expense category

**Returns:**
- `formData`: Current form data
- `setFormData`: Form data setter
- `errors`: Validation errors
- `setErrors`: Errors setter
- `isLoading`: Loading state
- `setIsLoading`: Loading setter
- `handleInputChange`: Input change handler
- `validateForm`: Form validation function
- `handleSave`: Save handler

**Usage:**
```jsx
import { useExpenseForm } from '@components/shared';

const {
  formData,
  setFormData,
  errors,
  handleInputChange,
  handleSave,
  isLoading
} = useExpenseForm({
  initialFormData,
  isEdit,
  api: expenseApi,
  expenseCategoryId: 1, // For fixed category like BaoDuong
  onSuccess: (message) => {
    // Handle success
  },
  onError: (error) => {
    // Handle error
  }
});
```

## Integration with Existing Features

### BaoDuong Integration
The BaoDuong feature has been updated to use these shared components:

1. **BaoDuongDialog**: Now wraps `ExpenseForm` with `expenseCategoryId={1}`
2. **QuanLyBaoDuong**: Uses `useExpenseForm` hook with fixed category
3. **Form Data Structure**: Aligned with generic expense format

### Creating New Expense Features
To create a new expense feature (e.g., Fuel Expenses):

1. **Create Feature Structure:**
```
src/features/fuel-expenses/
├── FuelExpenseMain.jsx
├── components/
│   └── FuelExpenseCard.jsx (optional custom card)
└── hooks/
    └── useFuelExpenseRecords.js
```

2. **Use Shared Components:**
```jsx
import { ExpenseForm, ExpenseList, useExpenseForm } from '@components/shared';

// In your main component
const fuelExpenseForm = useExpenseForm({
  // ... configuration
  expenseCategoryId: 2, // Fuel category ID
});

// Render form
<ExpenseForm
  {...fuelExpenseForm}
  expenseCategoryId={2}
  title="Nhập thông tin chi phí nhiên liệu"
/>

// Render list
<ExpenseList
  expenses={expenses}
  showCategoryColumn={false} // Hide since it's fixed
  // ... other props
/>
```

## Data Structure

### Expense Form Data
```javascript
{
  license_plate: '', // License plate
  vendor_name: '', // Vendor name
  expense_category_id: 1, // Category ID (optional if fixed)
  payment_status: 'DRAFT', // DRAFT | PENDING | PAID | CANCELLED
  payment_proof: '', // Payment proof URL
  items: [
    {
      item_name: '', // Item name
      price: '', // Unit price
      quantity: '', // Quantity
      install_date: '', // Installation date (optional)
      expiry_date: '' // Expiry date (optional)
    }
  ],
  remark: '', // Notes
  tax_rate: 10, // Tax rate percentage
  currency: 'VND'
}
```

### API Integration
The shared components work with the expense API format:
- Uses `convertLicensePlateToIds()` to map license plates to tractor/trailer IDs
- Transforms form data to expense API format with `transformToExpenseFormat()`
- Handles validation with `validateExpenseForm()`
- Supports both create and update operations

## Best Practices

1. **Fixed vs Dynamic Categories**: Use `expenseCategoryId` prop for fixed categories like BaoDuong
2. **Custom Styling**: Components support custom CSS classes and inline styles
3. **Error Handling**: Always provide error callbacks and display validation errors
4. **Mobile Responsiveness**: ExpenseList automatically switches between table and card views
5. **Data Consistency**: Use the shared hook to ensure consistent data transformation and validation

## Future Enhancements

- [ ] File upload integration for payment proofs
- [ ] Bulk expense operations
- [ ] Export functionality
- [ ] Advanced filtering and search
- [ ] Expense analytics and reporting
- [ ] Approval workflow integration