import React from 'react';
import PropTypes from 'prop-types';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatCurrency } from '@utils/format';
import { formatDate, calculateItemTotal } from '@utils/expenseHelpers';

const ExpenseItemRow = ({
  item,
  index,
  isEditing,
  onItemChange,
  onDeleteItem,
  onLicensePlateCellClick,
  errors = {}
}) => {
  return (
    <tr className="hover:bg-gray-50 border-t">
      <td className="px-3 py-2 text-xs border-r">
        {isEditing ? (
          <div>
            <div
              className={`flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1 rounded -ml-1 -my-1 ${
                errors[`items.${index}.license_plate`] 
                  ? 'border border-red-500 bg-red-50' 
                  : ''
              }`}
              onClick={() => onLicensePlateCellClick(index)}
              style={{ minWidth: '150px' }}
            >
              <span className={!item.license_plate && errors[`items.${index}.license_plate`] ? 'text-red-500' : ''}>
                {item.license_plate || <span className={errors[`items.${index}.license_plate`] ? 'text-red-500' : 'text-gray-400'}>Chọn biển số</span>}
              </span>
              <EditIcon sx={{ fontSize: 14, color: '#6b7280' }} />
            </div>
            {errors[`items.${index}.license_plate`] && (
              <div className="text-red-500 text-xs mt-1">{errors[`items.${index}.license_plate`]}</div>
            )}
          </div>
        ) : (
          item.license_plate || '-'
        )}
      </td>
      <td className="px-3 py-2 text-xs border-r">
        {isEditing ? (
          <div>
            <input
              type="text"
              value={item.item_name || ''}
              onChange={(e) => onItemChange(index, 'item_name', e.target.value)}
              className={`w-full px-1 py-0.5 text-xs border rounded focus:outline-none ${
                errors[`items.${index}.item_name`] 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errors[`items.${index}.item_name`] && (
              <div className="text-red-500 text-xs mt-1">{errors[`items.${index}.item_name`]}</div>
            )}
          </div>
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
          <div>
            <input
              type="number"
              value={item.price || ''}
              onChange={(e) => onItemChange(index, 'price', e.target.value)}
              className={`w-full px-1 py-0.5 text-xs border rounded focus:outline-none text-right ${
                errors[`items.${index}.price`] 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              min="0"
            />
            {errors[`items.${index}.price`] && (
              <div className="text-red-500 text-xs mt-1">{errors[`items.${index}.price`]}</div>
            )}
          </div>
        ) : (
          formatCurrency(item.price || 0)
        )}
      </td>
      <td className="px-3 py-2 text-xs text-center border-r">
        {isEditing ? (
          <div>
            <input
              type="number"
              value={item.quantity || ''}
              onChange={(e) => onItemChange(index, 'quantity', e.target.value)}
              className={`w-full px-1 py-0.5 text-xs border rounded focus:outline-none text-center ${
                errors[`items.${index}.quantity`] 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              min="1"
            />
            {errors[`items.${index}.quantity`] && (
              <div className="text-red-500 text-xs mt-1">{errors[`items.${index}.quantity`]}</div>
            )}
          </div>
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
            title="Xóa hạng mục"
          >
            <DeleteIcon sx={{ fontSize: 18 }} />
          </button>
        </td>
      )}
    </tr>
  );
};

ExpenseItemRow.propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  onLicensePlateCellClick: PropTypes.func.isRequired,
  errors: PropTypes.object
};

export default ExpenseItemRow;