import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import StandardModal from '@components/ui/StandardModal';
import ModalHeader from '@components/ui/ModalHeader';
import ModalBody from '@components/ui/ModalBody';
import ModalFooter from '@components/ui/ModalFooter';
import CancelIcon from '@mui/icons-material/Cancel';
import logger from '@services/logger';

const CancelReasonModal = ({
  open,
  onClose,
  onConfirm,
  initialValue = '',
  entityType = 'phiếu' // Can be 'phiếu thu' or 'phiếu chi'
}) => {
  const [cancelReason, setCancelReason] = useState(initialValue);
  const [error, setError] = useState('');

  const handleInputChange = useCallback((e) => {
    setCancelReason(e.target.value);
    setError(''); // Clear error when user types
  }, []);

  const validateReason = useCallback((reason) => {
    if (!reason.trim()) {
      return `Vui lòng nhập lý do hủy ${entityType}`;
    }

    return null;
  }, [entityType]);

  const handleConfirm = useCallback(() => {
    const validationError = validateReason(cancelReason);
    if (validationError) {
      setError(validationError);
      return;
    }

    logger.info(`${entityType} cancellation reason confirmed`, {
      cancelReason: cancelReason.trim()
    });
    onConfirm(cancelReason.trim());
  }, [cancelReason, onConfirm, validateReason, entityType]);

  const handleCancel = useCallback(() => {
    logger.info(`${entityType} cancellation modal cancelled`);
    setCancelReason(initialValue); // Reset to initial value
    setError('');
    onClose();
  }, [initialValue, onClose, entityType]);

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
      style={{ maxHeight: '500px', maxWidth: '500px' }}
    >
      <ModalHeader
        title={`Hủy ${entityType}`}
        subtitle=""
        onClose={handleCancel}
        icon={<CancelIcon className="text-red-600 w-5 h-5" />}
      />

      <ModalBody padding="lg" error={error}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Lý do hủy
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={`Nhập lý do hủy ${entityType}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter
        mode="confirm"
        onClose={handleCancel}
        onConfirm={handleConfirm}
        confirmButtonText="Xác nhận hủy"
        cancelButtonText="Quay lại"
        confirmButtonVariant="danger"
      />
    </StandardModal>
  );
};

CancelReasonModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  initialValue: PropTypes.string,
  entityType: PropTypes.string
};

export default CancelReasonModal;
