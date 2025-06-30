import React from 'react';
import PropTypes from 'prop-types';

const ExpenseOptionalSections = ({
  expenseData,
  isEditing,
  editedData,
  onFieldChange
}) => {
  const showRemark = expenseData.remark || isEditing;
  const showCancelReason = (isEditing ? editedData.payment_status === 'CANCELLED' : expenseData.payment_status === 'CANCELLED') ||
    (expenseData.cancel_reason && !isEditing);
  const showBoth = showRemark && showCancelReason;

  // If both fields should be shown, render them in a grid
  if (showBoth) {
    return (
      <div className="mb-4 grid grid-cols-2 gap-4">
        {/* Ghi chú - 50% width */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Ghi chú</h2>
          {isEditing ? (
            <input
              type="text"
              value={editedData.remark || ''}
              onChange={(e) => onFieldChange('remark', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập ghi chú"
            />
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-blue-50 text-blue-700">
              {expenseData.remark}
            </div>
          )}
        </div>

        {/* Lý do hủy - 50% width */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Lý do hủy</h2>
          {isEditing && editedData.payment_status === 'CANCELLED' ? (
            <input
              type="text"
              value={editedData.cancel_reason || ''}
              onChange={(e) => onFieldChange('cancel_reason', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập lý do hủy"
            />
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-red-50 text-red-700">
              {expenseData.cancel_reason || '-'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If only one field should be shown, render it full width
  return (
    <>
      {showRemark && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Ghi chú</h2>
          {isEditing ? (
            <input
              type="text"
              value={editedData.remark || ''}
              onChange={(e) => onFieldChange('remark', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập ghi chú"
            />
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-blue-50 text-blue-700">
              {expenseData.remark}
            </div>
          )}
        </div>
      )}

      {showCancelReason && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Lý do hủy</h2>
          {isEditing && editedData.payment_status === 'CANCELLED' ? (
            <input
              type="text"
              value={editedData.cancel_reason || ''}
              onChange={(e) => onFieldChange('cancel_reason', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập lý do hủy"
            />
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-red-50 text-red-700">
              {expenseData.cancel_reason || '-'}
            </div>
          )}
        </div>
      )}
    </>
  );
};

ExpenseOptionalSections.propTypes = {
  expenseData: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
  editedData: PropTypes.object,
  onFieldChange: PropTypes.func.isRequired
};

export default React.memo(ExpenseOptionalSections);