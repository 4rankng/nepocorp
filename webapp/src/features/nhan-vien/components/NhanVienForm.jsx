import React from 'react';

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
  vehicles = [], // List of available vehicles
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
            <label htmlFor="ma_so" className="block text-sm font-medium text-gray-700">
              Mã nhân viên *
            </label>
            <input
              type="text"
              name="ma_so"
              id="ma_so"
              value={formData.ma_so || ''}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
              disabled={!!editingEmployee}
              placeholder="VD: NV001"
              pattern="[Nn][Vv]\d{3,}"
              title="Mã nhân viên phải bắt đầu bằng NV hoặc nv và ít nhất 3 chữ số"
            />
          </div>
          <div>
            <label htmlFor="ho_ten" className="block text-sm font-medium text-gray-700">
              Tên nhân viên *
            </label>
            <input
              type="text"
              name="ho_ten"
              id="ho_ten"
              value={formData.ho_ten}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="ten_dang_nhap" className="block text-sm font-medium text-gray-700">
              Tên đăng nhập
            </label>
            <input
              type="text"
              name="ten_dang_nhap"
              id="ten_dang_nhap"
              value={formData.ten_dang_nhap}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="mat_khau" className="block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              type="password"
              name="mat_khau"
              id="mat_khau"
              value={formData.mat_khau}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={editingEmployee ? 'Để trống nếu không muốn thay đổi' : ''}
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
              value={formData.email}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="chuc_vu" className="block text-sm font-medium text-gray-700">
              Chức vụ *
            </label>
            <select
              name="chuc_vu"
              id="chuc_vu"
              value={formData.chuc_vu}
              onChange={onFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {employeeRoles.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {formData.chuc_vu === 'Lái xe' && (
            <div>
              <label htmlFor="bienSoXe" className="block text-sm font-medium text-gray-700">
                Biển số xe đầu kéo
              </label>
              <select
                name="bienSoXe"
                id="bienSoXe"
                value={formData.bienSoXe || ''}
                onChange={onFormChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Chọn biển số xe</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.licensePlate}>
                    {vehicle.licensePlate}
                  </option>
                ))}
              </select>
            </div>
          )}
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
