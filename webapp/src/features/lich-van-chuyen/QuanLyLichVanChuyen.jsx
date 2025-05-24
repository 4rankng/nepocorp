import React, { useState, useEffect, useCallback } from 'react';
import {
  getShipmentPlans,
  addShipmentPlan,
  updateShipmentPlan,
  deleteShipmentPlan,
  getVehiclesForSelect,
  getPartnersForSelect,
  getCustomersForSelect,
  getContainerTypesForSelect,
} from '../../services/mockData';
import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons/index.jsx';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Box, Typography, Paper, Alert, CircularProgress, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StandardTable from '../../shared/components/StandardTable';
import { AddButton, EditButton, DeleteButton } from '../../shared/components/ActionButtons';

const initialFormState = {
  ngayThang: '', // YYYY-MM-DD for input type="date"
  dienGiai: '',
  khachHangId: '',
  soLuongContainer: 1, // Default to 1
  loaiContainerId: '',
  tuyenDuongDi: '',
  tuyenDuongDen: '',
  cuocVanChuyen: 0,
  bienSoXeId: '',
  cuocThueVanChuyen: 0,
  doiTacId: '',
  thongTinContainer: [{ soContainer: '', soSeal: '' }], // Start with one container
  ngayHaHang: '', // YYYY-MM-DD for input type="date"
  trangThai: 'Lên lịch',
  // Fields not directly on form but part of data model, defaults applied in mockData
};

// Helper to format date from YYYY-MM-DD to DD/MM/YYYY for display
const formatDateForDisplay = dateStr_YYYYMMDD => {
  if (!dateStr_YYYYMMDD) return '-';
  const [year, month, day] = dateStr_YYYYMMDD.split('-');
  return `${day}/${month}/${year}`;
};

// Helper to format date from DD/MM/YYYY to YYYY-MM-DD for date input
const formatDateForInput = dateStr_DDMMYYYY => {
  if (!dateStr_DDMMYYYY) return '';
  const parts = dateStr_DDMMYYYY.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return ''; // Invalid format
};

const QuanLyLichVanChuyen = () => {
  const [shipmentPlans, setShipmentPlans] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [selectOptions, setSelectOptions] = useState({
    vehicles: [],
    partners: [],
    customers: [],
    containerTypes: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [plans, vehicles, partners, customers, containerTypes] = await Promise.all([
        getShipmentPlans(),
        getVehiclesForSelect(),
        getPartnersForSelect(),
        getCustomersForSelect(),
        getContainerTypesForSelect(),
      ]);
      setShipmentPlans(plans);
      setSelectOptions({ vehicles, partners, customers, containerTypes });
    } catch (err) {
      setError('Không thể tải dữ liệu cần thiết cho trang.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      // Keep at least one
      setFormData(prev => ({
        ...prev,
        thongTinContainer: prev.thongTinContainer.filter((_, i) => i !== index),
      }));
    }
  };

  const handleOpenModalForAdd = () => {
    setEditingPlan(null);
    setFormData({
      ...initialFormState,
      ngayThang: new Date().toISOString().split('T')[0], // Default to today
      thongTinContainer: [{ soContainer: '', soSeal: '' }], // Ensure it's reset
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = plan => {
    setEditingPlan(plan);
    setFormData({
      ngayThang: formatDateForInput(plan.ngayThang) || '',
      dienGiai: plan.dienGiai || '',
      khachHangId: plan.khachHangId || '',
      soLuongContainer: plan.soLuongContainer || 1,
      loaiContainerId: plan.loaiContainerId || '',
      tuyenDuongDi: plan.tuyenDuong?.diemDi || '',
      tuyenDuongDen: plan.tuyenDuong?.diemDen
        ? Array.isArray(plan.tuyenDuong.diemDen)
          ? plan.tuyenDuong.diemDen.join(', ')
          : plan.tuyenDuong.diemDen
        : '',
      cuocVanChuyen: plan.cuocVanChuyen || 0,
      bienSoXeId: plan.bienSoXeId || '',
      cuocThueVanChuyen: plan.cuocThueVanChuyen || 0,
      doiTacId: plan.doiTacId || '',
      thongTinContainer:
        plan.thongTinContainer && plan.thongTinContainer.length > 0
          ? plan.thongTinContainer
          : [{ soContainer: '', soSeal: '' }],
      ngayHaHang: formatDateForInput(plan.ngayHaHang) || '',
      trangThai: plan.trangThai || 'Lên lịch',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormData(initialFormState);
    setError('');
  };

  // Handle ESC key press to close modals
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          handleCloseModal();
        } else if (isDeleteModalOpen) {
          handleDeleteCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, isDeleteModalOpen]);

  const handleSavePlan = async () => {
    setError('');
    // Basic validation for required fields
    if (
      !formData.ngayThang ||
      !formData.dienGiai.trim() ||
      !formData.khachHangId ||
      !formData.loaiContainerId ||
      !formData.bienSoXeId ||
      !formData.tuyenDuongDi.trim() ||
      !formData.tuyenDuongDen.trim()
    ) {
      setError(
        'Vui lòng điền đầy đủ các trường bắt buộc: Ngày, Diễn giải, Khách hàng, Loại cont, Biển số xe, Tuyến đường.'
      );
      return;
    }

    setIsLoading(true);
    const planData = {
      ...formData,
      ngayThang: formatDateForDisplay(formData.ngayThang), // Convert to DD/MM/YYYY for mock
      ngayHaHang: formData.ngayHaHang ? formatDateForDisplay(formData.ngayHaHang) : '-', // Convert to DD/MM/YYYY for mock
      tuyenDuong: {
        diemDi: formData.tuyenDuongDi.trim() || '-',
        diemDen: formData.tuyenDuongDen
          .split(',')
          .map(s => s.trim())
          .filter(s => s) || ['-'],
      },
      soLuongContainer: parseInt(formData.soLuongContainer, 10) || 0,
      cuocVanChuyen: parseFloat(formData.cuocVanChuyen) || 0,
      cuocThueVanChuyen: parseFloat(formData.cuocThueVanChuyen) || 0,
      // Ensure default for optional fields if empty
      doiTacId: formData.doiTacId || '-',
      thongTinContainer: formData.thongTinContainer
        .map(c => ({
          soContainer: c.soContainer.trim() || '-',
          soSeal: c.soSeal.trim() || '-',
        }))
        .filter(c => c.soContainer !== '-' || c.soSeal !== '-'), // Filter out empty entries
    };

    // Remove temporary form fields not in the main data model
    delete planData.tuyenDuongDi;
    delete planData.tuyenDuongDen;

    try {
      if (editingPlan) {
        await updateShipmentPlan(editingPlan.id, planData);
      } else {
        await addShipmentPlan(planData);
      }
      await fetchPageData(); // Refresh list and select options
      handleCloseModal();
    } catch (err) {
      setError(err.message || `Lỗi khi ${editingPlan ? 'cập nhật' : 'thêm'} lịch vận chuyển.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlan = async plan => {
    setPlanToDelete(plan);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    setIsLoading(true);
    setError('');
    try {
      await deleteShipmentPlan(planToDelete.id);
      await fetchPageData(); // Refresh list
      setIsDeleteModalOpen(false);
      setPlanToDelete(null);
    } catch (err) {
      setError('Lỗi khi xóa lịch vận chuyển.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setPlanToDelete(null);
  };

  const getEntityNameById = (id, list, keyField = 'id', nameField = 'name') => {
    const entity = list.find(item => item[keyField] === id);
    return entity ? entity[nameField] : '-';
  };

  // Define table columns
  const columns = [
    {
      key: 'ngayThang',
      label: 'Ngày Tháng',
      render: value => value || '-',
    },
    {
      key: 'bienSoXe',
      label: 'Biển Số Xe',
      render: value => value || '-',
    },
    {
      key: 'tenDoiTac',
      label: 'Đối Tác',
      render: value => value || '-',
    },
    {
      key: 'dienGiai',
      label: 'Diễn Giải',
      render: value => value || '-',
      noWrap: true,
      maxWidth: 300,
    },
    {
      key: 'tuyenDuong',
      label: 'Tuyến Đường',
      render: value => {
        if (!value) return '-';
        if (typeof value === 'object') {
          return `${value.diemDi} - ${Array.isArray(value.diemDen) ? value.diemDen.join(', ') : value.diemDen}`;
        }
        return value;
      },
      noWrap: true,
      maxWidth: 300,
    },
    {
      key: 'trangThai',
      label: 'Trạng Thái',
      render: value => value || '-',
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton onClick={() => handleOpenModalForEdit(record)} disabled={isLoading} />
          <DeleteButton onClick={() => handleDeletePlan(record)} disabled={isLoading} />
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý lịch vận chuyển
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
        <StandardTable
          columns={columns}
          data={shipmentPlans}
          loading={isLoading}
          emptyMessage="Chưa có lịch vận chuyển nào"
          headerAction={<AddButton onClick={handleOpenModalForAdd} size="small" sx={{ ml: 2 }} />}
        />
      </Paper>
      {isModalOpen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 50,
          }}
        >
          <Box
            component="form"
            onSubmit={e => {
              e.preventDefault();
              handleSavePlan();
            }}
            sx={{
              backgroundColor: 'white',
              p: 6,
              borderRadius: 2,
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              width: '100%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                pb: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="h5"
                component="h2"
                sx={{ fontWeight: 600, color: 'text.primary' }}
              >
                {editingPlan ? 'Chỉnh Sửa Lịch Vận Chuyển' : 'Tạo Lịch Vận Chuyển Mới'}
              </Typography>
              <IconButton onClick={handleCloseModal} size="small" sx={{ ml: 2 }}>
                <CloseIcon />
              </IconButton>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}
              >
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
                    required
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
                    required
                  >
                    <option value="">Chọn khách hàng</option>
                    {selectOptions.customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Box>

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
                  <label
                    htmlFor="tuyenDuongDen"
                    className="block text-sm font-medium text-gray-700"
                  >
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
                  <label
                    htmlFor="soLuongContainer"
                    className="block text-sm font-medium text-gray-700"
                  >
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
                  <label
                    htmlFor="loaiContainerId"
                    className="block text-sm font-medium text-gray-700"
                  >
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
                    {selectOptions.containerTypes.map(ct => (
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
                <legend className="text-sm font-medium text-gray-700 px-1">
                  Thông tin vận chuyển
                </legend>
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
                      {selectOptions.vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="cuocVanChuyen"
                      className="block text-sm font-medium text-gray-700"
                    >
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
                      {selectOptions.partners.map(p => (
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
                <legend className="text-sm font-medium text-gray-700 px-1">
                  Thông tin Container
                </legend>
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

              {editingPlan && (
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
                  </select>
                </div>
              )}

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  sx={{
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{
                    textTransform: 'none',
                    '&.Mui-disabled': {
                      backgroundColor: 'action.disabledBackground',
                      color: 'action.disabled',
                    },
                  }}
                >
                  {isLoading ? (editingPlan ? 'Đang cập nhật...' : 'Đang lưu...') : 'Lưu'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa"
        message={
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn xóa lịch vận chuyển này?
            </Typography>
            <Box sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Ngày:</strong> {planToDelete?.ngayThang}
              </Typography>
              <Typography variant="body2">
                <strong>Biển số xe:</strong> {planToDelete?.bienSoXe}
              </Typography>
              <Typography variant="body2">
                <strong>Đối tác:</strong> {planToDelete?.tenDoiTac || '-'}
              </Typography>
            </Box>
          </Box>
        }
      />
    </Box>
  );
};

// Basic input styling (can be centralized later)
const InputStyle =
  'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
const SelectStyle =
  'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white';

export default QuanLyLichVanChuyen;
