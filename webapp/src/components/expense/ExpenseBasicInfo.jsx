import React from 'react';
import PropTypes from 'prop-types';
import Dropdown from '@components/ui/Dropdown';

const ExpenseBasicInfo = ({
  expenseData,
  isEditing,
  editedData,
  onFieldChange,
  expenseCategories,
  isLoadingCategories
}) => {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Thông tin cơ bản</h2>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-10">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nhà cung cấp
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData.vendor_name || ''}
              onChange={(e) => onFieldChange('vendor_name', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập tên nhà cung cấp"
            />
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
              {expenseData.vendor_name || '-'}
            </div>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Loại chi phí
          </label>
          {isEditing ? (
            <Dropdown
              value={editedData.expense_category_id}
              onChange={(value) => onFieldChange('expense_category_id', value)}
              options={expenseCategories.map(cat => ({
                value: cat.id,
                label: cat.name
              }))}
              placeholder="Chọn loại chi phí"
              isLoading={isLoadingCategories}
              className="text-sm"
            />
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
              {expenseData.expense_category?.name || '-'}
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
  isLoadingCategories: PropTypes.bool.isRequired
};

export default ExpenseBasicInfo;