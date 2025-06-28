# Vehicle Expense Management UI Specification

## Overview

This document describes the user interface for the Vehicle Expense Management system, specifically focusing on the expense entry modal/form for recording vehicle maintenance and other expenses.

## Expense Entry Modal

The expense entry modal is a two-column layout form used for creating and editing vehicle expenses.

### Modal Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     Nhập thông tin bảo dưỡng                     │
├─────────────────────────────────┬───────────────────────────────┤
│         LEFT COLUMN             │        RIGHT COLUMN            │
│                                 │                                │
│  [Vehicle & Vendor Info]        │  [Expense Items]               │
│  [Financial Information]        │                                │
│  [Payment Status]               │  [+ Add Item Button]           │
│  [Documentation]                │                                │
│  [Notes]                        │                                │
│                                 │                                │
│  [Cancel]              [Save]   │                                │
└─────────────────────────────────┴───────────────────────────────┘
```

### Left Column - Main Information

#### Row 1: Vehicle & Vendor
Two fields displayed side by side:

1. **Biển số xe (License Plate)**
   - Type: Dropdown/Select with search
   - Required: Yes
   - Options: List of tractors and trailers
   - Format: Shows license plate with vehicle type indicator
   - Example: "16C-111.22 (Đầu kéo)" or "16C-222.33 (Rơ moóc)"

2. **Nhà cung cấp (Vendor)**
   - Type: Text input with autocomplete
   - Required: Yes
   - Max length: 255 characters
   - Shows suggestions from previous entries

#### Row 2: Financial Information
Three fields in the same row:

1. **Chi phí trước thuế (Subtotal)**
   - Type: Number input
   - Required: Yes
   - Format: Currency (VND)
   - Min: 0
   - Automatically calculates when items are added

2. **Thuế suất (Tax Rate)**
   - Type: Number input
   - Required: Yes
   - Default: Loaded from system settings
   - Format: Percentage (%)
   - Range: 0-100

3. **Tổng tiền (Total)**
   - Type: Read-only display field
   - Format: Currency (VND)
   - Calculation: subtotal + (subtotal × tax_rate / 100)
   - Updates automatically

#### Row 3: Payment Information
Two fields side by side:

1. **Trạng thái (Payment Status)**
   - Type: Dropdown
   - Required: Yes
   - Default: "DRAFT"
   - Options:
     - DRAFT - Nháp
     - PENDING - Chờ thanh toán
     - PAID - Đã thanh toán
     - CANCELLED - Đã hủy

2. **Danh mục chi phí (Expense Category)**
   - Type: Dropdown
   - Required: Yes
   - Options: Dynamic list from expense_categories table
   - Default: "Bảo dưỡng" (ID: 1)

#### Row 4: Documentation
**URL chứng từ (Payment Proof)**
- Type: File upload / URL input
- Required: No
- Accepts: Image files or Google Drive links
- Max file size: 5MB (if file upload)
- Supported formats: JPG, PNG, PDF

#### Rows 5-6: Notes
**Ghi chú (Remarks)**
- Type: Textarea
- Required: No
- Rows: 3
- Max length: 1000 characters
- Placeholder: "Nhập ghi chú về chi phí này..."

### Right Column - Expense Items

#### Item List Header
Labels for the item entry fields:
- Tên vật tư (Item Name)
- Đơn giá (Price) | Số lượng (Quantity) | Thành tiền (Subtotal)
- Ngày lắp đặt (Install Date) | Ngày hết hạn (Expiry Date)

#### Default Item Row
The form starts with one empty item row containing:

1. **Tên vật tư (Item Name)**
   - Type: Text input
   - Required: Yes
   - Width: Full width
   - Placeholder: "VD: Lốp xe, Dầu nhớt..."

2. **Financial Fields** (Same row):
   - **Đơn giá (Price)**
     - Type: Number input
     - Required: Yes
     - Format: Currency (VND)
     - Min: 0

   - **Số lượng (Quantity)**
     - Type: Number input
     - Required: Yes
     - Default: 1
     - Min: 1

   - **Thành tiền (Subtotal)**
     - Type: Read-only display
     - Calculation: price × quantity
     - Updates automatically

3. **Date Fields** (Same row):
   - **Ngày lắp đặt (Install Date)**
     - Type: Date picker
     - Required: No
     - Format: DD/MM/YYYY

   - **Ngày hết hạn (Expiry Date)**
     - Type: Date picker
     - Required: No
     - Format: DD/MM/YYYY
     - Validation: Must be after install date

#### Item Actions
- **Add Button** (+ Thêm vật tư)
  - Position: Below the last item row
  - Action: Adds a new empty item row
  - Style: Secondary button with plus icon

- **Remove Button** (×)
  - Position: End of each item row (except when only one row)
  - Action: Removes the item row
  - Style: Icon button

### Form Actions

Bottom of modal, right-aligned:

1. **Hủy (Cancel)**
   - Type: Secondary button
   - Action: Closes modal without saving
   - Confirmation: Required if form has changes

2. **Lưu (Save)**
   - Type: Primary button
   - Action: Validates and submits form
   - Disabled when: Form is invalid or no changes

## Validation Rules

### Required Fields
- Biển số xe (License Plate)
- Nhà cung cấp (Vendor)
- Danh mục chi phí (Expense Category)
- At least one expense item with:
  - Item name
  - Price > 0
  - Quantity > 0

### Business Rules
1. **Vehicle Selection**: Must select either a tractor OR trailer, not both
2. **Financial Calculations**:
   - Item subtotal = price × quantity
   - Expense subtotal = sum of all item subtotals
   - Total = subtotal + (subtotal × tax_rate / 100)
3. **Date Validation**: Expiry date must be after install date (if both provided)
4. **Status Transitions**:
   - DRAFT → PENDING → PAID
   - Any status → CANCELLED

### Auto-calculations
1. When item price or quantity changes → Update item subtotal
2. When any item subtotal changes → Update expense subtotal
3. When expense subtotal or tax rate changes → Update total

## Responsive Behavior

### Desktop (≥ 1024px)
- Two-column layout as described
- Modal width: 80% of viewport or 1200px max

### Tablet (768px - 1023px)
- Two-column layout maintained
- Reduced padding and margins
- Modal width: 90% of viewport

### Mobile (< 768px)
- Single column layout
- Right column (items) appears below left column
- Modal: Full screen
- Simplified item row layout (stacked fields)

## Accessibility

1. **Keyboard Navigation**
   - Tab order follows logical flow
   - Enter key submits form
   - Escape key cancels (with confirmation)

2. **Screen Reader Support**
   - Proper labels for all inputs
   - Error messages announced
   - Form validation feedback

3. **Visual Indicators**
   - Required fields marked with asterisk (*)
   - Error states with red borders
   - Success states with green indicators

## Error Handling

### Field-level Errors
- Display below each field
- Red text color
- Icon indicator
- Clear error on valid input

### Form-level Errors
- Display at top of modal
- Summary of all errors
- Scroll to first error field

### Common Error Messages
- "Vui lòng chọn biển số xe" - No vehicle selected
- "Nhà cung cấp không được để trống" - Empty vendor
- "Chi phí phải lớn hơn 0" - Invalid amount
- "Vui lòng thêm ít nhất một vật tư" - No items added

## Loading States

1. **Initial Load**
   - Show skeleton loaders for dropdowns
   - Disable form until data loaded

2. **Saving**
   - Disable all inputs
   - Show loading spinner on Save button
   - Display "Đang lưu..." text

3. **Success**
   - Show success toast notification
   - Close modal after 1 second
   - Refresh parent list if applicable

## Sample Data

### Example Expense Entry
```
Biển số xe: 16C-333.44 (Đầu kéo)
Nhà cung cấp: Công ty TNHH Auto Parts
Danh mục: Bảo dưỡng
Chi phí trước thuế: 4,000,000 VND
Thuế suất: 10%
Tổng tiền: 4,400,000 VND
Trạng thái: DRAFT
Ghi chú: Bảo dưỡng định kỳ 3 tháng

Items:
1. Lốp xe
   - Đơn giá: 1,000,000 VND
   - Số lượng: 4
   - Thành tiền: 4,000,000 VND
   - Ngày lắp: 15/01/2024
   - Ngày hết hạn: 15/01/2025
```

in QuanLyBaoDuong.jsx table,
if user click edit button
open modal with data from QuanLyBaoDuong.jsx table
plus invoice button
if user click invoice button, show modal with data from
api/v1/expense
please reuse existing modal UI design or reusable component if possible
