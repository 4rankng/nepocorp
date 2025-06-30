import { useState, useEffect, useCallback } from 'react';
import logger from '@services/logger';
import { extractErrorMessage } from '@utils/errorUtils';

export default function useInvoiceForm({
  initialFormData,
  onSuccess,
  onError,
  fetchData,
  isEdit = false,
  api,
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Update form data when initialFormData changes
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  // Handle input changes
  const handleInputChange = useCallback(
    (field, value) => {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: '',
        }));
      }
    },
    [errors]
  );

  // Validate form data
  const validateForm = useCallback(data => {
    const newErrors = {};

    // Required fields validation
    if (!data.customer_id) {
      newErrors.customer_id = 'Khách hàng là bắt buộc';
    }

    if (!data.invoice_category_id) {
      newErrors.invoice_category_id = 'Loại phiếu thu là bắt buộc';
    }

    // Validate items
    if (!data.items || data.items.length === 0) {
      newErrors.items = 'Ít nhất một mục phiếu thu là bắt buộc';
    } else {
      data.items.forEach((item, index) => {
        if (!item.license_plate) {
          newErrors[`items.${index}.license_plate`] = 'Biển số xe là bắt buộc';
        }
        if (!item.item_name) {
          newErrors[`items.${index}.item_name`] = 'Tên dịch vụ là bắt buộc';
        }
        if (!item.price || parseFloat(item.price) <= 0) {
          newErrors[`items.${index}.price`] = 'Giá phải lớn hơn 0';
        }
        if (!item.quantity || parseInt(item.quantity) <= 0) {
          newErrors[`items.${index}.quantity`] = 'Số lượng phải lớn hơn 0';
        }
      });
    }

    // If status is CANCELLED, cancel_reason is required
    if (data.payment_status === 'CANCELLED' && !data.cancel_reason) {
      newErrors.cancel_reason = 'Lý do hủy là bắt buộc khi hủy phiếu thu';
    }

    return newErrors;
  }, []);

  // Transform form data to API format
  const transformFormDataToAPI = useCallback(data => {
    const transformedData = {
      customer_id: parseInt(data.customer_id),
      invoice_category_id: parseInt(data.invoice_category_id),
      payment_status: data.payment_status || 'DRAFT',
      payment_proof: data.payment_proof || '',
      remark: data.remark || '',
      cancel_reason: data.cancel_reason || '',
      items: data.items.map(item => ({
        ...(item.id && { id: item.id }),
        license_plate: item.license_plate,
        item_name: item.item_name,
        price: parseInt(item.price.replace(/[^\d]/g, '')), // Remove formatting
        quantity: parseInt(item.quantity),
        service_date: item.service_date || null,
        notes: item.notes || '',
      })),
    };

    return transformedData;
  }, []);

  // Handle form submission
  const handleSave = useCallback(async () => {
    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const apiData = transformFormDataToAPI(formData);

      let response;
      if (isEdit && formData.id) {
        response = await api.update(formData.id, apiData);
        onSuccess?.('Cập nhật phiếu thu thành công');
      } else {
        response = await api.create(apiData);
        onSuccess?.('Tạo phiếu thu thành công');
      }

      // Refresh data if fetchData is provided
      if (fetchData) {
        await fetchData();
      }

      return response;
    } catch (error) {
      logger.error('Error saving invoice', { error, formData });
      const errorMessage = extractErrorMessage(error, 'Không thể lưu phiếu thu');
      onError?.({ message: errorMessage });
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, transformFormDataToAPI, isEdit, api, onSuccess, onError, fetchData]);

  return {
    formData,
    setFormData,
    isLoading,
    errors,
    handleInputChange,
    handleSave,
    validateForm,
  };
}
