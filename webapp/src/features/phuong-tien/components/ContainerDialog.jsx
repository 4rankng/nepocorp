import React, { useEffect, useState, useCallback } from 'react';
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
import { useVehicleData } from '@contexts/VehicleDataContext';
const ContainerDialog = ({ open, edit, data, setData, onClose, onSave, isLoading = false }) => {
  const { checkContainerExists, fetchContainers } = useVehicleData();
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
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

  const validateContainerName = useCallback((name) => {
    if (!name || !name.trim()) {
      setValidationError('');
      setShowDuplicateWarning(false);
      return;
    }

    const exists = checkContainerExists(name);
    if (exists && !edit) {
      setShowDuplicateWarning(true);
      setValidationError('');
    } else {
      setShowDuplicateWarning(false);
      setValidationError('');
    }
  }, [checkContainerExists, edit]);

  const handleInputChange = useCallback((value) => {
    setInputValue(value);
    handleFieldChange('category', value);

    // Debounced validation
    const timeoutId = setTimeout(() => {
      validateContainerName(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [handleFieldChange, validateContainerName]);

  const handleCancel = () => {
    onClose();
  };

  // Initialize input value when dialog opens
  useEffect(() => {
    if (open) {
      const currentValue = data?.category || '';
      setInputValue(currentValue);
      if (currentValue) {
        validateContainerName(currentValue);
      }
      // Fetch latest container data when dialog opens
      fetchContainers();
    } else {
      // Reset state when dialog closes
      setInputValue('');
      setValidationError('');
      setShowDuplicateWarning(false);
    }
  }, [open, data?.category, validateContainerName, fetchContainers]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
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
              <FormLabel required>Tên loại container</FormLabel>
              <FormControl
                type="text"
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                error={!data?.category || !!validationError}
                required
                autoFocus
                placeholder="Nhập tên loại container..."
              />
              {!data?.category && <ErrorText>Vui lòng nhập tên loại container</ErrorText>}
              {validationError && <ErrorText>{validationError}</ErrorText>}
              {showDuplicateWarning && (
                <HelperText style={{ color: '#ff9800' }}>
                  ⚠️ Loại container này đã tồn tại trong hệ thống
                </HelperText>
              )}
              <HelperText>
                Nhập tên loại container (ví dụ: 20ft Container, 40ft Container, Tank Container, v.v.)
              </HelperText>
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
              {edit ? 'Sửa' : (showDuplicateWarning ? 'Thêm mới (Trùng lặp)' : 'Thêm')}
            </Button>
          </FormActions>
        </FormBody>
      </FormContainer>
    </Modal>
  );
};
export default ContainerDialog;
