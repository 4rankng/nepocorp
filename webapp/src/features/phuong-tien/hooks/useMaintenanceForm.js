import { useState, useCallback } from 'react';
import { addMonths } from '../utils/maintenanceUtils';

export default function useMaintenanceForm({
  initialFormData,
  onSubmit,
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
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.licensePlate) newErrors.licensePlate = 'Vui lòng chọn biển số xe';
    if (!formData.replacementDate) newErrors.replacementDate = 'Vui lòng chọn ngày thay lốp';
    if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Số lượng phải lớn hơn 0';
    if (!formData.unitPrice || formData.unitPrice < 0) newErrors.unitPrice = 'Đơn giá không hợp lệ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async e => {
    e?.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      let ngayHetHan = formData.ngayHetHan;
      if (!ngayHetHan) {
        ngayHetHan = addMonths(formData.replacementDate, formData.warrantyPeriod);
      }
      const data = {
        ...formData,
        replacementDate: formData.replacementDate.toISOString().split('T')[0],
        ngayHetHan: ngayHetHan ? ngayHetHan.toISOString().split('T')[0] : null,
        warrantyPeriod: Number(formData.warrantyPeriod),
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        total: Number(formData.quantity) * Number(formData.unitPrice),
      };
      if (isEdit) {
        await api.update(formData.id, data);
        onSuccess && onSuccess('Sửa thông tin bảo dưỡng thành công');
      } else {
        await api.create(data);
        onSuccess && onSuccess('Thêm thông tin bảo dưỡng mới thành công');
      }
      fetchData && fetchData();
    } catch (err) {
      onError && onError(err);
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
