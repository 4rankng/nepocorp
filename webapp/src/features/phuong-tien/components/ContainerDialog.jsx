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
  HelperText,
  Button
} from '@components/ui';
const CONTAINER_TYPES = [
  '20ft Container',
  '40ft Container',
  '40ft HC Container',
  'Tank Container',
  'Open Top Container',
  'Flat Rack Container',
  'Refrigerated Container',
];
const ContainerDialog = ({ open, edit, data, setData, onClose, onSave, isLoading = false }) => {
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
          title={edit ? 'Chỉnh sửa loại container' : 'Thêm loại container mới'}
        />
        
        <FormBody onSubmit={handleSave}>
          <FormSection>
            <FormGroup>
              <FormLabel required>Loại container</FormLabel>
              <FormControl
                type="select"
                value={data?.category || ''}
                onChange={e => handleFieldChange('category', e.target.value)}
                error={!data?.category}
                required
                autoFocus
              >
                <option value="">Chọn loại container</option>
                {CONTAINER_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </FormControl>
              {!data?.category && <ErrorText>Vui lòng chọn loại container</ErrorText>}
            </FormGroup>
            
            <FormGroup>
              <FormLabel>Hoặc nhập loại khác</FormLabel>
              <FormControl
                type="text"
                value={
                  data?.category && !CONTAINER_TYPES.includes(data.category) ? data.category : ''
                }
                onChange={e => handleFieldChange('category', e.target.value)}
                placeholder="Nhập loại container tùy chỉnh..."
              />
              <HelperText>Nếu loại container không có trong danh sách trên</HelperText>
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
              disabled={isLoading || !data?.category}
            >
              {edit ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </FormActions>
        </FormBody>
      </FormContainer>
    </Modal>
  );
};
export default ContainerDialog;
