import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormModal } from '@/components/ui';
import {
  TextField,
} from '@/components/ui/FieldComponents';
import { FormActionButtons } from '@/components/ui/ActionButtons';
import { FormRow, FormSection } from '@/components/ui';

/**
 * Shared form component for entities with similar structure (Partners and Customers)
 * Supports different field configurations based on entity type
 */
const EntityForm = ({
  open,
  onClose,
  onSave,
  entity = null,
  onGetInitialData = null,
  isLoading = false,
  error = '',
  entityType = 'entity', // 'partner' or 'customer'
  includeContactFields = false,
  includeNotesField = false,
}) => {
  // Base fields that all entities share
  const getInitialFormState = () => ({
    name: '',
    tax_code: '',
    address: '',
    ...(includeContactFields && {
      contact_person: '',
      contact_phone: '',
      contact_email: '',
    }),
    ...(includeNotesField && {
      notes: '',
    }),
  });

  // Modal state
  const [formData, setFormData] = useState(getInitialFormState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  // Determine if this is an edit operation
  const isEdit = !!entity;

  // Entity type configuration
  const entityConfig = {
    partner: {
      title: {
        add: 'Thêm đối tác mới',
        edit: 'Sửa thông tin đối tác'
      },
      submitText: {
        add: 'Thêm',
        edit: 'Sửa'
      },
      labels: {
        name: 'Tên đối tác',
        namePlaceholder: 'Nhập tên đối tác',
        addressPlaceholder: 'Nhập địa chỉ đối tác',
        notesPlaceholder: 'Nhập ghi chú về đối tác'
      }
    },
    customer: {
      title: {
        add: 'Thêm khách hàng mới',
        edit: 'Sửa thông tin khách hàng'
      },
      submitText: {
        add: 'Thêm',
        edit: 'Sửa'
      },
      labels: {
        name: 'Tên khách hàng',
        namePlaceholder: 'Nhập tên khách hàng',
        addressPlaceholder: 'Nhập địa chỉ khách hàng',
        notesPlaceholder: 'Nhập ghi chú về khách hàng'
      }
    }
  };

  const config = entityConfig[entityType] || entityConfig.entity;

  // Initialize form data when modal opens or entity changes
  useEffect(() => {
    if (open) {
      if (isEdit && entity) {
        setFormData({
          name: entity.name || '',
          tax_code: entity.tax_code || '',
          address: entity.address || '',
          contact_person: entity.contact_person || '',
          contact_phone: entity.contact_phone || '',
          contact_email: entity.contact_email || '',
          notes: entity.notes || '',
        });
      } else {
        // New entity
        const initialData = onGetInitialData ? onGetInitialData() : getInitialFormState();
        setFormData({ ...getInitialFormState(), ...initialData });
      }
      setLocalErrors({});
    }
  }, [open, isEdit, entity, onGetInitialData, includeContactFields, includeNotesField]);

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

    if (!formData.name?.trim()) {
      newErrors.name = `Vui lòng nhập ${config.labels.name.toLowerCase()}`;
    }

    if (!formData.tax_code?.trim()) {
      newErrors.tax_code = 'Vui lòng nhập mã số thuế';
    }

    // Email validation if provided
    if (includeContactFields && formData.contact_email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contact_email.trim())) {
        newErrors.contact_email = 'Email không hợp lệ';
      }
    }

    // Phone validation if provided
    if (includeContactFields && formData.contact_phone?.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(formData.contact_phone.trim()) || formData.contact_phone.trim().length < 10) {
        newErrors.contact_phone = 'Số điện thoại không hợp lệ';
      }
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, config.labels.name, includeContactFields]);

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
        name: formData.name.trim(),
        tax_code: formData.tax_code.trim(),
        address: formData.address?.trim() || '',
        contact_person: formData.contact_person?.trim() || '',
        contact_phone: formData.contact_phone?.trim() || '',
        contact_email: formData.contact_email?.trim() || '',
        notes: formData.notes?.trim() || '',
      };

      await onSave(cleanedData);
      onClose();
    } catch (error) {
      console.error(`Error saving ${entityType}:`, error);
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSave, onClose, entityType, includeContactFields, includeNotesField]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setFormData(getInitialFormState());
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
      title={isEdit ? config.title.edit : config.title.add}
      onSubmit={handleSubmit}
      size="medium"
      loading={isSubmitting || isLoading}
      enableEscClose={false}
      actions={
        <div style={{ margin: 0, padding: 0 }}>
          <FormActionButtons
            onCancel={handleCancel}
            onSubmit={handleSubmit}
            isEdit={isEdit}
            loading={isSubmitting || isLoading}
            cancelText="Hủy"
            submitText={isEdit ? config.submitText.edit : config.submitText.add}
          />
        </div>
      }
    >
      <FormSection title="Thông tin cơ bản">
        <FormRow>
          <TextField
            label={config.labels.name}
            name="name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder={config.labels.namePlaceholder}
            required
            error={allErrors.name}
          />

          <TextField
            label="Mã số thuế"
            name="tax_code"
            value={formData.tax_code}
            onChange={(e) => handleFieldChange('tax_code', e.target.value)}
            placeholder="Nhập mã số thuế"
            required
            error={allErrors.tax_code}
          />
        </FormRow>

        <FormRow>
          <TextField
            label="Địa chỉ"
            name="address"
            value={formData.address}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder={config.labels.addressPlaceholder}
            multiline
            rows={3}
          />

          {includeNotesField && (
            <TextField
              label="Ghi chú"
              name="notes"
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder={config.labels.notesPlaceholder}
              multiline
              rows={3}
            />
          )}
        </FormRow>
      </FormSection>

      {includeContactFields && (
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
      )}

      {allErrors.general && (
        <div className="text-red-500 text-sm mt-4 p-3 bg-red-50 rounded-md border border-red-200">
          {allErrors.general}
        </div>
      )}
    </FormModal>
  );
};

EntityForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  entity: PropTypes.object,
  onGetInitialData: PropTypes.func,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  entityType: PropTypes.oneOf(['partner', 'customer']).isRequired,
  includeContactFields: PropTypes.bool,
  includeNotesField: PropTypes.bool,
};

export default EntityForm;
