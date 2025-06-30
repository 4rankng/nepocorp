# Modular UI Components - Usage Guide

This document outlines the modular UI component system designed for consistent theming and reusability across the application.

## Overview

The UI system is built around the principle of **consistent design patterns** and **reusable components** that maintain visual and functional consistency across all modals and forms.

## Core Components

### 1. Modal Components

#### `<Modal />`

Basic modal wrapper with overlay and size variants.

```jsx
<Modal isOpen={true} onClose={handleClose} size="fullWidth">
  {/* Modal content */}
</Modal>
```

#### `<FormModal />`

Pre-configured modal specifically for forms, includes ESC key handling and form submission.

```jsx
<FormModal
  isOpen={open}
  onClose={onClose}
  title="Form Title"
  onSubmit={handleSubmit}
  actions={<FormActionButtons onCancel={onClose} onSubmit={handleSubmit} />}
>
  {/* Form content */}
</FormModal>
```

### 2. Form Structure Components

#### Basic Layout

```jsx
<FormSections columns={2}>
  <FormSection title="Left Section">
    <FormRow>
      <FormCol>{/* Field 1 */}</FormCol>
      <FormCol>{/* Field 2 */}</FormCol>
    </FormRow>
  </FormSection>

  <FormSection title="Right Section">{/* Content */}</FormSection>
</FormSections>
```

### 3. Field Components

#### `<SelectField />`

Standardized select dropdown with consistent error handling.

```jsx
<SelectField
  label="License Plate"
  name="license_plate"
  value={formData.license_plate}
  onChange={handleChange}
  options={[
    { value: '51C-001', label: '51C-001 (Đầu kéo)' },
    { value: '29H-111', label: '29H-111 (Rơ-moóc)' },
  ]}
  required
  error={errors.license_plate}
/>
```

#### `<TextField />`

Standard text input with error handling.

```jsx
<TextField
  label="Item Name"
  name="item_name"
  value={formData.item_name}
  onChange={handleChange}
  placeholder="Enter item name"
  required
  error={errors.item_name}
/>
```

#### `<NumberField />`

Number input with optional currency formatting.

```jsx
<NumberField
  label="Price"
  name="price"
  value={formData.price}
  onChange={handleChange}
  min={0}
  step={1000}
  required
  showCurrency={true}
  error={errors.price}
/>
```

#### `<CurrencyDisplay />`

Readonly currency display field.

```jsx
<CurrencyDisplay
  label="Total Amount"
  value={calculateTotal()}
  helperText="Calculated automatically"
/>
```

#### `<DateField />`

Date input with consistent styling.

```jsx
<DateField
  label="Install Date"
  name="install_date"
  value={formData.install_date}
  onChange={handleChange}
  error={errors.install_date}
/>
```

#### `<TextareaField />`

Multi-line text input.

```jsx
<TextareaField
  label="Remarks"
  name="remark"
  value={formData.remark}
  onChange={handleChange}
  placeholder="Enter remarks"
  rows={3}
/>
```

### 4. Action Button Components

#### `<FormActionButtons />`

Standard form buttons (Cancel + Save/Submit).

```jsx
<FormActionButtons
  onCancel={handleClose}
  onSubmit={handleSubmit}
  isEdit={true}
  loading={isLoading}
/>
```

#### `<InvoiceFormActionButtons />`

Form buttons with optional invoice functionality.

```jsx
<InvoiceFormActionButtons
  onCancel={handleClose}
  onSubmit={handleSubmit}
  onInvoiceClick={handleInvoiceClick}
  showInvoiceButton={isEdit && hasInvoice}
  isEdit={isEdit}
  loading={isLoading}
  invoiceIcon={<ReceiptIcon />}
/>
```

#### `<ConfirmActionButtons />`

Confirmation dialog buttons.

```jsx
<ConfirmActionButtons
  onCancel={handleCancel}
  onConfirm={handleConfirm}
  confirmText="Delete"
  confirmVariant="danger"
  loading={isDeleting}
/>
```

## Complete Modal Example

Here's a complete example of a maintenance dialog using the modular components:

```jsx
import React, { useState, useEffect } from 'react';
import {
  FormModal,
  FormSections,
  FormSection,
  FormRow,
  SelectField,
  TextField,
  NumberField,
  CurrencyDisplay,
  DateField,
  TextareaField,
  InvoiceFormActionButtons,
} from '@components/ui';
import ReceiptIcon from '@mui/icons-material/Receipt';

const MaintenanceDialog = ({
  open,
  isEdit,
  isLoading,
  formData,
  errors,
  onClose,
  onChange,
  onSave,
  onInvoiceClick,
  licensePlates,
  isLoadingPlates,
}) => {
  const [localFormData, setLocalFormData] = useState(formData || {});

  useEffect(() => {
    setLocalFormData(formData || {});
  }, [formData]);

  const handleInputChange = event => {
    const { name, value } = event.target;
    const newData = { ...localFormData, [name]: value };
    setLocalFormData(newData);
    if (onChange) onChange(event);
  };

  const calculateTotal = () => {
    const price = parseFloat(localFormData.price) || 0;
    const quantity = parseInt(localFormData.quantity) || 0;
    return price * quantity;
  };

  const licensePlateOptions = licensePlates.map(plate => ({
    value: plate.value,
    label: plate.displayText,
  }));

  const actionButtons = (
    <InvoiceFormActionButtons
      onCancel={onClose}
      onSubmit={onSave}
      onInvoiceClick={() => onInvoiceClick(localFormData)}
      showInvoiceButton={isEdit && localFormData?.expense_id}
      isEdit={isEdit}
      loading={isLoading}
      invoiceIcon={<ReceiptIcon />}
    />
  );

  return (
    <FormModal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? 'Edit Maintenance' : 'Add Maintenance'}
      onSubmit={onSave}
      actions={actionButtons}
      loading={isLoading}
    >
      <FormSections columns={2}>
        <FormSection title="Maintenance Information">
          <FormRow>
            <SelectField
              label="License Plate"
              name="license_plate"
              value={localFormData.license_plate}
              onChange={handleInputChange}
              options={licensePlateOptions}
              required
              loading={isLoadingPlates}
              error={errors.license_plate}
            />

            <TextField
              label="Item Name"
              name="item_name"
              value={localFormData.item_name}
              onChange={handleInputChange}
              required
              error={errors.item_name}
            />
          </FormRow>

          <FormRow>
            <TextField
              label="Vendor"
              name="vendor_name"
              value={localFormData.vendor_name}
              onChange={handleInputChange}
              error={errors.vendor_name}
            />

            <NumberField
              label="Price"
              name="price"
              value={localFormData.price}
              onChange={handleInputChange}
              min={0}
              required
              showCurrency={true}
              error={errors.price}
            />
          </FormRow>

          <FormRow>
            <NumberField
              label="Quantity"
              name="quantity"
              value={localFormData.quantity}
              onChange={handleInputChange}
              min={1}
              required
              error={errors.quantity}
            />

            <CurrencyDisplay label="Total" value={calculateTotal()} />
          </FormRow>

          <FormRow>
            <DateField
              label="Install Date"
              name="install_date"
              value={localFormData.install_date}
              onChange={handleInputChange}
              error={errors.install_date}
            />

            <DateField
              label="Expiry Date"
              name="expiry_date"
              value={localFormData.expiry_date}
              onChange={handleInputChange}
              error={errors.expiry_date}
            />
          </FormRow>

          <TextareaField
            label="Remarks"
            name="remark"
            value={localFormData.remark}
            onChange={handleInputChange}
            rows={3}
          />
        </FormSection>

        <FormSection title="Additional Information">{/* Future expansion area */}</FormSection>
      </FormSections>
    </FormModal>
  );
};

export default MaintenanceDialog;
```

## Benefits

1. **Consistent Design**: All modals follow the same visual pattern
2. **Reusable Components**: Write once, use everywhere
3. **Maintainable**: Changes to styling apply globally
4. **Type Safety**: Consistent prop interfaces
5. **Accessibility**: Built-in ARIA support
6. **Responsive**: Mobile-friendly by default
7. **Extensible**: Easy to add new field types and patterns

## Best Practices

1. **Always use FormModal for dialogs** instead of raw Modal
2. **Use specialized field components** instead of basic FormControl
3. **Leverage FormSections** for consistent two-column layouts
4. **Use appropriate ActionButton components** for consistent button layouts
5. **Handle loading and error states** consistently across all forms
6. **Follow the established naming conventions** for props and handlers

## Extending the System

To add new field types or patterns:

1. Create the component in `FieldComponents.jsx` or `ActionButtons.jsx`
2. Export it in `index.js`
3. Follow the established prop patterns (label, name, value, onChange, error, etc.)
4. Document the usage in this README

This modular approach ensures that new modals and forms maintain consistency with the existing design system while being easy to implement and maintain.
