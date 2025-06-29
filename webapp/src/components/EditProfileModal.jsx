import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { FormContainer, FormBody, FormGroup, FormLabel, FormControl, FormActions, ErrorText } from '@/components/ui/Form';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Handle ESC key press and dispatch modal events
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Dispatch custom event when modal opens
      window.dispatchEvent(new CustomEvent('profileModalOpen'));
    } else {
      // Dispatch custom event when modal closes
      window.dispatchEvent(new CustomEvent('profileModalClose'));
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Vui lòng nhập tên đăng nhập');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Vui lòng nhập họ tên');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Vui lòng nhập email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email không hợp lệ');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await authApi.updateProfile(formData);

      if (response.status === 'success') {
        // Update the user data in context
        updateCurrentUser(formData);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        setError(response.message || 'Cập nhật thông tin thất bại');
      }
    } catch (error) {
      setError(error.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError('');
      setSuccess(false);
      // Reset form data to current user data
      if (currentUser) {
        setFormData({
          username: currentUser.username || '',
          name: currentUser.name || '',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          address: currentUser.address || ''
        });
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Sửa thông tin cá nhân"
      size="medium"
    >
      <FormContainer>
        <FormBody onSubmit={handleSubmit}>
          <FormGroup>
            <FormLabel required>Tên đăng nhập</FormLabel>
            <FormControl
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Nhập tên đăng nhập"
              required
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
          </FormGroup>

          {error && <ErrorText>{error}</ErrorText>}

          {success && (
            <div style={{
              color: '#10b981',
              textAlign: 'center',
              fontSize: '14px',
              marginTop: '10px'
            }}>
              Cập nhật thông tin thành công!
            </div>
          )}

          <FormActions>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn btn-outline"
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#6b7280',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginRight: '10px'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: '10px 20px',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </FormActions>
        </FormBody>
      </FormContainer>
    </Modal>
  );
};

export default EditProfileModal;
