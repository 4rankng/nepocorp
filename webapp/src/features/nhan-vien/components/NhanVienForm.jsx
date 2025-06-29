import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
const NhanVienForm = ({
  open,
  onClose,
  editingEmployee,
  formData,
  onFormChange,
  onSave,
  isLoading,
  error,
  employeeRoles,
}) => {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          {editingEmployee ? 'Chỉnh Sửa Thông Tin Nhân Viên' : 'Thêm Nhân Viên Mới'}
        </h2>
        {error && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{error}</p>}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Tên nhân viên *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name || ''}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Tên đăng nhập *
            </label>
            <input
              type="text"
              name="username"
              id="username"
              value={formData.username || ''}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mật khẩu {!editingEmployee && '*'}
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password || ''}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={editingEmployee ? 'Để trống nếu không muốn thay đổi' : ''}
              required={!editingEmployee}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email || ''}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <Dropdown
            label="Chức vụ"
            name="role"
            value={formData.role || ''}
            onChange={onFormChange}
            options={employeeRoles}
            placeholder="Chọn chức vụ"
            required
            searchable={false}
            clearable={false}
          />
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
          >
            {isLoading ? (editingEmployee ? 'Đang sửa...' : 'Đang lưu...') : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default NhanVienForm;
