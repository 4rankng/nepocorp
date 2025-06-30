import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import StandardModal from '@components/ui/StandardModal';
import ModalHeader from '@components/ui/ModalHeader';
import ModalBody from '@components/ui/ModalBody';
import ModalFooter from '@components/ui/ModalFooter';
import CancelIcon from '@mui/icons-material/Cancel';
import logger from '@services/logger';
import { maxWidth } from '@mui/system';

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

  return (
    <StandardModal
      open={open}
      onClose={handleCancel}
      className="max-w-md"
      style={{ maxHeight: '400px', maxWidth: '500px' }}
    >
      <ModalHeader
        title={`Hủy ${entityType}`}
        subtitle=""
        onClose={handleCancel}
        icon={<CancelIcon className="text-red-600" />}
      />

      <ModalBody padding="lg" error={error}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lý do hủy
            </label>
            <textarea
              value={cancelReason}
              onChange={handleInputChange}
              placeholder={`Nhập lý do hủy ${entityType}...`}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={4}
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
