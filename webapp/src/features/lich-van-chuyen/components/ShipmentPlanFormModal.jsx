import React, { useState, useEffect } from 'react';

// SVG Icons (assuming they might be used for internal modal elements if any, or can be removed if not)
// For simplicity, I'll omit them here if not directly used in the form itself.

// Helper to format date from YYYY-MM-DD to DD/MM/YYYY for display
const formatDateForDisplay = dateStr_YYYYMMDD => {
  if (!dateStr_YYYYMMDD) return '-';
  const [year, month, day] = dateStr_YYYYMMDD.split('-');
  return `${day}/${month}/${year}`;
};

// Helper to format date from DD/MM/YYYY or other formats to YYYY-MM-DD for date input
const formatDateForInput = dateStr => {
  if (!dateStr) return '';
  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const parts = dateStr.split('/'); // Assuming DD/MM/YYYY
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  // Fallback for other potential date objects or invalid strings
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

const initialFormStateForModal = {
  ngayThang: new Date().toISOString().split('T')[0],
  dienGiai: '',
  khachHangId: '',
  soLuongContainer: 1,
  loaiContainerId: '',
  tuyenDuongDi: '',
  tuyenDuongDen: '',
  cuocVanChuyen: 0,
  bienSoXeId: '',
  cuocThueVanChuyen: 0,
  doiTacId: '',
  thongTinContainer: [{ soContainer: '', soSeal: '' }],
  ngayHaHang: '',
  trangThai: 'Lên lịch', // Default status, can be overridden by initialPlanData
};

const ShipmentPlanFormModal = ({
  isOpen,
  onClose,
  onSave,
  initialPlanData,
  editingPlan, // null for add, plan object for edit
  selectOptions,
  isLoading,
  error: propError, // Renamed to avoid conflict with local error state
}) => {
  const [formData, setFormData] = useState(initialFormStateForModal);
  const [internalError, setInternalError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingPlan) {
        setFormData({
          ngayThang:
            formatDateForInput(editingPlan.ngayThang) || new Date().toISOString().split('T')[0],
          dienGiai: editingPlan.dienGiai || '',
          khachHangId: editingPlan.khachHangId || '',
          soLuongContainer: editingPlan.soLuongContainer || 1,
          loaiContainerId: editingPlan.loaiContainerId || '',
          tuyenDuongDi: editingPlan.tuyenDuong?.diemDi || '',
          tuyenDuongDen: editingPlan.tuyenDuong?.diemDen
            ? Array.isArray(editingPlan.tuyenDuong.diemDen)
              ? editingPlan.tuyenDuong.diemDen.join(', ')
              : editingPlan.tuyenDuong.diemDen
            : '',
          cuocVanChuyen: editingPlan.cuocVanChuyen || 0,
          bienSoXeId: editingPlan.bienSoXeId || '',
          cuocThueVanChuyen: editingPlan.cuocThueVanChuyen || 0,
          doiTacId: editingPlan.doiTacId || '',
          thongTinContainer:
            editingPlan.thongTinContainer && editingPlan.thongTinContainer.length > 0
              ? JSON.parse(JSON.stringify(editingPlan.thongTinContainer)) // Deep copy
              : [{ soContainer: '', soSeal: '' }],
          ngayHaHang: formatDateForInput(editingPlan.ngayHaHang) || '',
          trangThai: editingPlan.trangThai || 'Lên lịch',
        });
      } else {
        // For adding new, merge initialPlanData (e.g., for default status) with initialFormState
        setFormData({ ...initialFormStateForModal, ...initialPlanData });
      }
      setInternalError(''); // Clear previous errors when modal opens
    }
  }, [isOpen, editingPlan, initialPlanData]);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContainerInfoChange = (index, e) => {
    const { name, value } = e.target;
    const updatedContainers = formData.thongTinContainer.map((item, i) =>
      i === index ? { ...item, [name]: value } : item
    );
    setFormData(prev => ({ ...prev, thongTinContainer: updatedContainers }));
  };

  const addContainerField = () => {
    setFormData(prev => ({
      ...prev,
      thongTinContainer: [...prev.thongTinContainer, { soContainer: '', soSeal: '' }],
    }));
  };

  const removeContainerField = index => {
    if (formData.thongTinContainer.length > 1) {
      setFormData(prev => ({
        ...prev,
        thongTinContainer: prev.thongTinContainer.filter((_, i) => i !== index),
      }));
    }
  };

  const handleLocalSave = () => {
    setInternalError('');
    if (
      !formData.ngayThang ||
      !formData.dienGiai.trim() ||
      !formData.khachHangId ||
      !formData.loaiContainerId ||
      !formData.bienSoXeId ||
      !formData.tuyenDuongDi.trim() ||
      !formData.tuyenDuongDen.trim()
    ) {
      setInternalError(
        'Vui lòng điền đầy đủ các trường bắt buộc: Ngày, Diễn giải, Khách hàng, Loại cont, Biển số xe, Tuyến đường.'
      );
      return;
    }

    const planDataToSave = {
      ...formData,
      ngayThang: formatDateForDisplay(formData.ngayThang),
      ngayHaHang: formData.ngayHaHang ? formatDateForDisplay(formData.ngayHaHang) : '-',
      tuyenDuong: {
        diemDi: formData.tuyenDuongDi.trim() || '-',
        diemDen:
          formData.tuyenDuongDen
            .split(',')
            .map(s => s.trim())
            .filter(s => s).length > 0
            ? formData.tuyenDuongDen
                .split(',')
                .map(s => s.trim())
                .filter(s => s)
            : ['-'],
      },
      soLuongContainer: parseInt(formData.soLuongContainer, 10) || 0,
      cuocVanChuyen: parseFloat(formData.cuocVanChuyen) || 0,
      cuocThueVanChuyen: parseFloat(formData.cuocThueVanChuyen) || 0,
      doiTacId: formData.doiTacId || '-',
      thongTinContainer: formData.thongTinContainer
        .map(c => ({
          soContainer: c.soContainer.trim() || '-',
          soSeal: c.soSeal.trim() || '-',
        }))
        .filter(c => c.soContainer !== '-' || c.soSeal !== '-'),
    };

    delete planDataToSave.tuyenDuongDi;
    delete planDataToSave.tuyenDuongDen;

    onSave(planDataToSave);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl transform transition-all max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
          {editingPlan ? 'Chỉnh Sửa Lịch Vận Chuyển' : 'Tạo Lịch Vận Chuyển Mới'}
        </h2>

        {(propError || internalError) && (
          <p className="text-red-500 text-sm mb-4 bg-red-100 p-3 rounded">
            {propError || internalError}
          </p>
        )}

        <form
          className="space-y-4 flex-grow overflow-y-auto pr-2"
          onSubmit={e => e.preventDefault()}
        >
          {/* Form fields copied from QuanLyLichVanChuyen.jsx modal */}
          {/* Example: Ngày vận chuyển & Khách hàng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="ngayThang" className="block text-sm font-medium text-gray-700">
                Ngày vận chuyển (*)
              </label>
              <input
                type="date"
                name="ngayThang"
                id="ngayThang"
                value={formData.ngayThang}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
              />
            </div>
            <div>
              <label htmlFor="khachHangId" className="block text-sm font-medium text-gray-700">
                Khách hàng (*)
              </label>
              <select
                name="khachHangId"
                id="khachHangId"
                value={formData.khachHangId}
                onChange={handleInputChange}
                className="mt-1 block w-full select-style"
              >
                <option value="">Chọn khách hàng</option>
                {selectOptions?.customers?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="dienGiai" className="block text-sm font-medium text-gray-700">
              Diễn giải (*)
            </label>
            <textarea
              name="dienGiai"
              id="dienGiai"
              rows="2"
              value={formData.dienGiai}
              onChange={handleInputChange}
              className="mt-1 block w-full input-style"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="tuyenDuongDi" className="block text-sm font-medium text-gray-700">
                Điểm đi (*)
              </label>
              <input
                type="text"
                name="tuyenDuongDi"
                id="tuyenDuongDi"
                value={formData.tuyenDuongDi}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
              />
            </div>
            <div>
              <label htmlFor="tuyenDuongDen" className="block text-sm font-medium text-gray-700">
                Điểm đến (cách nhau bởi dấu phẩy) (*)
              </label>
              <input
                type="text"
                name="tuyenDuongDen"
                id="tuyenDuongDen"
                value={formData.tuyenDuongDen}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="soLuongContainer" className="block text-sm font-medium text-gray-700">
                Số lượng container
              </label>
              <input
                type="number"
                name="soLuongContainer"
                id="soLuongContainer"
                value={formData.soLuongContainer}
                onChange={handleInputChange}
                min="0"
                className="mt-1 block w-full input-style"
              />
            </div>
            <div>
              <label htmlFor="loaiContainerId" className="block text-sm font-medium text-gray-700">
                Loại container (*)
              </label>
              <select
                name="loaiContainerId"
                id="loaiContainerId"
                value={formData.loaiContainerId}
                onChange={handleInputChange}
                className="mt-1 block w-full select-style"
              >
                <option value="">Chọn loại container</option>
                {selectOptions?.containerTypes?.map(ct => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ngayHaHang" className="block text-sm font-medium text-gray-700">
                Ngày hạ hàng (Nếu có)
              </label>
              <input
                type="date"
                name="ngayHaHang"
                id="ngayHaHang"
                value={formData.ngayHaHang}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
              />
            </div>
          </div>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium text-gray-700 px-1">Thông tin vận chuyển</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div>
                <label htmlFor="bienSoXeId" className="block text-sm font-medium text-gray-700">
                  Biển số xe (*)
                </label>
                <select
                  name="bienSoXeId"
                  id="bienSoXeId"
                  value={formData.bienSoXeId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full select-style"
                >
                  <option value="">Chọn xe</option>
                  {selectOptions?.vehicles?.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cuocVanChuyen" className="block text-sm font-medium text-gray-700">
                  Cước vận chuyển
                </label>
                <input
                  type="number"
                  name="cuocVanChuyen"
                  id="cuocVanChuyen"
                  value={formData.cuocVanChuyen}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full input-style"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium text-gray-700 px-1">
              Thuê vận chuyển (Nếu có)
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div>
                <label htmlFor="doiTacId" className="block text-sm font-medium text-gray-700">
                  Đối tác vận chuyển
                </label>
                <select
                  name="doiTacId"
                  id="doiTacId"
                  value={formData.doiTacId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full select-style"
                >
                  <option value="">Chọn đối tác</option>
                  {selectOptions?.partners?.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="cuocThueVanChuyen"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cước thuê vận chuyển
                </label>
                <input
                  type="number"
                  name="cuocThueVanChuyen"
                  id="cuocThueVanChuyen"
                  value={formData.cuocThueVanChuyen}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full input-style"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium text-gray-700 px-1">Thông tin Container</legend>
            {formData.thongTinContainer.map((cont, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-2 mb-2"
              >
                <input
                  type="text"
                  name="soContainer"
                  value={cont.soContainer}
                  onChange={e => handleContainerInfoChange(index, e)}
                  placeholder={`Số container ${index + 1}`}
                  className="input-style"
                />
                <input
                  type="text"
                  name="soSeal"
                  value={cont.soSeal}
                  onChange={e => handleContainerInfoChange(index, e)}
                  placeholder={`Số seal ${index + 1}`}
                  className="input-style"
                />
                {formData.thongTinContainer.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeContainerField(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Xóa
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addContainerField}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              + Thêm container
            </button>
          </fieldset>

          {editingPlan && ( // Only show status field when editing
            <div>
              <label htmlFor="trangThai" className="block text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                name="trangThai"
                id="trangThai"
                value={formData.trangThai}
                onChange={handleInputChange}
                className="mt-1 block w-full select-style"
              >
                <option value="Lên lịch">Lên lịch</option>
                <option value="Đang chạy">Đang chạy</option>
                <option value="Hoàn thành">Hoàn thành</option>
                <option value="Hủy">Hủy</option>
                <option value="Nháp">Nháp</option>
              </select>
            </div>
          )}
        </form>
        <div className="mt-8 flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleLocalSave}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
          >
            {isLoading ? (editingPlan ? 'Đang cập nhật...' : 'Đang lưu...') : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipmentPlanFormModal;
