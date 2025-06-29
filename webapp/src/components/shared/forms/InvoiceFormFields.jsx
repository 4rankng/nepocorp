import React from 'react';
import PropTypes from 'prop-types';
import { formatDate } from '@utils/format';
import { INVOICE_STATUS_LABELS } from '@constants/invoice';

const InvoiceFormFields = ({
  data,
  isEditing = false,
  onFieldChange,
  className = ''
}) => {
  const displayData = data || {};

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin khách hàng</h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Tên khách hàng:</span>
              <p className="font-medium">{displayData.customer?.name || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Mã số thuế:</span>
              <p className="font-medium">{displayData.customer?.tax_code || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Địa chỉ:</span>
              <p className="font-medium">{displayData.customer?.address || '-'}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin phiếu thu</h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-500">Loại phiếu thu:</span>
              <p className="font-medium">{displayData.invoice_category?.name || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Trạng thái:</span>
              <p className="font-medium">
                {INVOICE_STATUS_LABELS[displayData.payment_status] || displayData.payment_status}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Ngày tạo:</span>
              <p className="font-medium">{formatDate(displayData.created_at)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Người tạo:</span>
              <p className="font-medium">{displayData.created_by_user?.name || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      {(displayData.payment_proof || displayData.cancel_reason) && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin thanh toán</h3>
          <div className="space-y-2">
            {displayData.payment_proof && (
              <div>
                <span className="text-sm text-gray-500">Chứng từ thanh toán:</span>
                <p className="font-medium">
                  <a
                    href={displayData.payment_proof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {displayData.payment_proof}
                  </a>
                </p>
              </div>
            )}
            {displayData.cancel_reason && (
              <div>
                <span className="text-sm text-gray-500">Lý do hủy:</span>
                <p className="font-medium text-red-600">{displayData.cancel_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remarks */}
      {(displayData.remark || isEditing) && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ghi chú</h3>
          {isEditing ? (
            <textarea
              value={displayData.remark || ''}
              onChange={(e) => onFieldChange('remark', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              placeholder="Ghi chú thêm..."
            />
          ) : (
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{displayData.remark}</p>
          )}
        </div>
      )}
    </div>
  );
};

InvoiceFormFields.propTypes = {
  data: PropTypes.object,
  isEditing: PropTypes.bool,
  onFieldChange: PropTypes.func,
  className: PropTypes.string,
};

export default React.memo(InvoiceFormFields);
