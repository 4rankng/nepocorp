import React from 'react';
import PropTypes from 'prop-types';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const PaymentProofButton = ({ paymentProof, disabled = false }) => {
  if (!paymentProof) {
    return (
      <button
        disabled
        className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-400 text-xs font-medium rounded cursor-not-allowed"
        title="Chưa có chứng từ"
      >
        <OpenInNewIcon sx={{ fontSize: 14 }} />
        <span>Chưa có chứng từ</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => window.open(paymentProof, '_blank')}
      disabled={disabled}
      className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition-colors ${
        disabled 
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      title="Xem chứng từ thanh toán"
    >
      <OpenInNewIcon sx={{ fontSize: 14 }} />
      <span>Xem chứng từ</span>
    </button>
  );
};

PaymentProofButton.propTypes = {
  paymentProof: PropTypes.string,
  disabled: PropTypes.bool
};

export default PaymentProofButton;