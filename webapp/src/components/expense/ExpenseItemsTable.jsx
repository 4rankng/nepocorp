import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ExpenseItemRow from './ExpenseItemRow';
import InvoiceItemRow from '../invoice/InvoiceItemRow';
import ExpenseItemEditModal from './ExpenseItemEditModal';
import InvoiceItemEditModal from '../invoice/InvoiceItemEditModal';
import ConfirmDialog from '../ConfirmDialog';
import { formatCurrency } from '@utils/format';
import { calculateExpenseTotal } from '@utils/expenseHelpers';

const ExpenseItemsTable = ({
  items,
  isEditing,
  onItemChange,
  onDeleteItem,
  onLicensePlateCellClick,
  total,
  isInvoiceMode = false,
  errors = {},
  licensePlates = [],
  isLoadingPlates = false,
  taxRate = 10,
  onEditModalStateChange
}) => {
  const displayItems = items || [];
  const hasItems = displayItems.length > 0;

  // State for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    open: false,
    index: null,
    itemName: '',
    itemDetails: null
  });

  // State for item edit modal
  const [editModal, setEditModal] = useState({
    open: false,
    item: null,
    index: null,
    isEdit: false
  });

  // Notify parent when edit modal state changes
  useEffect(() => {
    if (onEditModalStateChange) {
      onEditModalStateChange(editModal.open);
    }
  }, [editModal.open, onEditModalStateChange]);

  // Memoize expensive total calculation
  const calculatedTotal = useMemo(() => {
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
  }, [isEditing, isInvoiceMode, displayItems, total]);

  // Handle delete confirmation
  const handleDeleteClick = (index) => {
    const item = displayItems[index];
    const itemName = item?.item_name || item?.license_plate || `${isInvoiceMode ? 'dịch vụ' : 'hạng mục'} ${index + 1}`;
    
    // Format item details for display
    const itemDetails = {
      'Biển số xe': item?.license_plate || '-',
      [isInvoiceMode ? 'Tên dịch vụ' : 'Hạng mục']: item?.item_name || '-',
      ...(isInvoiceMode ? {
        'Ngày thực hiện': item?.service_date ? new Date(item.service_date).toLocaleDateString('vi-VN') : '-',
        'Ghi chú': item?.notes || '-'
      } : {
        'Ngày lắp đặt': item?.install_date ? new Date(item.install_date).toLocaleDateString('vi-VN') : '-',
        'Ngày hết hạn': item?.expiry_date ? new Date(item.expiry_date).toLocaleDateString('vi-VN') : '-'
      }),
      'Đơn giá': formatCurrency(item?.price || 0),
      'Số lượng': item?.quantity || 0,
      'Thuế': `${item?.tax_rate || 0}%`,
      'Thành tiền': formatCurrency(item?.total || 0)
    };
    
    setDeleteConfirmation({
      open: true,
      index,
      itemName,
      itemDetails
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation.index !== null) {
      onDeleteItem(deleteConfirmation.index);
    }
    setDeleteConfirmation({ open: false, index: null, itemName: '', itemDetails: null });
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({ open: false, index: null, itemName: '', itemDetails: null });
  };

  // Handle item edit
  const handleEditItem = (index) => {
    const item = displayItems[index];
    setEditModal({
      open: true,
      item: { ...item },
      index,
      isEdit: true
    });
  };

  const handleCloseEditModal = () => {
    setEditModal({
      open: false,
      item: null,
      index: null,
      isEdit: false
    });
  };

  const handleSaveItem = async (updatedItem) => {
    if (editModal.index !== null) {
      // Call the existing onItemChange handler for each field
      Object.keys(updatedItem).forEach(field => {
        if (field !== 'total') { // Don't update total directly, it's calculated
          onItemChange(editModal.index, field, updatedItem[field]);
        }
      });
    }
    handleCloseEditModal();
  };

  return (
    <div className="text-sm">
      <h2 className="text-base font-semibold text-gray-700 mb-3">{isInvoiceMode ? 'Danh sách dịch vụ' : 'Danh sách hạng mục'}</h2>
      {errors.items && (
        <div className="text-red-500 text-sm mb-2">{errors.items}</div>
      )}
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r w-36">Biển số xe</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r min-w-32">{isInvoiceMode ? 'Tên dịch vụ' : 'Hạng mục'}</th>
              {isInvoiceMode ? (
                <>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r w-28">Ngày thực hiện</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r w-40">Ghi chú</th>
                </>
              ) : (
                <>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r w-28">Ngày lắp đặt</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r w-28">Ngày hết hạn</th>
                </>
              )}
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r w-32">Đơn giá (VND)</th>
              <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r w-16">SL</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r w-20">Thuế (%)</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r w-36">Thành tiền</th>
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
                    onDeleteItem={handleDeleteClick}
                    onLicensePlateCellClick={onLicensePlateCellClick}
                    onEditItem={handleEditItem}
                    errors={errors}
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
                  {formatCurrency(calculatedTotal)}
                </td>
                {isEditing && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <ConfirmDialog
        open={deleteConfirmation.open}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa ${deleteConfirmation.itemName}?`}
        details={deleteConfirmation.itemDetails}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Xóa"
        cancelText="Hủy"
        type="delete"
      />

      {/* Item Edit Modal */}
      {!isInvoiceMode && (
        <ExpenseItemEditModal
          isOpen={editModal.open}
          onClose={handleCloseEditModal}
          onSave={handleSaveItem}
          item={editModal.item}
          isEdit={editModal.isEdit}
          licensePlates={licensePlates}
          isLoadingPlates={isLoadingPlates}
          taxRate={taxRate}
        />
      )}

      {/* Invoice Item Edit Modal */}
      {isInvoiceMode && (
        <InvoiceItemEditModal
          isOpen={editModal.open}
          onClose={handleCloseEditModal}
          onSave={handleSaveItem}
          item={editModal.item}
          isEdit={editModal.isEdit}
          licensePlates={licensePlates}
          isLoadingPlates={isLoadingPlates}
          taxRate={taxRate}
        />
      )}
    </div>
  );
};

ExpenseItemsTable.propTypes = {
  items: PropTypes.array,
  isEditing: PropTypes.bool.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onDeleteItem: PropTypes.func.isRequired,
  onLicensePlateCellClick: PropTypes.func,
  total: PropTypes.number,
  isInvoiceMode: PropTypes.bool,
  errors: PropTypes.object,
  licensePlates: PropTypes.array,
  isLoadingPlates: PropTypes.bool,
  taxRate: PropTypes.number,
  onEditModalStateChange: PropTypes.func
};

export default React.memo(ExpenseItemsTable);
