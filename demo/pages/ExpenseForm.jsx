import React, { useState } from 'react';
import { Plus, Trash2, Calendar, X, Edit2 } from 'lucide-react';

const ExpenseForm = () => {
  const [expense, setExpense] = useState({
    vendorName: 'Garage Minh Tuấn',
    expenseCategoryId: '1',
    paymentStatus: 'PAID',
    currency: 'VND',
    paymentProof: '',
    remark: 'Bảo dưỡng định kỳ 10,000km',
    total: 0
  });

  const [items, setItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    licensePlate: '',
    itemName: '',
    price: '',
    quantity: '1',
    taxRate: '10',
    installDate: '',
    expiryDate: ''
  });

  const calculateItemTotal = (price, quantity, taxRate) => {
    const subtotal = price * quantity;
    const tax = subtotal * (taxRate / 100);
    return {
      subtotal,
      total: subtotal + tax
    };
  };

  const addItem = () => {
    const price = parseFloat(newItem.price) || 0;
    const quantity = parseInt(newItem.quantity) || 1;
    const taxRate = parseFloat(newItem.taxRate) || 0;
    const { subtotal, total } = calculateItemTotal(price, quantity, taxRate);

    if (editingItem !== null) {
      const updatedItems = [...items];
      updatedItems[editingItem] = {
        ...newItem,
        price,
        quantity,
        taxRate,
        subtotal,
        total,
        id: items[editingItem].id
      };
      setItems(updatedItems);
      setEditingItem(null);

      const newTotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
      setExpense({ ...expense, total: newTotal });
    } else {
      setItems([...items, {
        ...newItem,
        price,
        quantity,
        taxRate,
        subtotal,
        total,
        id: Date.now()
      }]);

      const newTotal = [...items, { total }].reduce((sum, item) => sum + item.total, 0);
      setExpense({ ...expense, total: newTotal });
    }

    setNewItem({
      licensePlate: '',
      itemName: '',
      price: '',
      quantity: '1',
      taxRate: '10',
      installDate: '',
      expiryDate: ''
    });
    setShowAddItem(false);
  };

  const editItem = (index) => {
    const item = items[index];
    setNewItem({
      licensePlate: item.licensePlate,
      itemName: item.itemName,
      price: item.price.toString(),
      quantity: item.quantity.toString(),
      taxRate: item.taxRate.toString(),
      installDate: item.installDate || '',
      expiryDate: item.expiryDate || ''
    });
    setEditingItem(index);
    setShowAddItem(true);
  };

  const removeItem = (id) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);

    const newTotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    setExpense({ ...expense, total: newTotal });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="bg-white rounded shadow-sm">
        {/* Compact Header */}
        <div className="px-4 py-2 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Sửa phiếu chi</h1>
        </div>

        {/* Compact Form */}
        <div className="p-4">
          {/* Expense Information - Single Row Layout */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Thông tin thanh toán</h2>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nhà cung cấp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expense.vendorName}
                  onChange={(e) => setExpense({ ...expense, vendorName: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Loại chi phí <span className="text-red-500">*</span>
                </label>
                <select
                  value={expense.expenseCategoryId}
                  onChange={(e) => setExpense({ ...expense, expenseCategoryId: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="1">Bảo dưỡng</option>
                  <option value="2">Sửa chữa</option>
                  <option value="3">Xăng dầu</option>
                  <option value="4">Phí đường bộ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  value={expense.paymentStatus}
                  onChange={(e) => setExpense({ ...expense, paymentStatus: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="PENDING">Chờ thanh toán</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tổng tiền
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatCurrency(expense.total)}
                    readOnly
                    className="w-full px-2 py-1.5 pr-8 text-sm font-semibold border border-gray-300 rounded bg-gray-50"
                  />
                  <span className="absolute right-2 top-1.5 text-sm text-gray-500">₫</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Chứng từ thanh toán
                </label>
                <input
                  type="text"
                  value={expense.paymentProof}
                  onChange={(e) => setExpense({ ...expense, paymentProof: e.target.value })}
                  placeholder="URL ảnh chứng từ"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Remark field below */}
            <div className="mt-3 grid grid-cols-6 gap-3">
              <div className="col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={expense.remark}
                  onChange={(e) => setExpense({ ...expense, remark: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                onClick={() => {
                  setEditingItem(null);
                  setShowAddItem(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
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
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 border-t">
                      <td className="px-3 py-2 text-xs border-r">{item.licensePlate}</td>
                      <td className="px-3 py-2 text-xs border-r">{item.itemName}</td>
                      <td className="px-3 py-2 text-xs text-right border-r">{formatCurrency(item.price)}</td>
                      <td className="px-3 py-2 text-xs text-center border-r">{item.quantity}</td>
                      <td className="px-3 py-2 text-xs text-right border-r">{item.taxRate}</td>
                      <td className="px-3 py-2 text-xs text-right font-medium border-r">{formatCurrency(item.total)}</td>
                      <td className="px-3 py-2 text-xs text-center border-r">{item.installDate || '-'}</td>
                      <td className="px-3 py-2 text-xs text-center border-r">{item.expiryDate || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => editItem(index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-3 py-6 text-center text-gray-500 text-xs">
                        Chưa có hàng mục nào. Nhấn "Thêm" để bắt đầu.
                      </td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-medium border-t">
                      <td colSpan="5" className="px-3 py-2 text-right text-xs border-r">Tổng cộng:</td>
                      <td className="px-3 py-2 text-right text-sm font-semibold border-r">{formatCurrency(expense.total)} ₫</td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Compact Action Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <button className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

      {/* Compact Add/Edit Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-medium text-gray-900">
                {editingItem !== null ? 'Sửa hàng mục' : 'Thêm'}
              </h3>
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setEditingItem(null);
                  setNewItem({
                    licensePlate: '',
                    itemName: '',
                    price: '',
                    quantity: '1',
                    taxRate: '10',
                    installDate: '',
                    expiryDate: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Biển số xe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.licensePlate}
                    onChange={(e) => setNewItem({ ...newItem, licensePlate: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tên hàng mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.itemName}
                    onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
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
                    value={newItem.taxRate}
                    onChange={(e) => setNewItem({ ...newItem, taxRate: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ngày lắp đặt
                  </label>
                  <input
                    type="date"
                    value={newItem.installDate}
                    onChange={(e) => setNewItem({ ...newItem, installDate: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ngày hết hạn
                  </label>
                  <input
                    type="date"
                    value={newItem.expiryDate}
                    onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
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
                    <span className="text-gray-600">Thuế ({newItem.taxRate || 0}%):</span>
                    <span>{formatCurrency((parseFloat(newItem.price) * parseInt(newItem.quantity)) * (parseFloat(newItem.taxRate || 0) / 100))} ₫</span>
                  </div>
                  <div className="flex justify-between font-medium border-t mt-1 pt-1">
                    <span>Thành tiền:</span>
                    <span>{formatCurrency(calculateItemTotal(parseFloat(newItem.price), parseInt(newItem.quantity), parseFloat(newItem.taxRate || 0)).total)} ₫</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowAddItem(false);
                    setEditingItem(null);
                    setNewItem({
                      licensePlate: '',
                      itemName: '',
                      price: '',
                      quantity: '1',
                      taxRate: '10',
                      installDate: '',
                      expiryDate: ''
                    });
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={addItem}
                  disabled={!newItem.licensePlate || !newItem.itemName || !newItem.price}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {editingItem !== null ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseForm;
