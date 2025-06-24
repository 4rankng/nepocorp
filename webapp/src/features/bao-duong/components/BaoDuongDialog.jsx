import React, { useState, useEffect } from 'react';
import {
  Modal,
  FormContainer,
  FormHeader,
  FormBody,
  FormSections,
  FormSection,
  FormGroup,
  FormRow,
  FormCol,
  FormLabel,
  FormControl,
  InputGroup,
  InputAddon,
  DateInputWrapper,
  DateIcon,
  FormActions,
  ErrorText,
  HelperText,
  PriceDisplay,
  Button
} from '@components/ui';
import './BaoDuongDialog.css';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const BaoDuongDialog = ({
  open,
  isEdit,
  isLoading,
  formData,
  errors = {},
  onClose,
  onChange,
  onSave,
  licensePlates = [],
  isLoadingPlates = false,
}) => {
  const [localData, setLocalData] = useState({});

  useEffect(() => {
    setLocalData(formData || {});
  }, [formData]);

  const handleBienSoChange = event => {
    const value = event.target.value;
    setLocalData(prev => ({ ...prev, bien_so: value }));
    onChange({
      target: {
        name: 'bien_so',
        value: value,
      },
    });
  };

  const handleInputChange = event => {
    const { name, value } = event.target;
    setLocalData(prev => ({ ...prev, [name]: value }));
    onChange(event);
  };

  const calculateExpirationDate = () => {
    const replacementDate = localData.ngay_thay;
    const warrantyMonths = parseInt(localData.so_thang_bao_hanh) || 0;

    if (replacementDate && warrantyMonths > 0) {
      const date = new Date(replacementDate);
      date.setMonth(date.getMonth() + warrantyMonths);
      const expirationDate = date.toISOString().split('T')[0];

      setLocalData(prev => ({ ...prev, ngay_het_han: expirationDate }));
      onChange({
        target: {
          name: 'ngay_het_han',
          value: expirationDate,
        },
      });
    }
  };

  const calculateTotal = () => {
    const quantity = parseInt(localData.so_luong) || 0;
    const unitPrice = parseInt(localData.don_gia) || 0;
    const taxRate = parseFloat(localData.thue) || 0;
    
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    setLocalData(prev => ({ ...prev, tong_tien: total }));
    onChange({
      target: {
        name: 'tong_tien',
        value: total,
      },
    });
  };

  useEffect(() => {
    calculateExpirationDate();
  }, [localData.ngay_thay, localData.so_thang_bao_hanh]);

  useEffect(() => {
    calculateTotal();
  }, [localData.so_luong, localData.don_gia, localData.thue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
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
      size="fullWidth"
      showCloseButton={false}
      className="bao-duong-modal"
    >
      <FormContainer>
        <FormHeader
          title={isEdit ? 'Sửa thông tin bảo dưỡng' : 'Nhập thông tin bảo dưỡng'}
        />

        <FormBody onSubmit={handleSubmit}>
          <FormSections columns={2}>
            {/* Basic Information Section */}
            <FormSection title="Thông tin cơ bản">
              <FormGroup>
                <FormLabel required>Biển số xe</FormLabel>
                <FormControl
                  type="select"
                  value={localData.bien_so || ''}
                  onChange={handleBienSoChange}
                  disabled={isLoadingPlates}
                  error={!!errors.bien_so}
                  required
                >
                  <option value="">
                    {isLoadingPlates ? 'Đang tải danh sách biển số...' : 'Chọn biển số xe'}
                  </option>
                  {licensePlates.map(plate => (
                    <option key={plate.value} value={plate.value}>
                      {plate.value} ({plate.type})
                    </option>
                  ))}
                </FormControl>
                {errors.bien_so && <ErrorText>{errors.bien_so}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <FormLabel required>Hạng mục</FormLabel>
                <FormControl
                  name="item_name"
                  placeholder="Nhập hạng mục bảo dưỡng"
                  value={localData.item_name || ''}
                  onChange={handleInputChange}
                  error={!!errors.item_name}
                  required
                />
                {errors.item_name && <ErrorText>{errors.item_name}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <FormLabel required>Ngày thay thế</FormLabel>
                <DateInputWrapper>
                  <DateIcon />
                  <FormControl
                    type="date"
                    name="ngay_thay"
                    value={localData.ngay_thay || ''}
                    onChange={handleInputChange}
                    error={!!errors.ngay_thay}
                    className="date-input"
                    required
                  />
                </DateInputWrapper>
                {errors.ngay_thay && <ErrorText>{errors.ngay_thay}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <FormLabel required>Thời hạn bảo hành (tháng)</FormLabel>
                <InputGroup>
                  <FormControl
                    type="number"
                    name="so_thang_bao_hanh"
                    placeholder="0"
                    min="0"
                    value={localData.so_thang_bao_hanh || ''}
                    onChange={handleInputChange}
                    error={!!errors.so_thang_bao_hanh}
                    required
                  />
                  <InputAddon>tháng</InputAddon>
                </InputGroup>
                {errors.so_thang_bao_hanh && <ErrorText>{errors.so_thang_bao_hanh}</ErrorText>}
              </FormGroup>

              <FormGroup>
                <FormLabel>Ngày hết hạn (tự động tính)</FormLabel>
                <DateInputWrapper>
                  <DateIcon />
                  <FormControl
                    type="date"
                    value={localData.ngay_het_han || ''}
                    className="date-input"
                    disabled
                    style={{background: '#f9fafb'}}
                  />
                </DateInputWrapper>
              </FormGroup>
            </FormSection>

            {/* Cost & Notes Section */}
            <FormSection title="Chi phí & Ghi chú">
              {/* Row 1: Số lượng & Đơn giá */}
              <FormRow>
                <FormCol>
                  <FormLabel required>Số lượng</FormLabel>
                  <FormControl
                    type="number"
                    name="so_luong"
                    value={localData.so_luong || '1'}
                    min="1"
                    onChange={handleInputChange}
                    error={!!errors.so_luong}
                    required
                  />
                  {errors.so_luong && <ErrorText>{errors.so_luong}</ErrorText>}
                </FormCol>

                <FormCol>
                  <FormLabel required>Đơn giá</FormLabel>
                  <InputGroup>
                    <FormControl
                      type="number"
                      name="don_gia"
                      placeholder="0"
                      min="0"
                      value={localData.don_gia || ''}
                      onChange={handleInputChange}
                      error={!!errors.don_gia}
                      className="currency-input"
                      required
                    />
                    <InputAddon>VND</InputAddon>
                  </InputGroup>
                  {errors.don_gia && <ErrorText>{errors.don_gia}</ErrorText>}
                </FormCol>
              </FormRow>

              {/* Row 2: Thuế (%) & Tổng tiền */}
              <FormRow>
                <FormCol>
                  <FormLabel>Thuế (%)</FormLabel>
                  <InputGroup>
                    <FormControl
                      type="number"
                      name="thue"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.01"
                      value={localData.thue || ''}
                      onChange={handleInputChange}
                      error={!!errors.thue}
                    />
                    <InputAddon>%</InputAddon>
                  </InputGroup>
                  {errors.thue && <ErrorText>{errors.thue}</ErrorText>}
                </FormCol>

                <FormCol>
                  <FormLabel>Tổng tiền</FormLabel>
                  <PriceDisplay
                    value={localData.tong_tien ? formatCurrency(localData.tong_tien) : '0 VND'}
                  />
                  <HelperText>Tự động tính = (Số lượng × Đơn giá) + Thuế</HelperText>
                </FormCol>
              </FormRow>

              <FormGroup>
                <FormLabel>Ghi chú</FormLabel>
                <FormControl
                  type="textarea"
                  name="ghi_chu"
                  placeholder="Nhập ghi chú nếu có"
                  value={localData.ghi_chu || ''}
                  onChange={handleInputChange}
                  error={!!errors.ghi_chu}
                  rows={3}
                />
                {errors.ghi_chu && <ErrorText>{errors.ghi_chu}</ErrorText>}
              </FormGroup>
            </FormSection>
          </FormSections>

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
              disabled={isLoading}
            >
              {isEdit ? 'Sửa' : 'Thêm'}
            </Button>
          </FormActions>
        </FormBody>
      </FormContainer>
    </Modal>
  );
};

export default BaoDuongDialog;
