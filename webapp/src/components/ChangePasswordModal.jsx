import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { FormContainer, FormBody, FormGroup, FormLabel, FormControl, FormActions, ErrorText } from '@/components/ui/Form';
import { authApi } from '@services/api/authApi';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
      // Dispatch custom events when modal opens
      window.dispatchEvent(new CustomEvent('profileModalOpen', { detail: { modalId: 'changePassword' } }));
      window.dispatchEvent(new CustomEvent('modalOpen', { detail: { modalId: 'changePassword' } }));
    } else {
      // Dispatch custom events when modal closes
      window.dispatchEvent(new CustomEvent('profileModalClose', { detail: { modalId: 'changePassword' } }));
      window.dispatchEvent(new CustomEvent('modalClose', { detail: { modalId: 'changePassword' } }));
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại');
      return false;
    }
    if (!formData.newPassword) {
      setError('Vui lòng nhập mật khẩu mới');
      return false;
    }
    if (formData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Xác nhận mật khẩu không khớp');
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
      const response = await authApi.changePassword(formData.currentPassword, formData.newPassword);
      
      if (response.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        }, 2000);
      } else {
        setError(response.message || 'Đổi mật khẩu thất bại');
      }
    } catch (error) {
      setError(error.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setError('');
      setSuccess(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Đổi mật khẩu"
      size="medium"
    >
      <FormContainer>
        <FormBody onSubmit={handleSubmit}>
          <FormGroup>
            <FormLabel required>Mật khẩu hiện tại</FormLabel>
            <FormControl
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Nhập mật khẩu hiện tại"
              required
              disabled={loading}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Mật khẩu mới</FormLabel>
            <FormControl
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
              required
              disabled={loading}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Xác nhận mật khẩu mới</FormLabel>
            <FormControl
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu mới"
              required
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
              Đổi mật khẩu thành công!
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
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </FormActions>
        </FormBody>
      </FormContainer>
    </Modal>
  );
};

export default ChangePasswordModal;