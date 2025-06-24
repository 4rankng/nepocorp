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
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '@constants/payment';
import { settingsApi } from '@services/api/settingsApi';
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
  const [localData, setLocalData] = useState({
    bien_so: '',
    payment_status: PAYMENT_STATUS.DRAFT,
    payment_proof: '',
    items: [{
      item_name: '',
      price: '',
      quantity: '',
      install_date: '',
      expiry_date: ''
    }],
    remark: ''
  });
  const [taxRate, setTaxRate] = useState(0);

  useEffect(() => {
    setLocalData(formData || {
      bien_so: '',
      payment_status: PAYMENT_STATUS.DRAFT,
      payment_proof: '',
      items: [{
        item_name: '',
        price: '',
        quantity: '',
        install_date: '',
        expiry_date: ''
      }],
      remark: ''
    });
  }, [formData]);

  // Load tax rate on component mount
  useEffect(() => {
    const loadTaxRate = async () => {
      try {
        const cachedTaxRate = localStorage.getItem('taxRate');
        if (cachedTaxRate) {
          setTaxRate(parseFloat(cachedTaxRate));
        } else {
          const response = await settingsApi.getTaxRate();
          const rate = parseFloat(response.value);
          setTaxRate(rate);
          localStorage.setItem('taxRate', rate.toString());
        }
      } catch (error) {
        console.error('Failed to load tax rate:', error);
        setTaxRate(10); // Default to 10% if API fails
      }
    };

    if (open) {
      loadTaxRate();
    }
  }, [open]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, onClose]);

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

  const handleItemChange = (index, field, value) => {
    const currentItems = localData.items || [];
    const newItems = [...currentItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate expiry date when install_date changes
    if (field === 'install_date' && value) {
      const installDate = new Date(value);
      installDate.setFullYear(installDate.getFullYear() + 1); // Default 1 year warranty
      newItems[index].expiry_date = installDate.toISOString().split('T')[0];
    }

    setLocalData(prev => ({ ...prev, items: newItems }));
    onChange({
      target: {
        name: 'items',
        value: newItems,
      },
    });
  };

  const handleAddItem = () => {
    const currentItems = localData.items || [];
    const newItems = [...currentItems, {
      item_name: '',
      price: '',
      quantity: '',
      install_date: '',
      expiry_date: ''
    }];
    setLocalData(prev => ({ ...prev, items: newItems }));
    onChange({
      target: {
        name: 'items',
        value: newItems,
      },
    });
  };

  const handleRemoveItem = (index) => {
    const currentItems = localData.items || [];
    if (currentItems.length > 1) {
      const newItems = currentItems.filter((_, i) => i !== index);
      setLocalData(prev => ({ ...prev, items: newItems }));
      onChange({
        target: {
          name: 'items',
          value: newItems,
        },
      });
    }
  };

  // Calculate financial totals
  const calculateTotals = () => {
    const items = localData.items || [];
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = item.quantity === '' ? 0 : parseInt(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);

    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  const handleCancel = () => {
    onClose();
  };

  const { subtotal, taxAmount, total } = calculateTotals();

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
            {/* LEFT COLUMN */}
            <FormSection title="Thông tin thanh toán">
              {/* Bien so xe and Payment status in one row */}
              <FormRow>
                <FormCol>
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
                </FormCol>

                <FormCol>
                  <FormLabel required>Trạng thái</FormLabel>
                  <FormControl
                    type="select"
                    name="payment_status"
                    value={localData.payment_status || PAYMENT_STATUS.DRAFT}
                    onChange={handleInputChange}
                    error={!!errors.payment_status}
                    required
                  >
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </FormControl>
                  {errors.payment_status && <ErrorText>{errors.payment_status}</ErrorText>}
                </FormCol>
              </FormRow>

              {/* Subtotal, Tax rate, Total in one row */}
              <FormRow>
                <FormCol>
                  <FormLabel>Chi phí trước thuế</FormLabel>
                  <PriceDisplay
                    value={formatCurrency(subtotal)}
                  />
                  <HelperText>Tự động tính dựa trên danh sách hạng mục</HelperText>
                </FormCol>

                <FormCol>
                  <FormLabel>Thuế suất (%)</FormLabel>
                  <InputGroup>
                    <FormControl
                      type="number"
                      value={taxRate}
                      disabled
                      style={{background: '#f9fafb'}}
                    />
                    <InputAddon>%</InputAddon>
                  </InputGroup>

                </FormCol>
              </FormRow>

              <FormGroup>
                <FormLabel>Tổng tiền</FormLabel>
                <PriceDisplay
                  value={formatCurrency(total)}
                  style={{fontSize: '1.25rem', fontWeight: 'bold'}}
                />
                <HelperText>Subtotal + Thuế ({formatCurrency(taxAmount)})</HelperText>
              </FormGroup>

              {/* Payment proof */}
              <FormGroup>
                <FormLabel>Chứng từ thanh toán</FormLabel>
                <FormControl
                  name="payment_proof"
                  placeholder="URL ảnh chứng từ thanh toán (ví dụ: Google Drive link)"
                  value={localData.payment_proof || ''}
                  onChange={handleInputChange}
                  error={!!errors.payment_proof}
                />
                {errors.payment_proof && <ErrorText>{errors.payment_proof}</ErrorText>}
              </FormGroup>

              {/* Remarks TextArea */}
              <FormGroup>
                <FormLabel>Ghi chú</FormLabel>
                <FormControl
                  type="textarea"
                  name="remark"
                  placeholder="Nhập ghi chú nếu có"
                  value={localData.remark || ''}
                  onChange={handleInputChange}
                  error={!!errors.remark}
                  rows={4}
                />
                {errors.remark && <ErrorText>{errors.remark}</ErrorText>}
              </FormGroup>
            </FormSection>

            {/* RIGHT COLUMN */}
            <FormSection title="Danh sách hạng mục">
              {/* Dynamic item rows with scrolling */}
              <div style={{maxHeight: '400px', overflowY: 'auto', paddingRight: '8px'}}>
                {(localData.items || []).map((item, index) => (
                  <div key={index} style={{marginBottom: '1rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem'}}>
                    <FormGroup>
                      <FormLabel required>Tên hạng mục</FormLabel>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                        <FormControl
                          placeholder="Nhập tên hạng mục"
                          value={item.item_name || ''}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          error={!!errors[`items.${index}.item_name`]}
                          required
                          style={{flex: 1}}
                        />
                        {(localData.items || []).length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="small"
                            onClick={() => handleRemoveItem(index)}
                            style={{
                              backgroundColor: '#fef2f2',
                              borderColor: '#fecaca',
                              color: '#dc2626',
                              fontSize: '12px',
                              padding: '8px 12px',
                              flexShrink: 0
                            }}
                          >
                            Xóa
                          </Button>
                        )}
                      </div>
                      {errors[`items.${index}.item_name`] && <ErrorText>{errors[`items.${index}.item_name`]}</ErrorText>}
                    </FormGroup>

                  <FormRow>
                    <FormCol>
                      <FormLabel required>Đơn giá (VND)</FormLabel>
                      <FormControl
                        type="number"
                        placeholder="0"
                        min="0"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        error={!!errors[`items.${index}.price`]}
                        required
                      />
                      {errors[`items.${index}.price`] && <ErrorText>{errors[`items.${index}.price`]}</ErrorText>}
                    </FormCol>

                    <FormCol>
                      <FormLabel required>Số lượng</FormLabel>
                      <FormControl
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        error={!!errors[`items.${index}.quantity`]}
                        required
                      />
                      {errors[`items.${index}.quantity`] && <ErrorText>{errors[`items.${index}.quantity`]}</ErrorText>}
                    </FormCol>
                  </FormRow>

                  <FormRow>
                    <FormCol>
                      <FormLabel>Ngày lắp đặt</FormLabel>
                      <FormControl
                        type="date"
                        value={item.install_date || ''}
                        onChange={(e) => handleItemChange(index, 'install_date', e.target.value)}
                        error={!!errors[`items.${index}.install_date`]}
                      />
                      {errors[`items.${index}.install_date`] && <ErrorText>{errors[`items.${index}.install_date`]}</ErrorText>}
                    </FormCol>

                    <FormCol>
                      <FormLabel>Ngày hết hạn</FormLabel>
                      <FormControl
                        type="date"
                        value={item.expiry_date || ''}
                        onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                        error={!!errors[`items.${index}.expiry_date`]}
                      />
                      {errors[`items.${index}.expiry_date`] && <ErrorText>{errors[`items.${index}.expiry_date`]}</ErrorText>}

                    </FormCol>
                  </FormRow>
                </div>
              ))}
              </div>
              {errors.items && <ErrorText>{errors.items}</ErrorText>}

              {/* Add new row button */}
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItem}
                style={{marginBottom: '1rem'}}
              >
                + Thêm hạng mục
              </Button>
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
