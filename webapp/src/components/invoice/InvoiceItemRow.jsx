import React from 'react';
import PropTypes from 'prop-types';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatCurrency } from '@utils/format';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
  } catch (error) {
    return '-';
  }
};

const calculateItemTotal = (item) => {
  const price = parseFloat(item.price) || 0;
  const quantity = parseFloat(item.quantity) || 0;
  const taxRate = parseFloat(item.tax_rate) || 0;
  const subtotal = price * quantity;
  const taxAmount = subtotal * taxRate / 100;
  return subtotal + taxAmount;
};

const InvoiceItemRow = ({
  item,
  index,
  isEditing,
  onItemChange,
  onDeleteItem,
  onLicensePlateCellClick
}) => {
  return (
    <tr className="hover:bg-gray-50 border-t">
      <td className="px-3 py-2 text-xs border-r">
        {isEditing ? (
          <div
            className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1 rounded -ml-1 -my-1"
            onClick={() => onLicensePlateCellClick(index)}
            style={{ minWidth: '150px' }}
          >
            <span>{item.license_plate || <span className="text-gray-400">Chọn biển số</span>}</span>
            <EditIcon sx={{ fontSize: 14, color: '#6b7280' }} />
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
            value={item.service_date ? item.service_date.split('T')[0] : ''}
            onChange={(e) => onItemChange(index, 'service_date', e.target.value)}
            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
          />
        ) : (
          formatDate(item.service_date)
        )}
      </td>
      <td className="px-3 py-2 text-xs border-r">
        {isEditing ? (
          <input
            type="text"
            value={item.notes || ''}
            onChange={(e) => onItemChange(index, 'notes', e.target.value)}
            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            placeholder="Ghi chú"
          />
        ) : (
          item.notes || '-'
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
          isEditing ? calculateItemTotal(item) : (item.total || 0)
        )}
      </td>
      {isEditing && (
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => onDeleteItem(index)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Xóa dịch vụ"
          >
            <DeleteIcon sx={{ fontSize: 18 }} />
          </button>
        </td>
      )}
    </tr>
  );
};

InvoiceItemRow.propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  onLicensePlateCellClick: PropTypes.func.isRequired
};

export default InvoiceItemRow;