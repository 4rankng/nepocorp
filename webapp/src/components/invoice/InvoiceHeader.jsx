import React from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import StatusDropdown from '@components/ui/StatusDropdown';
import StatusBadge from '@components/ui/StatusBadge';
import PaymentProofButton from '@components/ui/PaymentProofButton';
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from '@constants/invoice';

const InvoiceHeader = ({
  invoiceData,
  loading,
  isEditing,
  editedData,
  onClose,
  onFieldChange,
  title,
  statusOptions,
}) => {
  return (
    <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{title || 'Chi tiết phiếu thu'}</h1>
        {invoiceData && !loading && (
          <>
            {isEditing ? (
              <>
                <StatusDropdown
                  value={editedData.payment_status}
                  onChange={value => onFieldChange('payment_status', value)}
                  options={statusOptions}
                  placeholder="Chọn trạng thái"
                  className="text-xs"
                />
                {editedData.payment_status === INVOICE_STATUS.PAID && (
                  <PaymentProofButton paymentProof={editedData.payment_proof} />
                )}
              </>
            ) : (
              <>
                <StatusBadge
                  status={invoiceData.payment_status}
                  label={INVOICE_STATUS_LABELS[invoiceData.payment_status]}
                  color={statusOptions.find(opt => opt.value === invoiceData.payment_status)?.color}
                />
                {invoiceData.payment_status === INVOICE_STATUS.PAID && (
                  <PaymentProofButton paymentProof={invoiceData.payment_proof} />
                )}
              </>
            )}
          </>
        )}
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <CloseIcon sx={{ fontSize: 20 }} />
      </button>
    </div>
  );
};

InvoiceHeader.propTypes = {
  invoiceData: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  editedData: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  title: PropTypes.string,
  statusOptions: PropTypes.array.isRequired,
};

export default React.memo(InvoiceHeader);