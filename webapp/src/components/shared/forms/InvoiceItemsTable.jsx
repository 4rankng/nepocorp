import React from 'react';
import PropTypes from 'prop-types';
import { formatCurrency, formatDate } from '@utils/format';
import Dropdown from '@components/ui/Dropdown';

const InvoiceItemsTable = ({ 
  items = [], 
  isEditing = false, 
  onItemChange, 
  onDeleteItem,
  licensePlateOptions = [], 
  isLoadingPlates = false 
}) => {
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Danh sách dịch vụ</h3>
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-3 text-left">Biển số xe</th>
              <th className="border p-3 text-left">Tên dịch vụ</th>
              <th className="border p-3 text-right">Đơn giá</th>
              <th className="border p-3 text-right">Số lượng</th>
              <th className="border p-3 text-right">Thành tiền</th>
              <th className="border p-3 text-left">Ngày thực hiện</th>
              <th className="border p-3 text-left">Ghi chú</th>
              {isEditing && <th className="border p-3 text-center">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index}>
                  <td className="border p-3">
                    {isEditing ? (
                      <Dropdown
                        value={item.license_plate || ''}
                        onChange={(value) => onItemChange(index, 'license_plate', value)}
                        options={licensePlateOptions}
                        placeholder="Chọn biển số"
                        searchable={true}
                        clearable={true}
                        loading={isLoadingPlates}
                        className="text-sm"
                      />
                    ) : (
                      item.license_plate || '-'
                    )}
                  </td>
                  <td className="border p-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.item_name || ''}
                        onChange={(e) => onItemChange(index, 'item_name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="Tên dịch vụ"
                      />
                    ) : (
                      item.item_name || '-'
                    )}
                  </td>
                  <td className="border p-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => onItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:border-blue-500 focus:outline-none"
                        placeholder="0"
                        min="0"
                      />
                    ) : (
                      formatCurrency(item.price)
                    )}
                  </td>
                  <td className="border p-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:border-blue-500 focus:outline-none"
                        placeholder="1"
                        min="1"
                      />
                    ) : (
                      item.quantity || 0
                    )}
                  </td>
                  <td className="border p-3 text-right">{formatCurrency(item.total)}</td>
                  <td className="border p-3">
                    {isEditing ? (
                      <input
                        type="date"
                        value={item.service_date || ''}
                        onChange={(e) => onItemChange(index, 'service_date', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      item.service_date ? formatDate(item.service_date) : '-'
                    )}
                  </td>
                  <td className="border p-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => onItemChange(index, 'notes', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                          placeholder="Ghi chú"
                        />
                        <button
                          onClick={() => onDeleteItem(index)}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          title="Xóa"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      item.notes || '-'
                    )}
                  </td>
                  {isEditing && !item.notes && (
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => onDeleteItem(index)}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        title="Xóa"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isEditing ? "8" : "7"} className="border p-6 text-center text-gray-500">
                  Không có dữ liệu dịch vụ
                </td>
              </tr>
            )}
          </tbody>
          {items && items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan="4" className="border p-3 text-right">Tổng cộng:</td>
                <td className="border p-3 text-right">{formatCurrency(calculateTotal())}</td>
                <td colSpan={isEditing ? "3" : "2"} className="border p-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

InvoiceItemsTable.propTypes = {
  items: PropTypes.array,
  isEditing: PropTypes.bool,
  onItemChange: PropTypes.func,
  onDeleteItem: PropTypes.func,
  licensePlateOptions: PropTypes.array,
  isLoadingPlates: PropTypes.bool,
};

export default React.memo(InvoiceItemsTable);