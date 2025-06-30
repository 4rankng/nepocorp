import React from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StatusBadge from '@/components/expense/components/StatusBadge';
import Dropdown from '@components/ui/Dropdown';

const ModalHeader = ({
  title,
  onClose,
  status,
  statusOptions = [],
  isEditing = false,
  onStatusChange,
  showStatusBadge = true,
  showPaymentProof = false,
  paymentProofUrl = null,
  extraButtons = null,
  loading = false,
}) => {
  return (
    <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

        {showStatusBadge && status && !loading && (
          <>
            {isEditing ? (
              <Dropdown
                value={status}
                onChange={onStatusChange}
                options={statusOptions}
                placeholder="Chọn trạng thái"
                className="text-xs"
                style={{ minWidth: '120px' }}
              />
            ) : (
              <>
                <StatusBadge status={status} />
                {showPaymentProof &&
                  status === 'PAID' &&
                  (paymentProofUrl ? (
                    <button
                      onClick={() => window.open(paymentProofUrl, '_blank')}
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
                  ))}
                {extraButtons}
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

ModalHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  status: PropTypes.string,
  statusOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  isEditing: PropTypes.bool,
  onStatusChange: PropTypes.func,
  showStatusBadge: PropTypes.bool,
  showPaymentProof: PropTypes.bool,
  paymentProofUrl: PropTypes.string,
  extraButtons: PropTypes.node,
  loading: PropTypes.bool,
};

export default React.memo(ModalHeader);
