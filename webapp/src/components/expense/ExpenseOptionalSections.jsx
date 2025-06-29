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
  const showPaymentProof = (isEditing && editedData.payment_status === 'PAID') ||
    (!isEditing && expenseData.payment_proof);

  return (
    <>
      {showRemark && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Ghi chú</h2>
          {isEditing ? (
            <textarea
              value={editedData.remark || ''}
              onChange={(e) => onFieldChange('remark', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập ghi chú"
              rows="1"
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
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Lý do hủy
              </label>
              {isEditing && editedData.payment_status === 'CANCELLED' ? (
                <textarea
                  value={editedData.cancel_reason || ''}
                  onChange={(e) => onFieldChange('cancel_reason', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Nhập lý do hủy"
                  rows="2"
                />
              ) : (
                <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-red-50 text-red-700">
                  {expenseData.cancel_reason || '-'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPaymentProof && (
        <div className="mb-4">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                URL chứng từ thanh toán
              </label>
              {isEditing && editedData.payment_status === 'PAID' ? (
                <input
                  type="url"
                  value={editedData.payment_proof || ''}
                  onChange={(e) => onFieldChange('payment_proof', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="https://example.com/payment-proof"
                />
              ) : (
                <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-green-50 text-green-700">
                  {expenseData.payment_proof || '-'}
                </div>
              )}
            </div>
          </div>
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

export default ExpenseOptionalSections;