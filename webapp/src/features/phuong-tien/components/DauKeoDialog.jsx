import React, { useEffect } from 'react';
import {
  Modal,
  FormContainer,
  FormHeader,
  FormBody,
  FormSection,
  FormGroup,
  FormLabel,
  FormControl,
  FormActions,
  ErrorText,
  Button,
} from '@components/ui';
const DauKeoDialog = ({ open, edit, data, setData, onClose, onSave, isLoading = false }) => {
  const handleSave = e => {
    e.preventDefault();
    onSave(data);
  };

  const handleFieldChange = (field, value) => {
    setData({
      ...data,
      [field]: value,
    });
  };

  const handleCancel = () => {
    onClose();
  };

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <Modal isOpen={open} onClose={onClose} size="medium" showCloseButton={false}>
      <FormContainer>
        <FormHeader title={edit ? 'Chỉnh sửa đầu kéo' : 'Thêm đầu kéo mới'} />

        <FormBody onSubmit={handleSave}>
          <FormSection>
            <FormGroup>
              <FormLabel required>Biển số xe</FormLabel>
              <FormControl
                type="text"
                value={data?.license_plate || ''}
                onChange={e => handleFieldChange('license_plate', e.target.value)}
                placeholder="Ví dụ: 29A-12345"
                error={!data?.license_plate}
                required
                autoFocus
              />
              {!data?.license_plate && <ErrorText>Vui lòng nhập biển số xe</ErrorText>}
            </FormGroup>

            <FormGroup>
              <FormLabel>Mô tả</FormLabel>
              <FormControl
                type="textarea"
                value={data?.description || ''}
                onChange={e => handleFieldChange('description', e.target.value)}
                placeholder="Mô tả về đầu kéo..."
                rows={3}
              />
            </FormGroup>
          </FormSection>

          <FormActions>
            <Button variant="secondary" onClick={handleCancel} disabled={isLoading}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={isLoading || !data?.license_plate}
            >
              {edit ? 'Sửa' : 'Thêm'}
            </Button>
          </FormActions>
        </FormBody>
      </FormContainer>
    </Modal>
  );
};
export default DauKeoDialog;
