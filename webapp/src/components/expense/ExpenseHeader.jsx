import React from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import Dropdown from '@components/ui/Dropdown';
import StatusBadge from '@components/ui/StatusBadge';
import PaymentProofButton from '@components/ui/PaymentProofButton';
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '@constants/payment';
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from '@constants/invoice';
import { getPaymentStatusColor } from '@utils/expenseHelpers';

const ExpenseHeader = ({
  expenseData,
  loading,
  isEditing,
  editedData,
  onClose,
  onFieldChange,
  title,
  statusOptions = null // Allow custom status options for different entity types
}) => {
  return (
    <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">
          {title || 'Chi tiết phiếu chi'}
        </h1>
        {expenseData && !loading && (
          <>
            {isEditing ? (
              <>
                <Dropdown
                  value={editedData.payment_status}
                  onChange={(value) => onFieldChange('payment_status', value)}
                  options={statusOptions || Object.entries(PAYMENT_STATUS).map(([key, value]) => ({
                    value: value,
                    label: PAYMENT_STATUS_LABELS[value],
                    color: getPaymentStatusColor(value)
                  }))}
                  placeholder="Chọn trạng thái"
                  className="text-xs"
                  style={{ minWidth: '120px' }}
                  usePortal={false}
                />
                {(editedData.payment_status === 'PAID' || editedData.payment_status === PAYMENT_STATUS.PAID || editedData.payment_status === INVOICE_STATUS.PAID) && (
                  <PaymentProofButton paymentProof={editedData.payment_proof} />
                )}
              </>
            ) : (
              <>
                <StatusBadge
                  status={expenseData.payment_status}
                  label={statusOptions ? 
                    statusOptions.find(opt => opt.value === expenseData.payment_status)?.label :
                    PAYMENT_STATUS_LABELS[expenseData.payment_status]
                  }
                  color={getPaymentStatusColor(expenseData.payment_status)}
                />
                {expenseData.payment_status === 'PAID' && (
                  <PaymentProofButton paymentProof={expenseData.payment_proof} />
                )}
              </>
            )}
          </>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600"
      >
        <CloseIcon sx={{ fontSize: 20 }} />
      </button>
    </div>
  );
};

ExpenseHeader.propTypes = {
  expenseData: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  editedData: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  title: PropTypes.string,
  statusOptions: PropTypes.array
};

export default ExpenseHeader;