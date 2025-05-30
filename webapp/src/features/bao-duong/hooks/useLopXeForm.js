import { useState, useCallback } from 'react';
import { addMonths } from '../utils/baoDuongUtils';
export default function useLopXeForm({
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
  // Auto-calculate ngayHetHan when replacementDate or warrantyPeriod changes
  const updateNgayHetHan = useCallback((replacementDate, warrantyPeriod) => {
    setFormData(prev => ({
      ...prev,
      ngayHetHan: addMonths(replacementDate, warrantyPeriod),
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
    if (name === 'replacementDate' || name === 'warrantyPeriod') {
      updateNgayHetHan(
        name === 'replacementDate' ? value : formData.replacementDate,
        name === 'warrantyPeriod' ? value : formData.warrantyPeriod
      );
    }
    // Auto-calculate total when quantity or unitPrice changes
    if (name === 'quantity' || name === 'unitPrice') {
      const quantity = name === 'quantity' ? Number(value) : Number(formData.quantity);
      const unitPrice = name === 'unitPrice' ? Number(value) : Number(formData.unitPrice);
      setFormData(prev => ({
        ...prev,
        total: quantity * unitPrice,
      }));
    }
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.licensePlate) newErrors.licensePlate = 'Vui lòng chọn biển số xe';
    if (!formData.replacementDate) newErrors.replacementDate = 'Vui lòng chọn ngày thay lốp';
    if (!formData.quantity || formData.quantity <= 0)
      newErrors.quantity = 'Số lượng phải lớn hơn 0';
    if (!formData.unitPrice || formData.unitPrice < 0) newErrors.unitPrice = 'Đơn giá không hợp lệ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async e => {
    e?.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      // Calculate total before saving
      const formDataWithTotal = {
        ...formData,
        total: Number(formData.quantity) * Number(formData.unitPrice),
      };
      if (isEdit) {
        await api.update(formDataWithTotal.id, formDataWithTotal);
        onSuccess?.('Cập nhật thông tin lốp xe thành công');
      } else {
        await api.create(formDataWithTotal);
        onSuccess?.('Thêm thông tin lốp xe thành công');
      }
      fetchData?.();
    } catch (error) {
      console.error('Error saving lop xe data:', error);
      onError?.(error);
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
