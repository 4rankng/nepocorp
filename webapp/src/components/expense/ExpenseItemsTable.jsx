import React from 'react';
import PropTypes from 'prop-types';
import ExpenseItemRow from './ExpenseItemRow';
import InvoiceItemRow from '../invoice/InvoiceItemRow';
import { formatCurrency } from '@utils/format';
import { calculateExpenseTotal } from '@utils/expenseHelpers';

const ExpenseItemsTable = ({
  items,
  isEditing,
  onItemChange,
  onDeleteItem,
  onLicensePlateCellClick,
  total,
  isInvoiceMode = false
}) => {
  const displayItems = items || [];
  const hasItems = displayItems.length > 0;

  const calculateTotal = () => {
    if (isEditing) {
      if (isInvoiceMode) {
        // Calculate invoice total
        return displayItems.reduce((sum, item) => {
          const price = parseFloat(item.price) || 0;
          const quantity = parseFloat(item.quantity) || 0;
          const taxRate = parseFloat(item.tax_rate) || 0;
          const subtotal = price * quantity;
          const taxAmount = subtotal * taxRate / 100;
          return sum + subtotal + taxAmount;
        }, 0);
      }
      return calculateExpenseTotal(displayItems);
    }
    return total || 0;
  };

  return (
    <div className="text-sm">
      <h2 className="text-base font-semibold text-gray-700 mb-3">{isInvoiceMode ? 'Danh sách dịch vụ' : 'Danh sách hạng mục'}</h2>
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Biển số xe</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">{isInvoiceMode ? 'Tên dịch vụ' : 'Hạng mục'}</th>
              {isInvoiceMode ? (
                <>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày thực hiện</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Ghi chú</th>
                </>
              ) : (
                <>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày lắp đặt</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày hết hạn</th>
                </>
              )}
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
            {hasItems ? (
              displayItems.map((item, index) => {
                const ItemComponent = isInvoiceMode ? InvoiceItemRow : ExpenseItemRow;
                return (
                  <ItemComponent
                    key={item.id || index}
                    item={item}
                    index={index}
                    isEditing={isEditing}
                    onItemChange={onItemChange}
                    onDeleteItem={onDeleteItem}
                    onLicensePlateCellClick={onLicensePlateCellClick}
                  />
                );
              })
            ) : (
              <tr>
                <td colSpan={isEditing ? "9" : "8"} className="px-3 py-6 text-center text-gray-500 text-xs">
                  {isInvoiceMode ? 'Không có dữ liệu dịch vụ' : 'Không có dữ liệu hạng mục'}
                </td>
              </tr>
            )}
          </tbody>
          {hasItems && (
            <tfoot>
              <tr className="bg-gray-50 font-medium border-t">
                <td colSpan={isEditing ? "8" : "7"} className="px-3 py-2 text-right text-xs">
                  Tổng cộng:
                </td>
                <td className="px-3 py-2 text-right text-sm font-semibold whitespace-nowrap">
                  {formatCurrency(calculateTotal())} ₫
                </td>
                {isEditing && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

ExpenseItemsTable.propTypes = {
  items: PropTypes.array,
  isEditing: PropTypes.bool.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  onLicensePlateCellClick: PropTypes.func.isRequired,
  total: PropTypes.number,
  isInvoiceMode: PropTypes.bool
};

export default ExpenseItemsTable;