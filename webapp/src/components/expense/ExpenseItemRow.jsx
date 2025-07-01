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
  onEditItem,
  errors = {},
}) => {
  return (
    <tr className="hover:bg-gray-50 border-t">
      <td className="px-3 py-2 text-xs border-r">{item.license_plate || '-'}</td>
      <td className="px-3 py-2 text-xs border-r">{item.item_name || '-'}</td>
      <td className="px-3 py-2 text-xs text-center border-r">{formatDate(item.install_date)}</td>
      <td className="px-3 py-2 text-xs text-center border-r">{formatDate(item.expiry_date)}</td>
      <td className="px-3 py-2 text-xs text-right border-r">{formatCurrency(item.price || 0)}</td>
      <td className="px-3 py-2 text-xs text-center border-r">{item.quantity || 0}</td>
      <td className="px-3 py-2 text-xs text-right border-r">{`${item.tax_rate || 0}%`}</td>
      <td className="px-3 py-2 text-xs text-right font-medium">
        {formatCurrency(item.total || 0)}
      </td>
      {isEditing && (
        <td className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onEditItem(index)}
              className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors"
              title="Sửa hạng mục"
            >
              <EditIcon sx={{ fontSize: 20 }} />
            </button>
            <button
              onClick={() => onDeleteItem(index)}
              className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors"
              title="Xóa hạng mục"
            >
              <DeleteIcon sx={{ fontSize: 20 }} />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
};

ExpenseItemRow.propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onItemChange: PropTypes.func,
  onDeleteItem: PropTypes.func.isRequired,
  onLicensePlateCellClick: PropTypes.func,
  onEditItem: PropTypes.func.isRequired,
  errors: PropTypes.object,
};

export default ExpenseItemRow;
