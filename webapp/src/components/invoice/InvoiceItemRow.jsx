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
  onLicensePlateCellClick,
  onEditItem
}) => {
  return (
    <tr className="hover:bg-gray-50 border-t">
      <td className="px-3 py-2 text-xs border-r">
        {item.license_plate || '-'}
      </td>
      <td className="px-3 py-2 text-xs border-r">
        {item.item_name || '-'}
      </td>
      <td className="px-3 py-2 text-xs text-center border-r">
        {formatDate(item.service_date)}
      </td>
      <td className="px-3 py-2 text-xs border-r">
        {item.notes || '-'}
      </td>
      <td className="px-3 py-2 text-xs text-right border-r">
        {formatCurrency(item.price || 0)}
      </td>
      <td className="px-3 py-2 text-xs text-center border-r">
        {item.quantity || 0}
      </td>
      <td className="px-3 py-2 text-xs text-right border-r">
        {`${item.tax_rate || 0}%`}
      </td>
      <td className="px-3 py-2 text-xs text-right font-medium">
        {formatCurrency(item.total || 0)}
      </td>
      {isEditing && (
        <td className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => onEditItem(index)}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Sửa dịch vụ"
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </button>
            <button
              onClick={() => onDeleteItem(index)}
              className="text-red-600 hover:text-red-800 p-1"
              title="Xóa dịch vụ"
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
};

InvoiceItemRow.propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onItemChange: PropTypes.func,
  onDeleteItem: PropTypes.func.isRequired,
  onLicensePlateCellClick: PropTypes.func,
  onEditItem: PropTypes.func.isRequired
};

export default InvoiceItemRow;