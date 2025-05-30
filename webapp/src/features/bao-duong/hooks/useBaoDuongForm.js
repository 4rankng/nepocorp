import { useState, useCallback } from 'react';
import { addMonths } from '../utils/baoDuongUtils';
export default function useBaoDuongForm({
  initialFormData,
  onSuccess,
  onError,
  fetchData,
  isEdit,
  api,
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  // Auto-calculate ngay_het_han when ngay_thay or so_thang_bao_hanh changes
  const updateNgayHetHan = useCallback((ngay_thay, so_thang_bao_hanh) => {
    setFormData(prev => ({
      ...prev,
      ngay_het_han: addMonths(ngay_thay, so_thang_bao_hanh),
    }));
  }, []);
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === 'ngay_thay' || name === 'so_thang_bao_hanh') {
      updateNgayHetHan(
        name === 'ngay_thay' ? value : formData.ngay_thay,
        name === 'so_thang_bao_hanh' ? value : formData.so_thang_bao_hanh
      );
    }
    // Auto-calculate tong_tien when so_luong or don_gia changes
    if (name === 'so_luong' || name === 'don_gia') {
      const so_luong = name === 'so_luong' ? Number(value) : Number(formData.so_luong || 0);
      const don_gia = name === 'don_gia' ? Number(value) : Number(formData.don_gia || 0);
      setFormData(prev => ({
        ...prev,
        tong_tien: so_luong * don_gia,
      }));
    }
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.bien_so) newErrors.bien_so = 'Vui lòng nhập biển số xe';
    if (!formData.item_name) newErrors.item_name = 'Vui lòng nhập hạng mục bảo dưỡng';
    if (!formData.ngay_thay) newErrors.ngay_thay = 'Vui lòng chọn ngày thay thế';
    if (!formData.so_luong || formData.so_luong <= 0)
      newErrors.so_luong = 'Số lượng phải lớn hơn 0';
    if (!formData.don_gia || formData.don_gia < 0)
      newErrors.don_gia = 'Đơn giá không hợp lệ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async (e) => {
    console.log('useBaoDuongForm handleSave called', { e, formData, isEdit });
    e?.preventDefault();
    
    try {
      // Validate form
      const isValid = validateForm();
      console.log('Form validation result:', isValid);
      if (!isValid) {
        console.log('Form validation failed, not submitting');
        const validationError = new Error('Vui lòng kiểm tra lại thông tin nhập vào');
        validationError.validationError = true;
        throw validationError;
      }
      
      setIsLoading(true);
      
      // Prepare data for submission
      const tong_tien = Number(formData.so_luong || 0) * Number(formData.don_gia || 0);
      const submissionData = {
        ...formData,
        bien_so: String(formData.bien_so).trim(),
        so_luong: Number(formData.so_luong) || 1,
        don_gia: Number(formData.don_gia) || 0,
        tong_tien: tong_tien,
        so_thang_bao_hanh: Number(formData.so_thang_bao_hanh) || 0,
        ngay_het_han: formData.ngay_het_han || '',
        ghi_chu: formData.ghi_chu || '',
        currency: formData.currency || 'VND'
      };
      
      console.log('Submitting form data:', submissionData);
      
      // Call the appropriate API method
      let response;
      if (isEdit) {
        console.log('Updating existing record with ID:', submissionData.id);
        response = await api.update(submissionData.id, submissionData);
        console.log('Update API response:', response);
        
        // Check for API error responses
        if (!response?.success) {
          const error = new Error(response?.error?.message || 'Cập nhật thất bại');
          error.response = response;
          error.validationError = response?.error?.code === 'VALIDATION_ERROR';
          throw error;
        }
        
        onSuccess?.(response?.message || 'Cập nhật thông tin bảo dưỡng thành công');
      } else {
        console.log('Creating new record');
        response = await api.create(submissionData);
        console.log('Create API response:', response);
        
        // Check for API error responses
        if (!response?.success) {
          const error = new Error(response?.error?.message || 'Tạo mới thất bại');
          error.response = response;
          error.validationError = response?.error?.code === 'VALIDATION_ERROR';
          throw error;
        }
        
        onSuccess?.(response?.message || 'Thêm thông tin bảo dưỡng thành công');
      }
      
      // Refresh data if fetchData is provided
      if (fetchData) {
        try {
          console.log('Refreshing data...');
          await fetchData();
          console.log('Data refresh complete');
        } catch (refreshError) {
          console.error('Error refreshing data:', refreshError);
          // Don't fail the entire operation if refresh fails
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error in handleSave:', error);
      
      // Extract and format error message from API response
      let errorMessage = 'Đã xảy ra lỗi khi lưu dữ liệu';
      
      if (error?.response?.error?.message) {
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
          isValidationError: error.validationError === true
        });
      }
      
      // Re-throw the error with additional context
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      enhancedError.isValidationError = error.validationError === true;
      throw enhancedError;
    } finally {
      console.log('Setting isLoading to false');
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
