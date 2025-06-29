import React from 'react';
import PropTypes from 'prop-types';
import Dropdown from '@components/ui/Dropdown';
import { shouldUsePortal, Z_INDEX } from '@constants/zIndex';
import { getExpenseCategoryLabel } from '@constants/expenseCategories';
import { getInvoiceCategoryLabel } from '@constants/invoiceCategories';

const ExpenseBasicInfo = ({
  expenseData,
  isEditing,
  editedData,
  onFieldChange,
  expenseCategories,
  isLoadingCategories,
  isInModal = false,
  isInvoiceMode = false,
  customers = [],
  isLoadingCustomers = false,
  errors = {}
}) => {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Thông tin cơ bản</h2>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Ngày {isInvoiceMode ? 'phiếu thu' : 'chi phí'}
            {isEditing && !editedData.expense_date && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          {isEditing ? (
            <>
              <input
                type="date"
                value={editedData.expense_date || ''}
                onChange={(e) => onFieldChange('expense_date', e.target.value)}
                className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 ${
                  errors.expense_date
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.expense_date && (
                <div className="text-red-500 text-xs mt-1">{errors.expense_date}</div>
              )}
            </>
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
              {expenseData.expense_date || '-'}
            </div>
          )}
        </div>
        <div className="col-span-8">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {isInvoiceMode ? 'Khách hàng' : 'Nhà cung cấp'}
            {isEditing && (isInvoiceMode ? !editedData.customer_id : !editedData.vendor_name) && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          {isEditing ? (
            isInvoiceMode ? (
              <>
                <Dropdown
                  value={editedData.customer_id}
                  onChange={(value) => onFieldChange('customer_id', value)}
                  options={customers.map(customer => ({
                    value: customer.id,
                    label: customer.name
                  }))}
                  placeholder="Chọn khách hàng"
                  isLoading={isLoadingCustomers}
                  className={`text-sm ${
                    errors.customer_id ? 'border-red-500' : ''
                  }`}
                  usePortal={isInModal && shouldUsePortal(Z_INDEX.DROPDOWN)}
                />
                {errors.customer_id && (
                  <div className="text-red-500 text-xs mt-1">{errors.customer_id}</div>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={editedData.vendor_name || ''}
                  onChange={(e) => onFieldChange('vendor_name', e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 ${
                    errors.vendor_name
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Nhập tên nhà cung cấp"
                />
                {errors.vendor_name && (
                  <div className="text-red-500 text-xs mt-1">{errors.vendor_name}</div>
                )}
              </>
            )
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
              {isInvoiceMode ? (expenseData.customer?.name || '-') : (expenseData.vendor_name || '-')}
            </div>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {isInvoiceMode ? 'Loại phiếu thu' : 'Loại chi phí'}
            {isEditing && (isInvoiceMode ? !editedData.invoice_category_id : !editedData.expense_category_id) && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          {isEditing ? (
            <>
              <Dropdown
                value={isInvoiceMode ? editedData.invoice_category_id : editedData.expense_category_id}
                onChange={(value) => onFieldChange(isInvoiceMode ? 'invoice_category_id' : 'expense_category_id', value)}
                options={expenseCategories.map(cat => ({
                  value: cat.id,
                  label: isInvoiceMode ? getInvoiceCategoryLabel(cat.name) : getExpenseCategoryLabel(cat.name)
                }))}
                placeholder={isInvoiceMode ? "Chọn loại phiếu thu" : "Chọn loại chi phí"}
                isLoading={isLoadingCategories}
                className={`text-sm ${
                  (isInvoiceMode ? errors.invoice_category_id : errors.expense_category_id) ? 'border-red-500' : ''
                }`}
                usePortal={isInModal && shouldUsePortal(Z_INDEX.DROPDOWN)}
              />
              {(isInvoiceMode ? errors.invoice_category_id : errors.expense_category_id) && (
                <div className="text-red-500 text-xs mt-1">
                  {isInvoiceMode ? errors.invoice_category_id : errors.expense_category_id}
                </div>
              )}
            </>
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
              {isInvoiceMode
                ? (expenseData.invoice_category?.name ? getInvoiceCategoryLabel(expenseData.invoice_category.name) : '-')
                : (expenseData.expense_category?.name ? getExpenseCategoryLabel(expenseData.expense_category.name) : '-')
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ExpenseBasicInfo.propTypes = {
  expenseData: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
  editedData: PropTypes.object,
  onFieldChange: PropTypes.func.isRequired,
  expenseCategories: PropTypes.array.isRequired,
  isLoadingCategories: PropTypes.bool.isRequired,
  isInModal: PropTypes.bool,
  isInvoiceMode: PropTypes.bool,
  customers: PropTypes.array,
  isLoadingCustomers: PropTypes.bool,
  errors: PropTypes.object
};

export default React.memo(ExpenseBasicInfo);
