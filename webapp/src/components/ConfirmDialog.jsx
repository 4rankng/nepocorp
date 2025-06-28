import React, { useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CircularProgress from '@mui/material/CircularProgress';

const ConfirmDialog = ({
  open,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  details = null,
  onConfirm,
  onCancel,
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  confirmColor = 'primary',
  icon: Icon = null,
  iconColor = 'primary',
  type = 'info', // 'info' | 'delete' | 'warning'
  maxWidth = 'sm',
  content = null, // Custom content render function
  data = null, // Data to pass to content render function
  isLoading = false,
  disableEscapeKeyDown = false,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!disableEscapeKeyDown && e.key === 'Escape' && open && onCancel) {
        onCancel();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, disableEscapeKeyDown, onCancel]);

  if (!open) return null;

  // Helper function to get payment status styling
  const getPaymentStatusStyle = (status) => {
    switch (status) {
      case 'Đã thanh toán':
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'Chờ thanh toán':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'Nháp':
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'Đã hủy':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Render details with special handling for certain fields
  const renderDetailValue = (key, value) => {
    if (key === 'Trạng thái') {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPaymentStatusStyle(value)}`}>
          {value}
        </span>
      );
    }
    if (key === 'Tổng tiền') {
      return <span className="text-sm font-semibold text-gray-900">{value}</span>;
    }
    return <span className="text-sm text-gray-900">{value || '-'}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <WarningAmberIcon className="w-5 h-5 text-red-500" sx={{ fontSize: 20 }} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-gray-700 mb-5">{message}</p>

          {/* Details */}
          {details && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-red-600 mb-3">Thông tin chi tiết</h3>

              <div className="space-y-2">
                {Object.entries(details).map(([key, value]) => {
                  // Handle special case for "Ghi chú" field
                  if (key === 'Ghi chú') {
                    return (
                      <div key={key} className="pt-2 border-t border-gray-200">
                        <span className="text-sm text-gray-500">{key}:</span>
                        <p className="text-sm text-gray-900 mt-1">{value || '-'}</p>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{key}:</span>
                      {renderDetailValue(key, value)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom content */}
          {content && content(data)}

          {/* Warning message */}
          {type === 'delete' && (
            <div className="mt-4 flex items-start gap-2">
              <WarningAmberIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" sx={{ fontSize: 16 }} />
              <p className="text-xs text-gray-600">
                Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'delete' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <CircularProgress size={16} className="text-white" />
            ) : (
              type === 'delete' && <WarningAmberIcon sx={{ fontSize: 16 }} />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
