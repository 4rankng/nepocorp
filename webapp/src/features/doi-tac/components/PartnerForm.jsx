import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormModal } from '@/components/ui';
import {
  TextField,
} from '@/components/ui/FieldComponents';
import { FormActionButtons } from '@/components/ui/ActionButtons';
import { FormRow, FormSection } from '@/components/ui';

const initialFormState = {
  ten: '',
  ma_so_thue: '',
  dia_chi: '',
  contact_person: '',
  contact_phone: '',
  contact_email: '',
  notes: '',
};

const PartnerForm = ({
  open,
  onClose,
  onSave,
  partner = null,
  onGetInitialData = null,
  isLoading = false,
  error = '',
}) => {
  // Modal state
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  // Determine if this is an edit operation
  const isEdit = !!partner;

  // Initialize form data when modal opens or partner changes
  useEffect(() => {
    if (open) {
      if (isEdit && partner) {
        setFormData({
          ten: partner.ten || '',
          ma_so_thue: partner.ma_so_thue || '',
          dia_chi: partner.dia_chi || '',
          contact_person: partner.contact_person || '',
          contact_phone: partner.contact_phone || '',
          contact_email: partner.contact_email || '',
          notes: partner.notes || '',
        });
      } else {
        // New partner
        const initialData = onGetInitialData ? onGetInitialData() : initialFormState;
        setFormData(initialData);
      }
      setLocalErrors({});
    }
  }, [open, isEdit, partner, onGetInitialData]);

  // Handle field changes
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (localErrors[field]) {
      setLocalErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [localErrors]);

  // Validation
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.ten?.trim()) {
      newErrors.ten = 'Vui lòng nhập tên đối tác';
    }

    if (!formData.ma_so_thue?.trim()) {
      newErrors.ma_so_thue = 'Vui lòng nhập mã số thuế';
    }

    // Email validation if provided
    if (formData.contact_email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contact_email.trim())) {
        newErrors.contact_email = 'Email không hợp lệ';
      }
    }

    // Phone validation if provided
    if (formData.contact_phone?.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.contact_phone.trim()) || formData.contact_phone.trim().length < 10) {
        newErrors.contact_phone = 'Số điện thoại không hợp lệ';
      }
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean the data before sending
      const cleanedData = {
        ...formData,
        ten: formData.ten.trim(),
        ma_so_thue: formData.ma_so_thue.trim(),
        dia_chi: formData.dia_chi?.trim() || '',
        contact_person: formData.contact_person?.trim() || '',
        contact_phone: formData.contact_phone?.trim() || '',
        contact_email: formData.contact_email?.trim() || '',
        notes: formData.notes?.trim() || '',
      };

      await onSave(cleanedData);
      onClose();
    } catch (error) {
      console.error('Error saving partner:', error);
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSave, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setFormData(initialFormState);
    setLocalErrors({});
    onClose();
  }, [onClose]);

  // Custom ESC key handler that prevents event bubbling
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation(); // Prevent bubbling to parent modal
        handleCancel();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey, true); // Use capture phase
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [open, handleCancel]);

  // Merge external and local errors
  const allErrors = { ...localErrors };
  if (error) {
    allErrors.general = error;
  }

  return (
    <FormModal
      isOpen={open}
      onClose={handleCancel}
      title={isEdit ? 'Sửa thông tin đối tác' : 'Thêm đối tác mới'}
      onSubmit={handleSubmit}
      size="medium"
      loading={isSubmitting || isLoading}
      enableEscClose={false}
      actions={
        <div style={{ margin: 0, padding: '12px 20px' }}>
          <FormActionButtons
            onCancel={handleCancel}
            onSubmit={handleSubmit}
            isEdit={isEdit}
            loading={isSubmitting || isLoading}
            cancelText="Hủy"
            submitText={isEdit ? 'Lưu' : 'Thêm đối tác'}
          />
        </div>
      }
    >
      <FormSection title="Thông tin cơ bản">
        <FormRow>
          <TextField
            label="Tên đối tác"
            name="ten"
            value={formData.ten}
            onChange={(e) => handleFieldChange('ten', e.target.value)}
            placeholder="Nhập tên đối tác"
            required
            error={allErrors.ten}
          />

          <TextField
            label="Mã số thuế"
            name="ma_so_thue"
            value={formData.ma_so_thue}
            onChange={(e) => handleFieldChange('ma_so_thue', e.target.value)}
            placeholder="Nhập mã số thuế"
            required
            error={allErrors.ma_so_thue}
          />
        </FormRow>

        <FormRow>
          <TextField
            label="Địa chỉ"
            name="dia_chi"
            value={formData.dia_chi}
            onChange={(e) => handleFieldChange('dia_chi', e.target.value)}
            placeholder="Nhập địa chỉ đối tác"
            multiline
            rows={3}
          />

          <TextField
            label="Ghi chú"
            name="notes"
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Nhập ghi chú về đối tác"
            multiline
            rows={3}
          />
        </FormRow>
      </FormSection>

      <FormSection title="Thông tin liên hệ">
        <FormRow>
          <TextField
            label="Người liên hệ"
            name="contact_person"
            value={formData.contact_person}
            onChange={(e) => handleFieldChange('contact_person', e.target.value)}
            placeholder="Nhập tên người liên hệ"
          />

          <TextField
            label="Số điện thoại"
            name="contact_phone"
            value={formData.contact_phone}
            onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
            placeholder="Nhập số điện thoại"
            error={allErrors.contact_phone}
          />
        </FormRow>

        <FormRow>
          <TextField
            label="Email"
            name="contact_email"
            value={formData.contact_email}
            onChange={(e) => handleFieldChange('contact_email', e.target.value)}
            placeholder="Nhập địa chỉ email"
            type="email"
            error={allErrors.contact_email}
            fullWidth
          />
        </FormRow>
      </FormSection>


      {allErrors.general && (
        <div className="text-red-500 text-sm mt-4 p-3 bg-red-50 rounded-md border border-red-200">
          {allErrors.general}
        </div>
      )}
    </FormModal>
  );
};

PartnerForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  partner: PropTypes.object,
  onGetInitialData: PropTypes.func,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
};

export default PartnerForm;
