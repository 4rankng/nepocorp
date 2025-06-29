import React, { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from '@constants/invoice';
import { settingsApi } from '@services/api/settingsApi';
import { invoiceCategoryApi } from '@services/api/invoiceCategoryApi';
import { customerApi } from '@services/api/customerApi';
import Dropdown from '@components/ui/Dropdown';
import ConfirmDialog from '@components/ConfirmDialog';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount);
};

const InvoiceForm = ({
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
  title = null,
}) => {
  const [localData, setLocalData] = useState({
    customer_id: '',
    invoice_category_id: '',
    payment_status: INVOICE_STATUS.DRAFT,
    payment_proof: '',
    items: [{
      license_plate: '',
      item_name: '',
      price: '',
      quantity: '1',
      service_date: '',
      notes: ''
    }],
    remark: '',
    cancel_reason: ''
  });

  const [taxRate, setTaxRate] = useState(10);
  const [invoiceCategories, setInvoiceCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  useEffect(() => {
    if (formData) {
      setLocalData({
        customer_id: formData.customer_id || '',
        invoice_category_id: formData.invoice_category_id || '',
        payment_status: formData.payment_status || INVOICE_STATUS.DRAFT,
        payment_proof: formData.payment_proof || '',
        items: formData.items && formData.items.length > 0 ? formData.items.map(item => ({
          ...item,
          price: item.price?.toString() || '',
          quantity: item.quantity?.toString() || '1'
        })) : [{
          license_plate: '',
          item_name: '',
          price: '',
          quantity: '1',
          service_date: '',
          notes: ''
        }],
        remark: formData.remark || '',
        cancel_reason: formData.cancel_reason || ''
      });
    }
  }, [formData]);

  // Load data when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (!open) return;

      try {
        // Load tax rate
        const cachedTaxRate = localStorage.getItem('taxRate');
        if (cachedTaxRate) {
          setTaxRate(parseFloat(cachedTaxRate));
        } else {
          try {
            const response = await settingsApi.getByKey('tax_rate');
            const rate = parseFloat(response.data.value || 10);
            setTaxRate(rate);
            localStorage.setItem('taxRate', rate.toString());
          } catch (error) {
            console.warn('Could not load tax rate from API, using default:', error);
          }
        }

        // Load invoice categories
        setIsLoadingCategories(true);
        try {
          const categoriesResponse = await invoiceCategoryApi.getAllWithoutPagination();
          setInvoiceCategories(categoriesResponse.data || []);
        } catch (error) {
          console.error('Error loading invoice categories:', error);
        } finally {
          setIsLoadingCategories(false);
        }

        // Load customers
        setIsLoadingCustomers(true);
        try {
          const customersResponse = await customerApi.getAll();
          setCustomers(customersResponse.data || []);
        } catch (error) {
          console.error('Error loading customers:', error);
        } finally {
          setIsLoadingCustomers(false);
        }

      } catch (error) {
        console.error('Error loading form data:', error);
      }
    };

    loadData();
  }, [open]);

  // Calculate totals
  const calculateTotals = () => {
    let grandTotal = 0;
    
    const itemsWithTotals = localData.items.map(item => {
      const price = parseFloat(item.price.replace(/[^\d]/g, '')) || 0;
      const quantity = parseInt(item.quantity) || 1;
      const subtotal = price * quantity;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      grandTotal += total;
      
      return {
        ...item,
        subtotal,
        taxAmount,
        total
      };
    });

    return {
      items: itemsWithTotals,
      grandTotal
    };
  };

  const handleInputChange = (field, value) => {
    setLocalData(prev => ({
      ...prev,
      [field]: value
    }));
    onChange?.(field, value);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...localData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    setLocalData(prev => ({
      ...prev,
      items: newItems
    }));
    onChange?.('items', newItems);
  };

  const addItem = () => {
    const newItems = [
      ...localData.items,
      {
        license_plate: '',
        item_name: '',
        price: '',
        quantity: '1',
        service_date: '',
        notes: ''
      }
    ];
    setLocalData(prev => ({
      ...prev,
      items: newItems
    }));
    onChange?.('items', newItems);
  };

  const removeItem = (index) => {
    if (localData.items.length <= 1) return;
    
    const newItems = localData.items.filter((_, i) => i !== index);
    setLocalData(prev => ({
      ...prev,
      items: newItems
    }));
    onChange?.('items', newItems);
  };

  const handleSave = () => {
    // Update form data with local data before saving
    const updatedFormData = {
      ...localData,
      items: localData.items.map(item => ({
        ...item,
        price: item.price.replace(/[^\d]/g, '') // Remove formatting
      }))
    };
    
    // Update parent form data
    Object.keys(updatedFormData).forEach(key => {
      onChange?.(key, updatedFormData[key]);
    });
    
    // Call parent save handler
    onSave?.();
  };

  const { items: itemsWithTotals, grandTotal } = calculateTotals();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {title || (isEdit ? 'Sửa hóa đơn' : 'Thêm hóa đơn mới')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khách hàng <span className="text-red-500">*</span>
              </label>
              <Dropdown
                value={localData.customer_id}
                onChange={(value) => handleInputChange('customer_id', value)}
                options={customers.map(customer => ({
                  value: customer.id,
                  label: `${customer.name} (${customer.tax_code})`
                }))}
                placeholder="Chọn khách hàng"
                loading={isLoadingCustomers}
                error={errors.customer_id}
              />
            </div>

            {/* Invoice Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại hóa đơn <span className="text-red-500">*</span>
              </label>
              <Dropdown
                value={localData.invoice_category_id}
                onChange={(value) => handleInputChange('invoice_category_id', value)}
                options={invoiceCategories.map(category => ({
                  value: category.id,
                  label: category.name
                }))}
                placeholder="Chọn loại hóa đơn"
                loading={isLoadingCategories}
                error={errors.invoice_category_id}
              />
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái thanh toán
              </label>
              <Dropdown
                value={localData.payment_status}
                onChange={(value) => handleInputChange('payment_status', value)}
                options={Object.values(INVOICE_STATUS).map(status => ({
                  value: status,
                  label: INVOICE_STATUS_LABELS[status]
                }))}
                placeholder="Chọn trạng thái"
                error={errors.payment_status}
              />
            </div>

            {/* Payment Proof */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chứng từ thanh toán
              </label>
              <input
                type="text"
                value={localData.payment_proof}
                onChange={(e) => handleInputChange('payment_proof', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="URL chứng từ thanh toán"
              />
            </div>
          </div>

          {/* Cancel Reason (only show when status is CANCELLED) */}
          {localData.payment_status === 'CANCELLED' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do hủy <span className="text-red-500">*</span>
              </label>
              <textarea
                value={localData.cancel_reason}
                onChange={(e) => handleInputChange('cancel_reason', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Nhập lý do hủy hóa đơn"
              />
              {errors.cancel_reason && (
                <p className="text-red-500 text-sm mt-1">{errors.cancel_reason}</p>
              )}
            </div>
          )}

          {/* Invoice Items */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Danh sách dịch vụ</h3>
              <button
                onClick={addItem}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <AddIcon className="mr-2" />
                Thêm dịch vụ
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-3 text-left">Biển số xe</th>
                    <th className="border p-3 text-left">Tên dịch vụ</th>
                    <th className="border p-3 text-left">Giá</th>
                    <th className="border p-3 text-left">Số lượng</th>
                    <th className="border p-3 text-left">Ngày thực hiện</th>
                    <th className="border p-3 text-left">Ghi chú</th>
                    <th className="border p-3 text-left">Tổng tiền</th>
                    <th className="border p-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsWithTotals.map((item, index) => (
                    <tr key={index}>
                      <td className="border p-3">
                        <Dropdown
                          value={item.license_plate}
                          onChange={(value) => handleItemChange(index, 'license_plate', value)}
                          options={licensePlates.map(plate => ({
                            value: plate.value,
                            label: plate.displayText
                          }))}
                          placeholder="Chọn biển số"
                          loading={isLoadingPlates}
                          error={errors[`items.${index}.license_plate`]}
                        />
                      </td>
                      <td className="border p-3">
                        <input
                          type="text"
                          value={item.item_name}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          placeholder="Tên dịch vụ"
                        />
                      </td>
                      <td className="border p-3">
                        <input
                          type="text"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          placeholder="0"
                        />
                      </td>
                      <td className="border p-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          min="1"
                        />
                      </td>
                      <td className="border p-3">
                        <input
                          type="date"
                          value={item.service_date}
                          onChange={(e) => handleItemChange(index, 'service_date', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="border p-3">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          placeholder="Ghi chú"
                        />
                      </td>
                      <td className="border p-3 text-right">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="border p-3 text-center">
                        {localData.items.length > 1 && (
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <DeleteIcon />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan="6" className="border p-3 text-right">Tổng cộng:</td>
                    <td className="border p-3 text-right">{formatCurrency(grandTotal)}</td>
                    <td className="border p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú
            </label>
            <textarea
              value={localData.remark}
              onChange={(e) => handleInputChange('remark', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Ghi chú thêm về hóa đơn"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Tạo mới')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;