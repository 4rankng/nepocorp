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
  InvoiceFormActionButtons
} from '@components/ui';
import ReceiptIcon from '@mui/icons-material/Receipt';

const MaintenanceDialog = ({
  open,
  isEdit,
  isLoading,
  formData,
  errors = {},
  onClose,
  onChange,
  onSave,
  onInvoiceClick,
  licensePlates = [],
  isLoadingPlates = false,
}) => {
  const [localFormData, setLocalFormData] = useState(formData || {});

  useEffect(() => {
    setLocalFormData(formData || {});
  }, [formData]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const newData = { ...localFormData, [name]: value };
    setLocalFormData(newData);
    if (onChange) {
      onChange(event);
    }
  };

  const handleSubmit = (e) => {
    if (onSave) {
      onSave(e);
    }
  };

  const handleInvoiceClick = () => {
    if (onInvoiceClick && localFormData.expense_id) {
      onInvoiceClick(localFormData);
    }
  };

  const showInvoiceButton = isEdit && localFormData?.expense_id;
  
  // Calculate total for display
  const calculateTotal = () => {
    const price = parseFloat(localFormData.price) || 0;
    const quantity = parseInt(localFormData.quantity) || 0;
    return price * quantity;
  };

  // Prepare license plates for SelectField
  const licensePlateOptions = licensePlates.map(plate => ({
    value: plate.value,
    label: plate.displayText || `${plate.value} (${plate.type})`
  }));

  const formTitle = isEdit ? 'Sửa thông tin bảo dưỡng' : 'Thêm thông tin bảo dưỡng';

  const actionButtons = (
    <InvoiceFormActionButtons
      onCancel={onClose}
      onSubmit={handleSubmit}
      onInvoiceClick={handleInvoiceClick}
      showInvoiceButton={showInvoiceButton}
      isEdit={isEdit}
      loading={isLoading}
      invoiceIcon={<ReceiptIcon />}
    />
  );

  return (
    <FormModal
      isOpen={open}
      onClose={onClose}
      title={formTitle}
      onSubmit={handleSubmit}
      actions={actionButtons}
      loading={isLoading}
      className="maintenance-dialog"
    >
      <FormSections columns={2}>
        {/* LEFT COLUMN */}
        <FormSection title="Thông tin bảo dưỡng">
          {/* Row 1: License Plate + Item Name */}
          <FormRow>
            <SelectField
              label="Biển số xe"
              name="license_plate"
              value={localFormData.license_plate}
              onChange={handleInputChange}
              options={licensePlateOptions}
              placeholder="Chọn biển số xe"
              required
              disabled={isLoading}
              loading={isLoadingPlates}
              error={errors.license_plate}
            />
            
            <TextField
              label="Hạng mục bảo dưỡng"
              name="item_name"
              value={localFormData.item_name}
              onChange={handleInputChange}
              placeholder="Nhập hạng mục bảo dưỡng"
              required
              disabled={isLoading}
              error={errors.item_name}
            />
          </FormRow>

          {/* Row 2: Vendor + Price */}
          <FormRow>
            <TextField
              label="Nhà cung cấp"
              name="vendor_name"
              value={localFormData.vendor_name}
              onChange={handleInputChange}
              placeholder="Nhập tên nhà cung cấp"
              disabled={isLoading}
              error={errors.vendor_name}
            />
            
            <NumberField
              label="Đơn giá"
              name="price"
              value={localFormData.price}
              onChange={handleInputChange}
              min={0}
              step={1000}
              required
              disabled={isLoading}
              error={errors.price}
              showCurrency={true}
            />
          </FormRow>

          {/* Row 3: Quantity + Total */}
          <FormRow>
            <NumberField
              label="Số lượng"
              name="quantity"
              value={localFormData.quantity}
              onChange={handleInputChange}
              min={1}
              step={1}
              required
              disabled={isLoading}
              error={errors.quantity}
            />
            
            <CurrencyDisplay
              label="Thành tiền"
              value={calculateTotal()}
            />
          </FormRow>

          {/* Row 4: Install Date + Expiry Date */}
          <FormRow>
            <DateField
              label="Ngày lắp đặt"
              name="install_date"
              value={localFormData.install_date}
              onChange={handleInputChange}
              disabled={isLoading}
              error={errors.install_date}
            />
            
            <DateField
              label="Ngày hết hạn"
              name="expiry_date"
              value={localFormData.expiry_date}
              onChange={handleInputChange}
              disabled={isLoading}
              error={errors.expiry_date}
            />
          </FormRow>

          {/* Remarks */}
          <TextareaField
            label="Ghi chú"
            name="remark"
            value={localFormData.remark}
            onChange={handleInputChange}
            placeholder="Nhập ghi chú nếu có"
            rows={3}
            disabled={isLoading}
            error={errors.remark}
          />
        </FormSection>

        {/* RIGHT COLUMN */}
        <FormSection title="Thông tin bổ sung">
          {/* Future expansion area - can add invoice details, history, etc. */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '200px',
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            Khu vực mở rộng cho các thông tin bổ sung
          </div>
        </FormSection>
      </FormSections>
    </FormModal>
  );
};

export default MaintenanceDialog;