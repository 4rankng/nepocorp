import React from 'react';
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
  Button
} from '@components/ui';
const RoMoocDialog = ({ open, edit, data, setData, onClose, onSave, isLoading = false }) => {
  const handleSave = (e) => {
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
    if (window.confirm('Bạn có chắc chắn muốn hủy? Mọi thông tin đã nhập sẽ bị mất.')) {
      onClose();
    }
  };
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="medium"
      showCloseButton={false}
    >
      <FormContainer>
        <FormHeader
          title={edit ? 'Chỉnh sửa rơ-mooc' : 'Thêm rơ-mooc mới'}
        />
        
        <FormBody onSubmit={handleSave}>
          <FormSection>
            <FormGroup>
              <FormLabel required>Biển số rơ-mooc</FormLabel>
              <FormControl
                type="text"
                value={data?.license_plate || ''}
                onChange={e => handleFieldChange('license_plate', e.target.value)}
                placeholder="Ví dụ: 29R-12345"
                error={!data?.license_plate}
                required
                autoFocus
              />
              {!data?.license_plate && <ErrorText>Vui lòng nhập biển số rơ-mooc</ErrorText>}
            </FormGroup>
            
            <FormGroup>
              <FormLabel>Mô tả</FormLabel>
              <FormControl
                type="textarea"
                value={data?.description || ''}
                onChange={e => handleFieldChange('description', e.target.value)}
                placeholder="Mô tả về rơ-mooc..."
                rows={3}
              />
            </FormGroup>
          </FormSection>
          
          <FormActions>
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={isLoading || !data?.license_plate}
            >
              {edit ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </FormActions>
        </FormBody>
      </FormContainer>
    </Modal>
  );
};
export default RoMoocDialog;
