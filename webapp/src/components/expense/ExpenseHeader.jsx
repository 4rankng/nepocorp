import React from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Dropdown from '@components/ui/Dropdown';
import StatusBadge from '@components/ui/StatusBadge';
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
              <Dropdown
                value={editedData.payment_status}
                onChange={(value) => onFieldChange('payment_status', value)}
                options={statusOptions || Object.entries(PAYMENT_STATUS).map(([key, value]) => ({
                  value: value,
                  label: PAYMENT_STATUS_LABELS[value]
                }))}
                placeholder="Chọn trạng thái"
                className="text-xs"
                style={{ minWidth: '120px' }}
                usePortal={false}
              />
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
                  expenseData.payment_proof ? (
                    <button
                      onClick={() => window.open(expenseData.payment_proof, '_blank')}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      title="Xem chứng từ thanh toán"
                    >
                      <OpenInNewIcon sx={{ fontSize: 14 }} />
                      <span>Xem chứng từ</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-400 text-xs font-medium rounded cursor-not-allowed"
                      title="Chưa có chứng từ"
                    >
                      <OpenInNewIcon sx={{ fontSize: 14 }} />
                      <span>Chưa có chứng từ</span>
                    </button>
                  )
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