import React from 'react';
import PropTypes from 'prop-types';

const StatusChangePrompts = ({
  showPaymentProofPrompt = false,
  showCancelReasonPrompt = false,
  tempPaymentProof = '',
  tempCancelReason = '',
  onPaymentProofChange,
  onCancelReasonChange,
  onPaymentProofConfirm,
  onCancelReasonConfirm,
  onCancel,
}) => {
  if (!showPaymentProofPrompt && !showCancelReasonPrompt) {
    return null;
  }

  return (
    <>
      {/* Payment Proof Prompt */}
      {showPaymentProofPrompt && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            Nhập URL chứng từ thanh toán
          </h3>
          <input
            type="url"
            value={tempPaymentProof}
            onChange={(e) => onPaymentProofChange(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onPaymentProofConfirm}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              Xác nhận
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Cancel Reason Prompt */}
      {showCancelReasonPrompt && (
        <div className="p-4 bg-red-50 border border-red-200 rounded mb-4">
          <h3 className="text-sm font-medium text-red-900 mb-2">
            Nhập lý do hủy
          </h3>
          <textarea
            value={tempCancelReason}
            onChange={(e) => onCancelReasonChange(e.target.value)}
            placeholder="Lý do hủy phiếu thu..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2 resize-none focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onCancelReasonConfirm}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
            >
              Xác nhận
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </>
  );
};

StatusChangePrompts.propTypes = {
  showPaymentProofPrompt: PropTypes.bool,
  showCancelReasonPrompt: PropTypes.bool,
  tempPaymentProof: PropTypes.string,
  tempCancelReason: PropTypes.string,
  onPaymentProofChange: PropTypes.func.isRequired,
  onCancelReasonChange: PropTypes.func.isRequired,
  onPaymentProofConfirm: PropTypes.func.isRequired,
  onCancelReasonConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default React.memo(StatusChangePrompts);
