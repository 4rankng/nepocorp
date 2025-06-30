import React from 'react';
import PropTypes from 'prop-types';
import PaymentProofModal from './PaymentProofModal';
import CancelReasonModal from './CancelReasonModal';

const StatusChangePrompts = ({
  showPaymentProofPrompt,
  showCancelReasonPrompt,
  tempPaymentProof,
  tempCancelReason,
  onPaymentProofChange,
  onCancelReasonChange,
  onPaymentProofConfirm,
  onCancelReasonConfirm,
  onCancel
}) => {
  return (
    <>
      <PaymentProofModal
        open={showPaymentProofPrompt}
        onClose={onCancel}
        onConfirm={onPaymentProofConfirm}
        initialValue={tempPaymentProof}
      />
      <CancelReasonModal
        open={showCancelReasonPrompt}
        onClose={onCancel}
        onConfirm={onCancelReasonConfirm}
        initialValue={tempCancelReason}
        entityType="phiếu chi"
      />
    </>
  );
};

StatusChangePrompts.propTypes = {
  showPaymentProofPrompt: PropTypes.bool.isRequired,
  showCancelReasonPrompt: PropTypes.bool.isRequired,
  tempPaymentProof: PropTypes.string,
  tempCancelReason: PropTypes.string,
  onPaymentProofChange: PropTypes.func.isRequired,
  onCancelReasonChange: PropTypes.func.isRequired,
  onPaymentProofConfirm: PropTypes.func.isRequired,
  onCancelReasonConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

StatusChangePrompts.defaultProps = {
  tempPaymentProof: '',
  tempCancelReason: ''
};

export default StatusChangePrompts;