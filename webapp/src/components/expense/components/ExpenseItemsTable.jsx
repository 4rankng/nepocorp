import React from 'react';
import PropTypes from 'prop-types';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Dropdown from '@components/ui/Dropdown';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const ExpenseItemsTable = ({ items, isEditing, onItemChange, onAddItem, onDeleteItem, licensePlateOptions = [], isLoadingPlates = false }) => {
  const calculateItemTotal = (item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;
    return price * quantity * (1 + taxRate / 100);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Danh sách</h2>
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Biển số xe</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Hạng mục</th>
              <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày lắp đặt</th>
              <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày hết hạn</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r">Đơn giá (VND)</th>
              <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r w-16">SL</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r w-20">Thuế (%)</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-700">Thành tiền</th>
              {isEditing && (
                <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 w-20">Thao tác</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50 border-t">
                  <td className="px-3 py-2 text-xs border-r">
                    {isEditing ? (
                      <div style={{ minWidth: '150px' }}>
                        <Dropdown
                          value={item.license_plate || ''}
                          onChange={(value) => onItemChange(index, 'license_plate', value)}
                          options={licensePlateOptions}
                          placeholder="Chọn biển số"
                          searchable={true}
                          clearable={true}
                          loading={isLoadingPlates}
                          className="text-xs"
                          style={{ fontSize: '12px' }}
                        />
                      </div>
                    ) : (
                      item.license_plate || '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs border-r">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.item_name || ''}
                        onChange={(e) => onItemChange(index, 'item_name', e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      item.item_name || '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-center border-r">
                    {isEditing ? (
                      <input
                        type="date"
                        value={item.install_date ? item.install_date.split('T')[0] : ''}
                        onChange={(e) => onItemChange(index, 'install_date', e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      formatDate(item.install_date)
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-center border-r">
                    {isEditing ? (
                      <input
                        type="date"
                        value={item.expiry_date ? item.expiry_date.split('T')[0] : ''}
                        onChange={(e) => onItemChange(index, 'expiry_date', e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      formatDate(item.expiry_date)
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-right border-r">
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => onItemChange(index, 'price', e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-right"
                        min="0"
                      />
                    ) : (
                      formatCurrency(item.price || 0)
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-center border-r">
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => onItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-center"
                        min="1"
                      />
                    ) : (
                      item.quantity || 0
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-right border-r">
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.tax_rate || ''}
                        onChange={(e) => onItemChange(index, 'tax_rate', e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-right"
                        min="0"
                        max="100"
                      />
                    ) : (
                      `${item.tax_rate || 0}%`
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-right font-medium">
                    {formatCurrency(
                      isEditing 
                        ? calculateItemTotal(item)
                        : (item.total || 0)
                    )}
                  </td>
                  {isEditing && (
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onDeleteItem(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Xóa hạng mục"
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isEditing ? "9" : "8"} className="px-3 py-6 text-center text-gray-500 text-xs">
                  Không có dữ liệu hạng mục
                </td>
              </tr>
            )}
          </tbody>
          {items && items.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-medium border-t">
                <td colSpan={isEditing ? "8" : "7"} className="px-3 py-2 text-right text-xs">Tổng cộng:</td>
                <td className="px-3 py-2 text-right text-sm font-semibold whitespace-nowrap">
                  {formatCurrency(calculateTotal())} ₫
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

ExpenseItemsTable.propTypes = {
  items: PropTypes.array.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onAddItem: PropTypes.func,
  onDeleteItem: PropTypes.func,
  licensePlateOptions: PropTypes.array,
  isLoadingPlates: PropTypes.bool,
};

export default React.memo(ExpenseItemsTable);