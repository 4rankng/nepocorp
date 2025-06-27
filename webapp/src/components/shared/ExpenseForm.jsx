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
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';
import ExpenseItemManager from './ExpenseItemManager';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const ExpenseForm = ({
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
  expenseCategoryId = null, // If provided, category is fixed (like BaoDuong)
  title = null, // Custom title, defaults to generic expense form
}) => {
  const [localData, setLocalData] = useState({
    license_plate: '',
    vendor_name: '',
    expense_category_id: expenseCategoryId || '',
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
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    setLocalData(formData || {
      license_plate: '',
      vendor_name: '',
      expense_category_id: expenseCategoryId || '',
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
  }, [formData, expenseCategoryId]);

  // Load tax rate and expense categories on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load tax rate
        const cachedTaxRate = localStorage.getItem('taxRate');
        if (cachedTaxRate) {
          setTaxRate(parseFloat(cachedTaxRate));
        } else {
          const response = await settingsApi.getTaxRate();
          const rate = parseFloat(response.value);
          setTaxRate(rate);
          localStorage.setItem('taxRate', rate.toString());
        }

        // Load expense categories if not fixed
        if (!expenseCategoryId) {
          setIsLoadingCategories(true);
          const response = await expenseCategoryApi.getAllWithoutPagination();
          // Handle API response format - could be response.data or direct array
          const categories = response?.data || response || [];
          setExpenseCategories(Array.isArray(categories) ? categories : []);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setTaxRate(10); // Default to 10% if API fails
        setExpenseCategories([]); // Ensure it's always an array on error
      } finally {
        setIsLoadingCategories(false);
      }
    };

    if (open) {
      loadSettings();
    }
  }, [open, expenseCategoryId]);

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

  const handleLicensePlateChange = event => {
    const value = event.target.value;
    setLocalData(prev => ({ ...prev, license_plate: value }));
    onChange({
      target: {
        name: 'license_plate',
        value: value,
      },
    });
  };

  const handleInputChange = event => {
    const { name, value } = event.target;
    setLocalData(prev => ({ ...prev, [name]: value }));
    onChange(event);
  };

  const handleItemsChange = (items) => {
    setLocalData(prev => ({ ...prev, items }));
    onChange({
      target: {
        name: 'items',
        value: items,
      },
    });
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

  // Determine the form title
  const formTitle = title || (isEdit ? 'Sửa thông tin chi phí' : 'Nhập thông tin chi phí');

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="fullWidth"
      showCloseButton={false}
      className="expense-modal"
    >
      <FormContainer className="expense-form">
        <FormHeader title={formTitle} />

        <FormBody onSubmit={handleSubmit}>
          <FormSections columns={2}>
            {/* LEFT COLUMN */}
            <FormSection title="Thông tin thanh toán">
              {/* Row 1: Biển số xe + Nhà cung cấp */}
              <FormRow>
                <FormCol>
                  <FormLabel required>Biển số xe</FormLabel>
                  <FormControl
                    type="select"
                    value={localData.license_plate || ''}
                    onChange={handleLicensePlateChange}
                    disabled={isLoadingPlates}
                    error={!!errors.license_plate}
                    required
                  >
                    <option value="">
                      {isLoadingPlates ? 'Đang tải danh sách biển số...' : 'Chọn biển số xe'}
                    </option>
                    {licensePlates.map(plate => (
                      <option key={plate.value} value={plate.value}>
                        {plate.displayText || `${plate.value} (${plate.type})`}
                      </option>
                    ))}
                  </FormControl>
                  {errors.license_plate && <ErrorText>{errors.license_plate}</ErrorText>}
                </FormCol>

                <FormCol>
                  <FormLabel required>Nhà cung cấp</FormLabel>
                  <FormControl
                    name="vendor_name"
                    placeholder="Nhập tên nhà cung cấp"
                    value={localData.vendor_name || ''}
                    onChange={handleInputChange}
                    error={!!errors.vendor_name}
                    required
                  />
                  {errors.vendor_name && <ErrorText>{errors.vendor_name}</ErrorText>}
                </FormCol>
              </FormRow>

              {/* Row 2: Chi phí trước thuế + Thuế suất */}
              <FormRow>
                <FormCol>
                  <FormLabel style={{ marginBottom: '0px' }}>Chi phí trước thuế</FormLabel>
                  <PriceDisplay
                    value={formatCurrency(subtotal)}
                    style={{
                      marginTop: '0px',
                      height: '43px',
                      lineHeight: '40px',
                      padding: '0 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      backgroundColor: '#f9fafb',
                      fontSize: '1rem',
                      fontFamily: 'inherit'
                    }}
                  />

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

              {/* Row 3: Tổng tiền + Trạng thái */}
              <FormRow>
                <FormCol>
                  <FormLabel style={{ marginBottom: '0px' }}>Tổng tiền</FormLabel>
                  <PriceDisplay
                    value={formatCurrency(total)}
                    style={{
                      marginTop: '0px',
                      height: '43px',
                      lineHeight: '40px',
                      padding: '0 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      backgroundColor: '#f9fafb',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      fontFamily: 'inherit'
                    }}
                  />
                  <HelperText>Subtotal + Thuế ({formatCurrency(taxAmount)})</HelperText>
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

              {/* Category selection for generic expenses */}
              {!expenseCategoryId && (
                <FormGroup>
                  <FormLabel required>Loại chi phí</FormLabel>
                  <FormControl
                    type="select"
                    name="expense_category_id"
                    value={localData.expense_category_id || ''}
                    onChange={handleInputChange}
                    disabled={isLoadingCategories}
                    error={!!errors.expense_category_id}
                    required
                  >
                    <option value="">
                      {isLoadingCategories ? 'Đang tải danh sách...' : 'Chọn loại chi phí'}
                    </option>
                    {Array.isArray(expenseCategories) && expenseCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </FormControl>
                  {errors.expense_category_id && <ErrorText>{errors.expense_category_id}</ErrorText>}
                </FormGroup>
              )}

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
                  rows={2}
                />
                {errors.remark && <ErrorText>{errors.remark}</ErrorText>}
              </FormGroup>
            </FormSection>

            {/* RIGHT COLUMN */}
            <FormSection title="Danh sách hạng mục">
              <ExpenseItemManager
                items={localData.items || []}
                onChange={handleItemsChange}
                errors={errors}
              />
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

export default ExpenseForm;
