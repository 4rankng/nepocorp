import React, { useState, useEffect } from 'react';
import { EnhancedFormModal } from '@/components/ui/modals';
import { FormGroup, FormLabel, FormControl, ErrorText } from '@/components/ui/Form';
import { useAuth } from '@contexts/AuthContext';
import { authApi } from '@services/api/authApi';

const EditProfileModal = ({ isOpen, onClose }) => {
  const { currentUser, updateCurrentUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData({
        username: currentUser.username || '',
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || ''
      });
    }
  }, [isOpen, currentUser]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Form validation
  const validateForm = (data) => {
    const errors = {};

    if (!data.username?.trim()) {
      errors.username = 'Vui lòng nhập tên đăng nhập';
    } else if (data.username.length < 3) {
      errors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự';
    }

    if (!data.name?.trim()) {
      errors.name = 'Vui lòng nhập họ tên';
    }

    if (!data.email?.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.email = 'Email không hợp lệ';
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  // Handle form submission
  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      const response = await authApi.updateProfile(data);

      if (response.status === 'success') {
        // Update the user data in context
        updateCurrentUser(data);
        return response;
      } else {
        throw new Error(response.message || 'Cập nhật thông tin thất bại');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when closing
  const handleClose = () => {
    if (currentUser) {
      setFormData({
        username: currentUser.username || '',
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || ''
      });
    }
    onClose();
  };

  return (
    <EnhancedFormModal
      open={isOpen}
      onClose={handleClose}
      title="Sửa thông tin cá nhân"
      size="md"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      formData={formData}
      onValidate={validateForm}
      submitButtonText="Lưu thay đổi"
      cancelButtonText="Hủy"
      submittingText="Đang lưu..."
      successMessage="Cập nhật thông tin thành công!"
      resetOnClose={handleClose}
      id="edit-profile-modal"
    >
      <div className="space-y-4">
        <FormGroup>
          <FormLabel required>Tên đăng nhập</FormLabel>
          <FormControl
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Nhập tên đăng nhập"
            required
            disabled={isSubmitting}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel required>Họ tên</FormLabel>
          <FormControl
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Nhập họ tên"
            required
            disabled={isSubmitting}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel required>Email</FormLabel>
          <FormControl
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Nhập địa chỉ email"
            required
            disabled={isSubmitting}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>Số điện thoại</FormLabel>
          <FormControl
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Nhập số điện thoại"
            disabled={isSubmitting}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel>Địa chỉ</FormLabel>
          <FormControl
            type="textarea"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Nhập địa chỉ"
            rows={3}
            disabled={isSubmitting}
          />
        </FormGroup>
      </div>
    </EnhancedFormModal>
  );
};

export default EditProfileModal;