# Features - Reusable Component Strategy

This document outlines the reusable component strategy applied across the codebase.

## 🎯 **Reusable Component Pattern**

Following the successful pattern from `khach-hang` (customers), we've implemented a consistent architecture across all management features:

### **📦 Structure**

```
feature/
├── components/
│   ├── [Entity]Form.jsx       # Reusable form component
│   ├── [Entity]List.jsx       # Reusable list component
│   ├── [Entity]Management.jsx # Complete management component
│   └── index.js              # Component exports
├── hooks/
│   ├── use[Entity]Management.js # Custom hook for state/API
│   └── index.js              # Hook exports
├── examples/                 # Usage examples (optional)
├── [MainComponent].jsx       # Main entry point
├── index.js                  # Main feature exports
└── README.md                 # Feature documentation
```

## 🚀 **Implemented Features**

### **1. khach-hang (Customer Management)** ✅

- **Data Structure**: `{ name (required), address (optional), taxCode (optional) }`
- **Components**: `CustomerForm`, `CustomerList`, `CustomerManagement`
- **Hook**: `useCustomerManagement`
- **Usage**: `import { CustomerForm } from '@features/khach-hang'`

### **2. doi-tac (Partner Management)** ✅

- **Data Structure**: `{ name (required), address (optional), taxCode (optional) }`
- **Components**: `PartnerForm`, `PartnerList`, `PartnerManagement`
- **Hook**: `usePartnerManagement`
- **Usage**: `import { PartnerForm } from '@features/doi-tac'`

### **3. phuong-tien/LoaiContainer (Container Types)** ✅

- **Data Structure**: `{ type (required), description (optional) }`
- **Components**: `ContainerTypeForm`, `ContainerTypeList`, `ContainerTypeManagement`
- **Hook**: `useContainerTypeManagement`
- **Usage**: `import { ContainerTypeForm } from '@features/phuong-tien'`
- **Special**: Maintains mobile/desktop responsive design with cards and floating buttons

## 🔧 **Key Benefits**

### **1. Consistency**

- Same API patterns across all features
- Consistent error handling and loading states
- Uniform validation and form behavior
- Standardized success/error messaging

### **2. Reusability**

- Form components can be used standalone or embedded
- List components work with any data structure
- Hooks provide pure business logic separation
- Easy to integrate into existing components

### **3. Maintainability**

- Single source of truth for business logic
- Easy to update validation rules centrally
- Consistent styling and UX patterns
- Clear separation of concerns

### **4. Developer Experience**

- Predictable API across all features
- Easy to add new features following the pattern
- Self-documenting through consistent naming
- TypeScript-ready prop interfaces

## 📝 **Usage Examples**

### **Standalone Form**

```jsx
import { CustomerForm } from '@features/khach-hang';

<CustomerForm
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onSave={data => console.log(data)}
  customer={editingCustomer} // null for add, object for edit
/>;
```

### **Standalone List**

```jsx
import { PartnerList } from '@features/doi-tac';

<PartnerList
  partners={partners}
  loading={loading}
  onEdit={partner => handleEdit(partner)}
  onDelete={partner => handleDelete(partner)}
/>;
```

### **Complete Management**

```jsx
import { ContainerTypeManagement } from '@features/phuong-tien';

// Includes form, list, and all CRUD operations
<ContainerTypeManagement />;
```

### **Custom Hook Usage**

```jsx
import { useCustomerManagement } from '@features/khach-hang';

const { customers, loading, error, addCustomer, updateCustomer, deleteCustomer } =
  useCustomerManagement();
```

## 🔄 **Integration with Existing Components**

### **MobileShipmentFormStepper Integration**

```jsx
// Before: Using CustomerFormDialog
<CustomerFormDialog
  open={customerDialog.open}
  onClose={handleCloseCustomerDialog}
  onSuccess={handleCustomerSuccess}
/>

// After: Using reusable CustomerForm
<CustomerForm
  open={customerDialog.open}
  onClose={handleCloseCustomerDialog}
  onSave={handleCustomerSave}
/>
```

## 🎨 **Design Considerations**

### **Mobile-First Responsive Design**

- Desktop: Table view with inline actions
- Mobile: Card view with floating add button
- Consistent spacing and touch targets
- Proper loading and empty states

### **Form Validation**

- Required field validation
- Real-time error clearing
- Consistent error messaging
- ESC key support for closing dialogs

### **Data Simplification**

- Removed unnecessary "code" fields
- Made most fields optional except primary identifier
- Focused on essential business data
- Consistent field naming conventions

## 🚀 **Next Steps**

This pattern can be applied to other features:

- `nhan-vien` (Employee Management)
- `phuong-tien` (Vehicle Management)
- `bao-cao` (Reports Management)
- Any new CRUD features

## 📋 **Checklist for New Features**

When creating a new management feature:

- [ ] Define simplified data structure (required vs optional fields)
- [ ] Update mock data service with consistent validation
- [ ] Create Form component with error handling
- [ ] Create List component with loading states
- [ ] Create custom hook for business logic
- [ ] Create complete Management component
- [ ] Add proper index exports
- [ ] Update main component to use new architecture
- [ ] Test mobile and desktop views
- [ ] Document usage examples

## 🔗 **Related Files**

- `webapp/src/shared/components/` - Shared UI components
- `webapp/src/services/mockData/` - Mock API services
- `webapp/src/features/*/README.md` - Feature-specific documentation
