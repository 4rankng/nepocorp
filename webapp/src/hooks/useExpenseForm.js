import { useState, useCallback, useContext } from 'react';
import logger from '@services/logger';
import { VehicleDataContext } from '@contexts/VehicleDataContext';

// Utility function to convert license plate to tractor_id/trailer_id
const convertLicensePlateToIds = (licensePlate, tractors, trailers) => {
  if (!licensePlate) return { tractor_id: null, trailer_id: null };
  
  const tractor = tractors.find(t => t.license_plate === licensePlate);
  if (tractor) {
    return { tractor_id: tractor.id, trailer_id: null };
  }
  
  const trailer = trailers.find(t => t.license_plate === licensePlate);
  if (trailer) {
    return { tractor_id: null, trailer_id: trailer.id };
  }
  
  return { tractor_id: null, trailer_id: null };
};

// Utility function to transform form data to expense API format
const transformToExpenseFormat = (formData, vehicleIds, expenseCategoryId) => {
  // Calculate totals
  const subtotal = formData.items?.reduce((sum, item) => {
    return sum + (parseFloat(item.price || 0) * parseInt(item.quantity || 0));
  }, 0) || 0;
  
  const taxRate = parseFloat(formData.tax_rate || 10); // Default 10%
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  
  return {
    ...vehicleIds, // tractor_id or trailer_id
    vendor_name: formData.vendor_name || '',
    expense_category_id: expenseCategoryId || formData.expense_category_id,
    subtotal: Math.round(subtotal),
    tax_rate: taxRate,
    total: Math.round(total),
    payment_status: formData.payment_status || 'DRAFT',
    payment_proof: formData.payment_proof || '',
    remark: formData.remark || '',
    currency: 'VND',
    items: formData.items?.map(item => ({
      item_name: item.item_name || '',
      price: parseInt(item.price || 0),
      quantity: parseInt(item.quantity || 1),
      total: parseInt(item.price || 0) * parseInt(item.quantity || 1),
      install_date: item.install_date ? new Date(item.install_date).toISOString() : null,
      expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString() : null,
    })) || []
  };
};

// Expense form validation
const validateExpenseForm = (formData, expenseCategoryId) => {
  const newErrors = {};
  
  // Validate main fields
  if (!formData.bien_so) newErrors.bien_so = 'Vui lòng chọn biển số xe';
  if (!formData.vendor_name) newErrors.vendor_name = 'Vui lòng nhập tên nhà cung cấp';
  
  // Validate expense category if not fixed
  if (!expenseCategoryId && !formData.expense_category_id) {
    newErrors.expense_category_id = 'Vui lòng chọn loại chi phí';
  }
  
  // payment_status has a default value of DRAFT, so it's always valid
  
  // Validate items array
  if (!formData.items || formData.items.length === 0) {
    newErrors.items = 'Vui lòng thêm ít nhất một hạng mục';
  } else {
    formData.items.forEach((item, index) => {
      if (!item.item_name) {
        newErrors[`items.${index}.item_name`] = 'Vui lòng nhập tên hạng mục';
      }
      if (!item.price || item.price < 0) {
        newErrors[`items.${index}.price`] = 'Đơn giá không hợp lệ';
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`items.${index}.quantity`] = 'Số lượng phải lớn hơn 0';
      }
    });
  }
  
  return newErrors;
};

export default function useExpenseForm({
  initialFormData,
  onSuccess,
  onError,
  fetchData,
  isEdit,
  api,
  expenseCategoryId = null, // Fixed category (like BaoDuong = 1)
}) {
  const { tractors, trailers } = useContext(VehicleDataContext);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = useCallback(() => {
    const newErrors = validateExpenseForm(formData, expenseCategoryId);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, expenseCategoryId]);

  const handleSave = async (e, currentPage = 0, pageSize = 10) => {
    e?.preventDefault();
    
    try {
      // Validate form
      const isValid = validateForm();
      if (!isValid) {
        const validationError = new Error('Vui lòng kiểm tra lại thông tin nhập vào');
        validationError.validationError = true;
        throw validationError;
      }
      
      setIsLoading(true);
      
      // Convert license plate to tractor_id/trailer_id
      const vehicleIds = convertLicensePlateToIds(formData.bien_so, tractors, trailers);
      
      // If license plate not found, throw error (should not happen if dropdown and validation use same data)
      if (!vehicleIds.tractor_id && !vehicleIds.trailer_id) {
        logger.error(`License plate ${formData.bien_so} not found in VehicleDataContext`, { 
          tractorCount: tractors.length, 
          trailerCount: trailers.length,
          bien_so: formData.bien_so
        });
        throw new Error(`Không tìm thấy xe với biển số: ${formData.bien_so}`);
      }
      
      // Transform data to expense API format
      const submissionData = transformToExpenseFormat(formData, vehicleIds, expenseCategoryId);
      
      // Call the appropriate API method
      let response;
      if (isEdit) {
        response = await api.update(formData.id, submissionData);
        
        // Check for API error responses
        if (response?.status !== 'success') {
          let errorMessage = 'Cập nhật thất bại';
          if (response?.message && response?.errors?.message) {
            errorMessage = `${response.message}: ${response.errors.message}`;
          } else if (response?.message) {
            errorMessage = response.message;
          } else if (response?.error?.message) {
            errorMessage = response.error.message;
          }
          
          const error = new Error(errorMessage);
          error.response = response;
          error.validationError = response?.error?.code === 'VALIDATION_ERROR' || response?.errors?.code === 4001;
          throw error;
        }
        
        onSuccess?.(response?.message || 'Cập nhật chi phí thành công');
      } else {
        response = await api.create(submissionData);
        
        // Check for API error responses
        if (response?.status !== 'success') {
          let errorMessage = 'Tạo mới thất bại';
          if (response?.message && response?.errors?.message) {
            errorMessage = `${response.message}: ${response.errors.message}`;
          } else if (response?.message) {
            errorMessage = response.message;
          } else if (response?.error?.message) {
            errorMessage = response.error.message;
          }
          
          const error = new Error(errorMessage);
          error.response = response;
          error.validationError = response?.error?.code === 'VALIDATION_ERROR' || response?.errors?.code === 4001;
          throw error;
        }
        
        onSuccess?.(response?.message || 'Thêm chi phí thành công');
      }
      
      // Refresh data if fetchData is provided
      if (fetchData) {
        try {
          await fetchData(currentPage, pageSize);
        } catch (error) {
          logger.error('Error refreshing data', { error });
          // Try fallback to first page
          try {
            await fetchData(0, pageSize);
          } catch (fallbackError) {
            logger.error('Fallback error', { error: fallbackError });
            throw fallbackError;
          }
        }
      }
      
      return response;
    } catch (error) {
      // Extract and format error message from API response
      let errorMessage = 'Đã xảy ra lỗi khi lưu dữ liệu';
      
      // Handle new backend error format: message + errors.message
      if (error?.response?.message && error?.response?.errors?.message) {
        errorMessage = `${error.response.message}: ${error.response.errors.message}`;
      } else if (error?.response?.message) {
        errorMessage = error.response.message;
      } else if (error?.response?.error?.message) {
        errorMessage = error.response.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      // Update form errors if available in the API response
      if (error?.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error?.response?.error?.details) {
        // Handle validation errors from API
        const apiErrors = {};
        Object.entries(error.response.error.details).forEach(([field, message]) => {
          apiErrors[field] = Array.isArray(message) ? message[0] : message;
        });
        setErrors(apiErrors);
      }
      
      // Call onError if provided
      if (onError) {
        onError({
          ...error,
          message: errorMessage,
          isValidationError: error.validationError === true,
        });
      }
      
      // Re-throw the error with additional context
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      enhancedError.isValidationError = error.validationError === true;
      throw enhancedError;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    isLoading,
    setIsLoading,
    handleInputChange,
    validateForm,
    handleSave,
  };
}