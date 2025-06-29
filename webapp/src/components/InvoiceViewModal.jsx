import React, { useState, useEffect } from 'react';
import { invoiceApi } from '@services/api/invoiceApi';
import { INVOICE_STATUS_LABELS } from '@constants/invoice';
import { formatCurrency, formatDate } from '@utils/format';
import CloseIcon from '@mui/icons-material/Close';

const InvoiceViewModal = ({ open, onClose, invoiceId }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!open || !invoiceId) return;

      setLoading(true);
      setError('');
      
      try {
        const response = await invoiceApi.getById(invoiceId);
        setInvoice(response.data?.data || response.data || response);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Không thể tải thông tin hóa đơn');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [open, invoiceId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Chi tiết hóa đơn #{invoice?.id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-8">
              <p>{error}</p>
            </div>
          ) : invoice ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin khách hàng</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Tên khách hàng:</span>
                      <p className="font-medium">{invoice.customer?.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Mã số thuế:</span>
                      <p className="font-medium">{invoice.customer?.tax_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Địa chỉ:</span>
                      <p className="font-medium">{invoice.customer?.address || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin hóa đơn</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Loại hóa đơn:</span>
                      <p className="font-medium">{invoice.invoice_category?.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Trạng thái:</span>
                      <p className="font-medium">{INVOICE_STATUS_LABELS[invoice.payment_status] || invoice.payment_status}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Ngày tạo:</span>
                      <p className="font-medium">{formatDate(invoice.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Người tạo:</span>
                      <p className="font-medium">{invoice.created_by_user?.name || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {(invoice.payment_proof || invoice.cancel_reason) && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin thanh toán</h3>
                  <div className="space-y-2">
                    {invoice.payment_proof && (
                      <div>
                        <span className="text-sm text-gray-500">Chứng từ thanh toán:</span>
                        <p className="font-medium">
                          <a href={invoice.payment_proof} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {invoice.payment_proof}
                          </a>
                        </p>
                      </div>
                    )}
                    {invoice.cancel_reason && (
                      <div>
                        <span className="text-sm text-gray-500">Lý do hủy:</span>
                        <p className="font-medium text-red-600">{invoice.cancel_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Danh sách dịch vụ</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-3 text-left">Biển số xe</th>
                        <th className="border p-3 text-left">Tên dịch vụ</th>
                        <th className="border p-3 text-right">Đơn giá</th>
                        <th className="border p-3 text-right">Số lượng</th>
                        <th className="border p-3 text-right">Thành tiền</th>
                        <th className="border p-3 text-left">Ngày thực hiện</th>
                        <th className="border p-3 text-left">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="border p-3">{item.license_plate}</td>
                          <td className="border p-3">{item.item_name}</td>
                          <td className="border p-3 text-right">{formatCurrency(item.price)}</td>
                          <td className="border p-3 text-right">{item.quantity}</td>
                          <td className="border p-3 text-right">{formatCurrency(item.total)}</td>
                          <td className="border p-3">{item.service_date ? formatDate(item.service_date) : '-'}</td>
                          <td className="border p-3">{item.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan="4" className="border p-3 text-right">Tổng cộng:</td>
                        <td className="border p-3 text-right">{formatCurrency(invoice.total)}</td>
                        <td colSpan="2" className="border p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {invoice.remark && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Ghi chú</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{invoice.remark}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal;