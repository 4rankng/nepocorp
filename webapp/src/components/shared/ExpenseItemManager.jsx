import React from 'react';
import {
  FormGroup,
  FormRow,
  FormCol,
  FormLabel,
  FormControl,
  ErrorText,
  Button
} from '@components/ui';

const ExpenseItemManager = ({
  items = [],
  onChange,
  errors = {},
  showInstallExpiry = true, // Option to show/hide install and expiry date fields
}) => {
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate expiry date when install_date changes (if enabled)
    if (field === 'install_date' && value && showInstallExpiry) {
      const installDate = new Date(value);
      installDate.setFullYear(installDate.getFullYear() + 1); // Default 1 year warranty
      newItems[index].expiry_date = installDate.toISOString().split('T')[0];
    }

    onChange(newItems);
  };

  const handleAddItem = () => {
    const newItems = [...items, {
      item_name: '',
      price: '',
      quantity: '',
      install_date: '',
      expiry_date: ''
    }];
    onChange(newItems);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
    }
  };

  const formatCurrency = (value) => {
    if (!value || isNaN(value)) return '';
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const calculateItemTotal = (item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return price * quantity;
  };

  return (
    <div>
      {/* Dynamic item rows with scrolling */}
      <div style={{maxHeight: '400px', overflowY: 'auto', paddingRight: '8px'}}>
        {items.map((item, index) => {
          const itemTotal = calculateItemTotal(item);
          
          return (
            <div 
              key={index} 
              style={{
                marginBottom: '1rem', 
                padding: '1rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem',
                backgroundColor: '#fafafa'
              }}
            >
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
                  {items.length > 1 && (
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

              {/* Item total display */}
              {(item.price && item.quantity) && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '0.25rem',
                  textAlign: 'right'
                }}>
                  <strong>Thành tiền: {formatCurrency(itemTotal)} VND</strong>
                </div>
              )}

              {showInstallExpiry && (
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
              )}
            </div>
          );
        })}
      </div>
      
      {errors.items && <ErrorText>{errors.items}</ErrorText>}

      {/* Add new item button */}
      <Button
        type="button"
        variant="secondary"
        onClick={handleAddItem}
        style={{marginTop: '1rem', width: '100%'}}
      >
        + Thêm hạng mục
      </Button>
    </div>
  );
};

export default ExpenseItemManager;