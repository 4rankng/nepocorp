import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export default function EditablePaymentVoucher() {
  const [formData, setFormData] = useState({
    status: 'PAID',
    supplier: 'Garage Minh Tuấn',
    expenseType: 'Bảo dưỡng',
    note: 'Bảo dưỡng định kỳ 10,000km',
    items: [
      {
        id: 1,
        plateNumber: '51A-12345',
        item: 'Dầu động cơ Shell 15W40',
        orderDate: '2024-01-15',
        expiryDate: '',
        unitPrice: 300000,
        quantity: 4,
        tax: 10,
        amount: 1320000
      },
      {
        id: 2,
        plateNumber: '51A-12345',
        item: 'Lọc dầu Toyota',
        orderDate: '2024-01-15',
        expiryDate: '2024-07-15',
        unitPrice: 150000,
        quantity: 2,
        tax: 10,
        amount: 330000
      },
      {
        id: 3,
        plateNumber: '51A-12345',
        item: 'Lọc gió',
        orderDate: '2024-01-15',
        expiryDate: '2024-07-15',
        unitPrice: 200000,
        quantity: 1,
        tax: 10,
        amount: 220000
      },
      {
        id: 4,
        plateNumber: '51A-12345',
        item: 'Chi phí công',
        orderDate: '2024-01-15',
        expiryDate: '',
        unitPrice: 500000,
        quantity: 1,
        tax: 10,
        amount: 550000
      }
    ]
  });

  const calculateAmount = (unitPrice, quantity, tax) => {
    const subtotal = unitPrice * quantity;
    const taxAmount = subtotal * (tax / 100);
    return subtotal + taxAmount;
  };

  const updateItem = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate amount if price, quantity, or tax changes
          if (field === 'unitPrice' || field === 'quantity' || field === 'tax') {
            updatedItem.amount = calculateAmount(
              field === 'unitPrice' ? Number(value) : updatedItem.unitPrice,
              field === 'quantity' ? Number(value) : updatedItem.quantity,
              field === 'tax' ? Number(value) : updatedItem.tax
            );
          }

          return updatedItem;
        }
        return item;
      })
    }));
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      plateNumber: '',
      item: '',
      orderDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      unitPrice: 0,
      quantity: 1,
      tax: 10,
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + item.amount, 0);

  const handleSave = () => {
    // Handle save logic here
    console.log('Saving data:', formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Chi tiết phiếu chi</h2>
            <select
              className="px-3 py-1 border rounded-md text-sm font-medium"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <button className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Thông tin cơ bản</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nhà cung cấp</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Loại chi phí</label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.expenseType}
                  onChange={(e) => setFormData({...formData, expenseType: e.target.value})}
                >
                  <option value="Bảo dưỡng">Bảo dưỡng</option>
                  <option value="Sửa chữa">Sửa chữa</option>
                  <option value="Nhiên liệu">Nhiên liệu</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
            />
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">Danh sách</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
              >
                <Plus size={16} />
                Thêm mục
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Biên số xe</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Hàng mục</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Ngày lập đặt</th>
                    <th className="border px-3 py-2 text-left text-sm font-medium text-gray-700">Ngày hết hạn</th>
                    <th className="border px-3 py-2 text-right text-sm font-medium text-gray-700">Đơn giá (VNĐ)</th>
                    <th className="border px-3 py-2 text-center text-sm font-medium text-gray-700">SL</th>
                    <th className="border px-3 py-2 text-center text-sm font-medium text-gray-700">Thuế (%)</th>
                    <th className="border px-3 py-2 text-right text-sm font-medium text-gray-700">Thành tiền</th>
                    <th className="border px-3 py-2 text-center text-sm font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border px-2 py-1">
                        <input
                          type="text"
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={item.plateNumber}
                          onChange={(e) => updateItem(item.id, 'plateNumber', e.target.value)}
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="text"
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={item.item}
                          onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="date"
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={item.orderDate}
                          onChange={(e) => updateItem(item.id, 'orderDate', e.target.value)}
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="date"
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={item.expiryDate}
                          onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)}
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="number"
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="number"
                          className="w-24 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                          value={item.tax}
                          onChange={(e) => updateItem(item.id, 'tax', e.target.value)}
                        />
                      </td>
                      <td className="border px-3 py-2 text-right">
                        {item.amount.toLocaleString('vi-VN')}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="7" className="border px-3 py-2 text-right font-medium">Tổng cộng:</td>
                    <td className="border px-3 py-2 text-right font-bold">{totalAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="border"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button className="px-4 py-2 border rounded-md hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
