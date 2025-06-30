import React from 'react';
import PropTypes from 'prop-types';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const PaymentProofSection = ({
  data,
  isEditing,
  onFieldChange,
  showRemark = true,
  showCancelReason = true,
  showPaymentProof = true,
}) => {
  const paymentStatus = isEditing ? data.payment_status : data.payment_status;

  return (
    <>
      {showRemark && (data.remark || isEditing) && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Ghi chú</h2>
          {isEditing ? (
            <textarea
              value={data.remark || ''}
              onChange={e => onFieldChange('remark', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập ghi chú"
              rows="2"
            />
          ) : (
            <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-blue-50 text-blue-700">
              {data.remark}
            </div>
          )}
        </div>
      )}

      {showCancelReason &&
        (paymentStatus === 'CANCELLED' || (!isEditing && data.cancel_reason)) && (
          <div className="mb-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-8">
                <label className="block text-xs font-medium text-gray-600 mb-1">Lý do hủy</label>
                {isEditing && paymentStatus === 'CANCELLED' ? (
                  <textarea
                    value={data.cancel_reason || ''}
                    onChange={e => onFieldChange('cancel_reason', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Nhập lý do hủy"
                    rows="2"
                  />
                ) : (
                  <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-red-50 text-red-700">
                    {data.cancel_reason || '-'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {showPaymentProof &&
        ((isEditing && paymentStatus === 'PAID') || (!isEditing && data.payment_proof)) && (
          <div className="mb-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-8">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  URL chứng từ thanh toán
                </label>
                {isEditing && paymentStatus === 'PAID' ? (
                  <input
                    type="url"
                    value={data.payment_proof || ''}
                    onChange={e => onFieldChange('payment_proof', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="https://example.com/payment-proof"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded bg-green-50 text-green-700">
                      {data.payment_proof || '-'}
                    </div>
                    {!isEditing && data.payment_proof && (
                      <button
                        onClick={() => window.open(data.payment_proof, '_blank')}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                        title="Xem chứng từ thanh toán"
                      >
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                        <span>Xem</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </>
  );
};

PaymentProofSection.propTypes = {
  data: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  showRemark: PropTypes.bool,
  showCancelReason: PropTypes.bool,
  showPaymentProof: PropTypes.bool,
};

export default React.memo(PaymentProofSection);
