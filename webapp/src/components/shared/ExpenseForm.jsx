import React, { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '@constants/payment';
import { settingsApi } from '@services/api/settingsApi';
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount);
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
  expenseCategoryId = null,
  title = null,
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
      quantity: '1',
      tax_rate: '10',
      install_date: '',
      expiry_date: ''
    }],
    remark: ''
  });

  const [taxRate, setTaxRate] = useState(10);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    license_plate: '',
    item_name: '',
    price: '',
    quantity: '1',
    tax_rate: '10',
    install_date: '',
    expiry_date: ''
  });

  useEffect(() => {
    if (formData) {
      setLocalData({
        license_plate: formData.license_plate || '',
        vendor_name: formData.vendor_name || '',
        expense_category_id: formData.expense_category_id || expenseCategoryId || '',
        payment_status: formData.payment_status || PAYMENT_STATUS.DRAFT,
        payment_proof: formData.payment_proof || '',
        items: formData.items && formData.items.length > 0 ? formData.items.map(item => ({
          ...item,
          price: item.price?.toString() || '',
          quantity: item.quantity?.toString() || '1',
          tax_rate: item.tax_rate?.toString() || '10'
        })) : [{
          item_name: '',
          price: '',
          quantity: '1',
          tax_rate: '10',
          install_date: '',
          expiry_date: ''
        }],
        remark: formData.remark || ''
      });
    }
  }, [formData, expenseCategoryId]);

  // Load settings when modal opens
  useEffect(() => {
    const loadSettings = async () => {
      if (!open) return;

      try {
        // Load tax rate
        const cachedTaxRate = localStorage.getItem('taxRate');
        if (cachedTaxRate) {
          setTaxRate(parseFloat(cachedTaxRate));
        } else {
          try {
            const response = await settingsApi.getTaxRate();
            const rate = parseFloat(response.value);
            setTaxRate(rate);
            localStorage.setItem('taxRate', rate.toString());
          } catch (error) {
            console.warn('Failed to load tax rate:', error);
            setTaxRate(10);
          }
        }

        // Load expense categories if not fixed
        if (!expenseCategoryId) {
          setIsLoadingCategories(true);
          try {
            const response = await expenseCategoryApi.getAllWithoutPagination();
            const categories = response?.data || response || [];
            setExpenseCategories(Array.isArray(categories) ? categories : []);
          } catch (error) {
            console.warn('Failed to load categories:', error);
            setExpenseCategories([]);
          } finally {
            setIsLoadingCategories(false);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [open, expenseCategoryId]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open) {
        if (showAddItem) {
          setShowAddItem(false);
          setEditingItem(null);
        } else {
          onClose();
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, showAddItem, onClose]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const newData = { ...localData, [name]: value };
    setLocalData(newData);
    onChange({ target: { name, value } });
  };

  const calculateItemTotal = (price, quantity, taxRate) => {
    const priceNum = parseFloat(price) || 0;
    const quantityNum = parseInt(quantity) || 0;
    const taxRateNum = parseFloat(taxRate) || 0;
    const subtotal = priceNum * quantityNum;
    const tax = subtotal * (taxRateNum / 100);
    return {
      subtotal,
      total: subtotal + tax
    };
  };

  const addItem = () => {
    const price = parseFloat(newItem.price) || 0;
    const quantity = parseInt(newItem.quantity) || 1;
    const taxRateItem = parseFloat(newItem.tax_rate) || 0;
    const { subtotal, total } = calculateItemTotal(price, quantity, taxRateItem);

    const itemToAdd = {
      ...newItem,
      price,
      quantity,
      tax_rate: taxRateItem,
      subtotal,
      total,
      id: editingItem !== null ? localData.items[editingItem].id : Date.now()
    };

    let updatedItems;
    if (editingItem !== null) {
      updatedItems = [...localData.items];
      updatedItems[editingItem] = itemToAdd;
      setEditingItem(null);
    } else {
      updatedItems = [...localData.items, itemToAdd];
    }

    const newData = { ...localData, items: updatedItems };
    setLocalData(newData);
    onChange({ target: { name: 'items', value: updatedItems } });

    setNewItem({
      license_plate: '',
      item_name: '',
      price: '',
      quantity: '1',
      tax_rate: '10',
      install_date: '',
      expiry_date: ''
    });
    setShowAddItem(false);
  };

  const editItem = (index) => {
    const item = localData.items[index];
    setNewItem({
      license_plate: item.license_plate || '',
      item_name: item.item_name || '',
      price: item.price?.toString() || '',
      quantity: item.quantity?.toString() || '1',
      tax_rate: item.tax_rate?.toString() || '10',
      install_date: item.install_date || '',
      expiry_date: item.expiry_date || ''
    });
    setEditingItem(index);
    setShowAddItem(true);
  };

  const removeItem = (index) => {
    const updatedItems = localData.items.filter((_, i) => i !== index);
    const newData = { ...localData, items: updatedItems };
    setLocalData(newData);
    onChange({ target: { name: 'items', value: updatedItems } });
  };

  const calculateTotals = () => {
    const items = localData.items || [];
    let subtotal = 0;
    let total = 0;

    items.forEach(item => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      const taxRateItem = parseFloat(item.tax_rate) || 0;
      const itemSubtotal = price * quantity;
      const itemTotal = itemSubtotal + (itemSubtotal * taxRateItem / 100);

      subtotal += itemSubtotal;
      total += itemTotal;
    });

    return { subtotal, total };
  };

  const { total } = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  if (!open) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Compact Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">
              {title || (isEdit ? 'Sửa phiếu chi' : 'Thêm phiếu chi mới')}
            </h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Compact Form */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Expense Information - Single Row Layout */}
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Thông tin thanh toán</h2>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nhà cung cấp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="vendor_name"
                      value={localData.vendor_name}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    {errors.vendor_name && (
                      <div className="text-xs text-red-500 mt-1">{errors.vendor_name}</div>
                    )}
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Loại chi phí <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="expense_category_id"
                      value={localData.expense_category_id}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={isLoading || isLoadingCategories || !!expenseCategoryId}
                    >
                      <option value="">Chọn loại chi phí</option>
                      {expenseCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.expense_category_id && (
                      <div className="text-xs text-red-500 mt-1">{errors.expense_category_id}</div>
                    )}
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Trạng thái <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="payment_status"
                      value={localData.payment_status}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={isLoading}
                    >
                      {Object.entries(PAYMENT_STATUS_LABELS).map(([status, label]) => (
                        <option key={status} value={status}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Tổng tiền
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formatCurrency(total)}
                        readOnly
                        className="w-full px-2 py-1.5 pr-8 text-sm font-semibold border border-gray-300 rounded bg-gray-50"
                      />
                      <span className="absolute right-2 top-1.5 text-sm text-gray-500">₫</span>
                    </div>
                  </div>

                </div>

                {/* Payment proof and Remark fields - 50% 50% */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      URL chứng từ
                    </label>
                    <input
                      type="text"
                      name="payment_proof"
                      value={localData.payment_proof}
                      onChange={handleInputChange}
                      placeholder="URL ảnh chứng từ"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Ghi chú
                    </label>
                    <input
                      type="text"
                      name="remark"
                      value={localData.remark}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Danh sách</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setNewItem({
                        license_plate: '',
                        item_name: '',
                        price: '',
                        quantity: '1',
                        tax_rate: '10',
                        install_date: '',
                        expiry_date: ''
                      });
                      setShowAddItem(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    disabled={isLoading}
                  >
<AddIcon sx={{ fontSize: 12 }} />
                    Thêm
                  </button>
                </div>

                {/* Compact Table */}
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Biển số xe</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Tên hàng mục</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r">Đơn giá (VND)</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r w-16">SL</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r w-20">Thuế (%)</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r">Thành tiền</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày lắp đặt</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày hết hạn</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 w-20">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localData.items && localData.items.length > 0 ? (
                        localData.items.map((item, index) => {
                          const itemTotal = calculateItemTotal(item.price, item.quantity, item.tax_rate).total;
                          return (
                            <tr key={item.id || index} className="hover:bg-gray-50 border-t">
                              <td className="px-3 py-2 text-xs border-r">{item.license_plate || '-'}</td>
                              <td className="px-3 py-2 text-xs border-r">{item.item_name || '-'}</td>
                              <td className="px-3 py-2 text-xs text-right border-r">{formatCurrency(item.price || 0)}</td>
                              <td className="px-3 py-2 text-xs text-center border-r">{item.quantity || 0}</td>
                              <td className="px-3 py-2 text-xs text-right border-r">{item.tax_rate || 0}%</td>
                              <td className="px-3 py-2 text-xs text-right font-medium border-r">{formatCurrency(itemTotal)}</td>
                              <td className="px-3 py-2 text-xs text-center border-r">{item.install_date || '-'}</td>
                              <td className="px-3 py-2 text-xs text-center border-r">{item.expiry_date || '-'}</td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => editItem(index)}
                                    className="text-blue-600 hover:text-blue-800"
                                    disabled={isLoading}
                                  >
<EditIcon sx={{ fontSize: 12 }} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={isLoading}
                                  >
<DeleteIcon sx={{ fontSize: 12 }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="9" className="px-3 py-6 text-center text-gray-500 text-xs">
                            Chưa có hàng mục nào. Nhấn "Thêm" để bắt đầu.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {localData.items && localData.items.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 font-medium border-t">
                          <td colSpan="5" className="px-3 py-2 text-right text-xs border-r">Tổng cộng:</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold border-r">{formatCurrency(total)} ₫</td>
                          <td colSpan="3"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Tạo phiếu chi')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-3xl">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-medium text-gray-900">
                {editingItem !== null ? 'Sửa hàng mục' : 'Thêm'}
              </h3>
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setEditingItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Biển số xe <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newItem.license_plate}
                    onChange={(e) => setNewItem({ ...newItem, license_plate: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Chọn biển số</option>
                    {licensePlates.map(plate => (
                      <option key={plate.value} value={plate.value}>
                        {plate.displayText || plate.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tên hàng mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.item_name}
                    onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Đơn giá (VND) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Thuế (%)
                  </label>
                  <input
                    type="number"
                    value={newItem.tax_rate}
                    onChange={(e) => setNewItem({ ...newItem, tax_rate: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ngày lắp đặt
                  </label>
                  <input
                    type="date"
                    value={newItem.install_date}
                    onChange={(e) => setNewItem({ ...newItem, install_date: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ngày hết hạn
                  </label>
                  <input
                    type="date"
                    value={newItem.expiry_date}
                    onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Live calculation preview */}
              {newItem.price && newItem.quantity && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tạm tính:</span>
                    <span>{formatCurrency(parseFloat(newItem.price) * parseInt(newItem.quantity))} ₫</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thuế ({newItem.tax_rate || 0}%):</span>
                    <span>{formatCurrency((parseFloat(newItem.price) * parseInt(newItem.quantity)) * (parseFloat(newItem.tax_rate || 0) / 100))} ₫</span>
                  </div>
                  <div className="flex justify-between font-medium border-t mt-1 pt-1">
                    <span>Thành tiền:</span>
                    <span>{formatCurrency(calculateItemTotal(parseFloat(newItem.price), parseInt(newItem.quantity), parseFloat(newItem.tax_rate || 0)).total)} ₫</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowAddItem(false);
                    setEditingItem(null);
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={addItem}
                  disabled={!newItem.license_plate || !newItem.item_name || !newItem.price}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {editingItem !== null ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpenseForm;
