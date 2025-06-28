import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { expenseApi } from '@services/api/expenseApi';
import { PAYMENT_STATUS_LABELS } from '@constants/payment';

// Utility functions
const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'PAID':
      return '#10b981';
    case 'PENDING':
      return '#f59e0b';
    case 'DRAFT':
      return '#6b7280';
    case 'CANCELLED':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

const ExpenseViewModal = ({ open, onClose, expenseId }) => {
  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseApi.getById(expenseId);
      const expenseData = response.data?.data || response.data || response;

      // Ensure items is always an array
      if (expenseData && !Array.isArray(expenseData.items)) {
        expenseData.items = expenseData.items ? [expenseData.items] : [];
      }

      setExpenseData(expenseData);
    } catch (err) {
      setError('Không thể tải thông tin hóa đơn');
      console.error('Error fetching expense data:', err);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    if (open && expenseId) {
      fetchExpenseData();
    }
  }, [open, expenseId, fetchExpenseData]);

  // Handle ESC key to close modal or cancel editing
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setExpenseData(null);
    setError(null);
    onClose();
  }, [onClose]);


  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Compact Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">Chi tiết phiếu chi</h1>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
<CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {expenseData && !loading && (
            <>
              {/* Basic Information Section */}
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Thông tin cơ bản</h2>
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Biển số xe
                    </label>
                    <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                      {expenseData.items?.[0]?.license_plate || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nhà cung cấp
                    </label>
                    <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                      {expenseData.vendor_name || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Loại chi phí
                    </label>
                    <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                      {expenseData.expense_category?.name || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Đơn vị tiền tệ
                    </label>
                    <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                      {expenseData.currency || 'VND'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Tổng tiền
                    </label>
                    <div className="relative">
                      <div className="w-full px-2 py-1.5 pr-8 text-sm font-semibold border border-gray-300 rounded bg-gray-50">
                        {formatCurrency(expenseData.total || 0)}
                      </div>
                      <span className="absolute right-2 top-1.5 text-sm text-gray-500">₫</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information Section */}
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Thông tin thanh toán</h2>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Trạng thái thanh toán
                    </label>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        border: `1px solid ${getPaymentStatusColor(expenseData.payment_status)}`,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: getPaymentStatusColor(expenseData.payment_status),
                        backgroundColor: `${getPaymentStatusColor(expenseData.payment_status)}15`,
                        minWidth: '80px',
                        textAlign: 'center',
                      }}
                    >
                      {PAYMENT_STATUS_LABELS[expenseData.payment_status] || expenseData.payment_status}
                    </span>
                  </div>

                  {expenseData.subtotal && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Tổng cộng (chưa thuế)
                      </label>
                      <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                        {formatCurrency(expenseData.subtotal)} ₫
                      </div>
                    </div>
                  )}

                  {expenseData.tax_rate !== undefined && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Thuế suất (%)
                      </label>
                      <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                        {expenseData.tax_rate}%
                      </div>
                    </div>
                  )}

                  <div className="col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      URL chứng từ
                    </label>
                    {expenseData.payment_status === 'PAID' && expenseData.payment_proof ? (
                      <button
                        onClick={() => window.open(expenseData.payment_proof, '_blank')}
                        className="flex items-center gap-1 px-2 py-1.5 bg-green-50 text-green-700 text-sm border border-green-200 rounded hover:bg-green-100 transition-colors"
                      >
<CloudDownloadIcon sx={{ fontSize: 12 }} />
                        Xem chứng từ
                      </button>
                    ) : (
                      <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 text-gray-500">
                        {expenseData.payment_proof || 'Chưa có chứng từ'}
                      </div>
                    )}
                  </div>
                </div>
              </div>



              {/* Remark Section */}
              {expenseData.remark && (
                <div className="mb-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-8">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ghi chú
                      </label>
                      <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-blue-50 text-blue-700">
                        {expenseData.remark}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancel Reason Section */}
              {expenseData.payment_status === 'CANCELLED' && expenseData.cancel_reason && (
                <div className="mb-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-8">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Lý do hủy
                      </label>
                      <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-red-50 text-red-700">
                        {expenseData.cancel_reason}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Items Section */}
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Danh sách</h2>

                {/* Compact Table - Exact same styling as demo */}
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Biển số xe</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Tên hàng mục</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r">Đơn giá (VND)</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r w-16">SL</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r w-20">Thuế (%)</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r">Thành tiền</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày lắp đặt</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700">Ngày hết hạn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseData.items && expenseData.items.length > 0 ? (
                        expenseData.items.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-gray-50 border-t">
                            <td className="px-3 py-2 text-xs border-r">{item.license_plate || '-'}</td>
                            <td className="px-3 py-2 text-xs border-r">{item.item_name || '-'}</td>
                            <td className="px-3 py-2 text-xs text-right border-r">{formatCurrency(item.price || 0)}</td>
                            <td className="px-3 py-2 text-xs text-center border-r">{item.quantity || 0}</td>
                            <td className="px-3 py-2 text-xs text-right border-r">{item.tax_rate || 0}%</td>
                            <td className="px-3 py-2 text-xs text-right font-medium border-r">{formatCurrency(item.total || 0)}</td>
                            <td className="px-3 py-2 text-xs text-center border-r">{formatDate(item.install_date)}</td>
                            <td className="px-3 py-2 text-xs text-center">{formatDate(item.expiry_date)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="px-3 py-6 text-center text-gray-500 text-xs">
                            Không có dữ liệu hàng mục
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {expenseData.items && expenseData.items.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 font-medium border-t">
                          <td colSpan="5" className="px-3 py-2 text-right text-xs border-r">Tổng cộng:</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold border-r">{formatCurrency(expenseData.total || 0)} ₫</td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

ExpenseViewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  expenseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(ExpenseViewModal);
