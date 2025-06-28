import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function DeleteConfirmationModal() {
  const handleDelete = () => {
    console.log('Deleting payment voucher...');
  };

  const handleCancel = () => {
    console.log('Cancelled deletion');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Xóa phiếu chi</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-gray-700 mb-5">
            Bạn có chắc chắn muốn xóa phiếu chi này?
          </p>

          {/* Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-red-600 mb-3">Thông tin chi tiết</h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Nhà cung cấp:</span>
                <span className="text-sm text-gray-900">Garage Minh Tuấn</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Loại chi phí:</span>
                <span className="text-sm text-gray-900">Bảo dưỡng</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Tổng tiền:</span>
                <span className="text-sm font-semibold text-gray-900">2.200.000 đ</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Trạng thái:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  PAID
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Ngày tạo:</span>
                <span className="text-sm text-gray-900">27/6/2025</span>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-500">Ghi chú:</span>
                <p className="text-sm text-gray-900 mt-1">Bảo dưỡng định kỳ 10,000km</p>
              </div>
            </div>
          </div>

          {/* Warning message */}
          <div className="mt-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <AlertTriangle size={16} />
            Xóa phiếu chi
          </button>
        </div>
      </div>
    </div>
  );
}
