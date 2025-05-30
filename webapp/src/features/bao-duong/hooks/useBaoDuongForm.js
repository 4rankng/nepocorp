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
