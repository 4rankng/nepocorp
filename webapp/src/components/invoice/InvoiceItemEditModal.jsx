import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormModal } from '@/components/ui';
import {
  TextField,
  NumberField,
  DateField,
  PercentageField,
  CurrencyDisplay,
} from '@/components/ui/FieldComponents';
import { FormActionButtons } from '@/components/ui/ActionButtons';
import { FormRow, FormSection } from '@/components/ui';
import EditIcon from '@mui/icons-material/Edit';
import LicensePlateSelectionModal from '../LicensePlateSelectionModal';

const calculateInvoiceItemTotal = item => {
  const price = parseFloat(item.price) || 0;
  const quantity = parseFloat(item.quantity) || 0;
  const taxRate = parseFloat(item.tax_rate) || 0;
  const subtotal = price * quantity;
  const taxAmount = (subtotal * taxRate) / 100;
  return subtotal + taxAmount;
};

const InvoiceItemEditModal = ({
  isOpen,
  onClose,
  onSave,
  item = null,
  isEdit = false,
  licensePlates = [],
  isLoadingPlates = false,
  errors = {},
  taxRate = 10,
}) => {
  // Modal state
  const [formData, setFormData] = useState({
    license_plate: '',
    item_name: '',
    service_date: null,
    notes: '',
    price: 0,
    quantity: 1,
    tax_rate: taxRate,
    total: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  // Initialize form data when modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      if (isEdit && item) {
        setFormData({
          license_plate: item.license_plate || '',
          item_name: item.item_name || '',
          service_date: item.service_date ? item.service_date.split('T')[0] : null,
          notes: item.notes || '',
          price: item.price || 0,
          quantity: item.quantity || 1,
          tax_rate: item.tax_rate || taxRate,
          total: item.total || 0,
        });
      } else {
        // New item
        setFormData({
          license_plate: '',
          item_name: '',
          service_date: null,
          notes: '',
          price: 0,
          quantity: 1,
          tax_rate: taxRate,
          total: 0,
        });
      }
      setLocalErrors({});
    }
  }, [isOpen, isEdit, item, taxRate]);

  // Calculate total when price, quantity, or tax rate changes
  useEffect(() => {
    const calculatedTotal = calculateInvoiceItemTotal(formData);
    if (calculatedTotal !== formData.total) {
      setFormData(prev => ({ ...prev, total: calculatedTotal }));
    }
  }, [formData.price, formData.quantity, formData.tax_rate]);

  // Handle field changes
  const handleFieldChange = useCallback(
    (field, value) => {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      if (localErrors[field] || errors[field]) {
        setLocalErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [localErrors, errors]
  );

  // Handle license plate selection
  const handleLicensePlateClick = useCallback(() => {
    setShowLicensePlateModal(true);
  }, []);

  const handleLicensePlateSelect = useCallback(
    selectedPlate => {
      handleFieldChange('license_plate', selectedPlate);
      setShowLicensePlateModal(false);
    },
    [handleFieldChange]
  );

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.license_plate?.trim()) {
      newErrors.license_plate = 'Vui lòng chọn biển số xe';
    }

    if (!formData.item_name?.trim()) {
      newErrors.item_name = 'Vui lòng nhập tên dịch vụ';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Đơn giá không hợp lệ';
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Số lượng phải lớn hơn 0';
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async e => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSave(formData);
        onClose();
      } catch (error) {
        console.error('Error saving invoice item:', error);
        // Handle error - could set error state here
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateForm, onSave, onClose]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    setFormData({
      license_plate: '',
      item_name: '',
      service_date: null,
      notes: '',
      price: 0,
      quantity: 1,
      tax_rate: taxRate,
      total: 0,
    });
    setLocalErrors({});
    onClose();
  }, [onClose, taxRate]);

  // Custom ESC key handler that prevents event bubbling
  useEffect(() => {
    const handleEscKey = event => {
      if (event.key === 'Escape' && isOpen && !showLicensePlateModal) {
        event.stopPropagation(); // Prevent bubbling to parent modal
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true); // Use capture phase
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isOpen, showLicensePlateModal, handleCancel]);

  // Merge local and prop errors
  const allErrors = { ...errors, ...localErrors };

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onClose={handleCancel}
        title={isEdit ? 'Sửa dịch vụ' : 'Thêm dịch vụ mới'}
        onSubmit={handleSubmit}
        size="medium"
        loading={isSubmitting}
        enableEscClose={false}
        actions={
          <FormActionButtons
            onCancel={handleCancel}
            onSubmit={handleSubmit}
            isEdit={isEdit}
            loading={isSubmitting}
            cancelText="Hủy"
            submitText={isEdit ? 'Lưu' : 'Thêm dịch vụ'}
          />
        }
      >
        <FormSection title="Thông tin cơ bản">
          <FormRow>
            {/* License Plate Selection */}
            <div className="form-col">
              <label className="form-label required">Biển số xe</label>
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded border border-gray-300"
                onClick={handleLicensePlateClick}
                style={{ minHeight: '43px' }}
              >
                <span>
                  {formData.license_plate || <span className="text-gray-400">Chọn biển số xe</span>}
                </span>
                <EditIcon sx={{ fontSize: 16, color: '#6b7280' }} />
              </div>
              {allErrors.license_plate && (
                <div className="text-red-500 text-sm mt-1">{allErrors.license_plate}</div>
              )}
            </div>

            <TextField
              label="Tên dịch vụ"
              name="item_name"
              value={formData.item_name}
              onChange={e => handleFieldChange('item_name', e.target.value)}
              placeholder="Nhập tên dịch vụ"
              required
              error={allErrors.item_name}
            />
          </FormRow>

          <FormRow>
            <DateField
              label="Ngày thực hiện"
              name="service_date"
              value={formData.service_date}
              onChange={e => handleFieldChange('service_date', e.target.value)}
            />

            <TextField
              label="Ghi chú"
              name="notes"
              value={formData.notes}
              onChange={e => handleFieldChange('notes', e.target.value)}
              placeholder="Nhập ghi chú"
            />
          </FormRow>
        </FormSection>

        <FormSection title="Thông tin giá cả">
          <FormRow>
            <NumberField
              label="Đơn giá"
              name="price"
              value={formData.price}
              onChange={e => handleFieldChange('price', e.target.value)}
              min={0}
              placeholder="Nhập đơn giá"
              required
              showCurrency
              error={allErrors.price}
              helperText="Đơn giá cho mỗi đơn vị"
            />

            <NumberField
              label="Số lượng"
              name="quantity"
              value={formData.quantity}
              onChange={e => handleFieldChange('quantity', e.target.value)}
              min={1}
              step={1}
              required
              error={allErrors.quantity}
            />
          </FormRow>

          <FormRow>
            <PercentageField
              label="Thuế"
              name="tax_rate"
              value={formData.tax_rate}
              onChange={e => handleFieldChange('tax_rate', e.target.value)}
              min={0}
              max={100}
              step={0.1}
              helperText="Tỷ lệ thuế áp dụng"
            />

            <CurrencyDisplay
              label="Thành tiền"
              value={formData.total}
              helperText="Tổng tiền bao gồm thuế"
            />
          </FormRow>
        </FormSection>
      </FormModal>

      {/* License Plate Selection Modal */}
      {showLicensePlateModal && (
        <LicensePlateSelectionModal
          open={showLicensePlateModal}
          onClose={() => setShowLicensePlateModal(false)}
          onSelect={handleLicensePlateSelect}
          licensePlates={licensePlates}
          isLoading={isLoadingPlates}
        />
      )}
    </>
  );
};

InvoiceItemEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  item: PropTypes.object,
  isEdit: PropTypes.bool,
  licensePlates: PropTypes.array,
  isLoadingPlates: PropTypes.bool,
  errors: PropTypes.object,
  taxRate: PropTypes.number,
};

export default InvoiceItemEditModal;
