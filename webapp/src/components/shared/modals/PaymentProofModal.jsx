import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import StandardModal from '@components/ui/StandardModal';
import ModalHeader from '@components/ui/ModalHeader';
import ModalBody from '@components/ui/ModalBody';
import ModalFooter from '@components/ui/ModalFooter';
import PaymentIcon from '@mui/icons-material/Payment';
import logger from '@services/logger';

const PaymentProofModal = ({
  open,
  onClose,
  onConfirm,
  initialValue = ''
}) => {
  const [paymentProof, setPaymentProof] = useState(initialValue);
  const [error, setError] = useState('');

  const handleInputChange = useCallback((e) => {
    setPaymentProof(e.target.value);
    setError(''); // Clear error when user types
  }, []);

  const validateUrl = useCallback((url) => {
    if (!url.trim()) {
      return 'Vui lòng nhập URL chứng từ thanh toán';
    }

    try {
      // Basic URL validation
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(url.trim())) {
        return 'URL phải bắt đầu bằng http:// hoặc https://';
      }
      return null;
    } catch (e) {
      return 'URL không hợp lệ';
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const validationError = validateUrl(paymentProof);
    if (validationError) {
      setError(validationError);
      return;
    }

    logger.info('Payment proof confirmed', { paymentProof: paymentProof.trim() });
    onConfirm(paymentProof.trim());
  }, [paymentProof, onConfirm, validateUrl]);

  const handleCancel = useCallback(() => {
    logger.info('Payment proof modal cancelled');
    setPaymentProof(initialValue); // Reset to initial value
    setError('');
    onClose();
  }, [initialValue, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleCancel]);

  // Handle Enter key on input
  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  }, [handleConfirm]);

  return (
    <StandardModal
      open={open}
      onClose={handleCancel}
      className="max-w-md"
      style={{ maxHeight: '400px', maxWidth: '500px'}}
    >
      <ModalHeader
        title="Chứng từ thanh toán"
        subtitle=""
        onClose={handleCancel}
        icon={<PaymentIcon className="text-blue-600 w-5 h-5" />}
      />

      <ModalBody padding="lg" error={error}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-700 mb-2">
              URL chứng từ
            </label>
            <input
              type="url"
              value={paymentProof}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="https://example.com/payment-proof.pdf"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter
        mode="confirm"
        onClose={handleCancel}
        onConfirm={handleConfirm}
        confirmButtonText="Xác nhận"
        cancelButtonText="Hủy"
        confirmButtonVariant="primary"
      />
    </StandardModal>
  );
};

PaymentProofModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  initialValue: PropTypes.string
};

export default PaymentProofModal;
