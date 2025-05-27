import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllNhanVien,
  addNhanVien,
  editNhanVien,
  removeNhanVien,
  fetchAllDauKeo,
  fetchAllRoMooc,
} from '@services/mockApi/index.js';

// Define employee roles constant
const employeeRoles = [
  { value: 'giao-nhan', label: 'Giao Nhận' },
  { value: 'lai-xe', label: 'Lái Xe' },
  { value: 'quan-ly', label: 'Quản Lý' },
  { value: 'admin', label: 'Admin' },
];

// Define initialFormState inside the hook or make it exportable if needed elsewhere
const getInitialFormState = () => ({
  ma_so: '',
  ho_ten: '',
  ten_dang_nhap: '',
  mat_khau: '',
  chuc_vu: '',
  email: '',
});

const useNhanVienManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(getInitialFormState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState([]);

  const fetchEmployeesData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAllNhanVien();
      // Map backend fields to UI fields
      const mapped = (Array.isArray(data) ? data : []).map(emp => ({
        ...emp,
        maNhanVien: emp.ma_so,
        tenNhanVien: emp.ho_ten,
        tenDangNhap: emp.ten_dang_nhap,
        chucVu: mapChucVu(emp.chuc_vu),
        // Optionally map bienSoXe if you have vehicle assignment logic
        // bienSoXe: emp.bien_so_xe || '',
      }));
      setEmployees(mapped);
    } catch (err) {
      setError('Không thể tải danh sách nhân viên.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch vehicles for driver assignment
  const fetchVehicles = useCallback(async () => {
    try {
      const [dauKeoData, roMoocData] = await Promise.all([fetchAllDauKeo(), fetchAllRoMooc()]);

      // Combine vehicles into a single array with type information
      const allVehicles = [
        ...dauKeoData.map(item => ({
          ...item,
          id: `dk-${item.id}`,
          originalId: item.id,
          type: 'dau_keo',
        })),
        ...roMoocData.map(item => ({
          ...item,
          id: `rm-${item.id}`,
          originalId: item.id,
          type: 'ro_mooc',
        })),
      ];

      setVehicles(allVehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  }, []);

  useEffect(() => {
    fetchEmployeesData();
    fetchVehicles();
  }, [fetchEmployeesData, fetchVehicles]);

  const handleInputChange = useCallback(e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const generateEmployeeCode = useCallback(employees => {
    // Find the highest employee code
    const maxCode = employees.reduce((max, emp) => {
      if (!emp.maNhanVien) return max;
      const num = parseInt(emp.maNhanVien.replace(/^NV0*/i, ''), 10);
      return !isNaN(num) ? Math.max(max, num) : max;
    }, 0);

    // Generate new code with leading zeros (e.g., NV001, NV002, ...)
    return `NV${String(maxCode + 1).padStart(3, '0')}`;
  }, []);

  const handleOpenModalForAdd = useCallback(() => {
    setEditingEmployee(null);
    // Generate new employee code based on existing employees
    const newCode = generateEmployeeCode(employees);
    setFormData({
      ...getInitialFormState(),
      ma_so: newCode,
    });
    setError('');
    setIsModalOpen(true);
  }, [employees, generateEmployeeCode]);

  const handleOpenModalForEdit = useCallback(employee => {
    setEditingEmployee(employee);
    setFormData({
      ma_so: employee.maNhanVien || '',
      ho_ten: employee.tenNhanVien,
      ten_dang_nhap: employee.tenDangNhap,
      mat_khau: '', // Password field is cleared for edit
      chuc_vu: employee.chucVu,
      email: employee.email,
    });
    setError('');
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData(getInitialFormState());
    setError('');
  }, []);

  // Effect for ESC key to close modal
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, handleCloseModal]);

  const handleSaveEmployee = useCallback(async () => {
    setError('');
    if (
      !formData.ho_ten.trim() ||
      !formData.ten_dang_nhap.trim() ||
      !formData.email.trim() ||
      !formData.chuc_vu.trim()
    ) {
      setError('Vui lòng điền đầy đủ các trường: Tên nhân viên, Tên đăng nhập, Email, Chức vụ.');
      return;
    }
    if (!editingEmployee && !formData.mat_khau.trim()) {
      setError('Mật khẩu là bắt buộc khi thêm nhân viên mới.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingEmployee) {
        const dataToUpdate = { ...formData };
        if (!formData.mat_khau.trim()) {
          delete dataToUpdate.mat_khau;
        }
        await editNhanVien(editingEmployee.id, dataToUpdate);
      } else {
        await addNhanVien(formData);
      }
      await fetchEmployeesData(); // Refresh data
      handleCloseModal(); // Close modal on success
    } catch (err) {
      setError(err.message || `Lỗi khi ${editingEmployee ? 'sửa' : 'thêm'} nhân viên.`);
      console.error(err);
      // Do not close modal on error, so user can see the error
    } finally {
      setIsLoading(false);
    }
  }, [formData, editingEmployee, fetchEmployeesData, handleCloseModal]);

  const handleDeleteEmployee = useCallback(
    async id => {
      // Renamed to avoid conflict if used directly
      // Confirmation can be handled in the component or passed as a callback
      // For simplicity, direct deletion logic here, assuming confirm is done before calling
      setIsLoading(true);
      setError('');
      try {
        await removeNhanVien(id);
        await fetchEmployeesData(); // Refresh data
      } catch (err) {
        setError('Lỗi khi xóa nhân viên.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchEmployeesData]
  );

  return {
    employees,
    isModalOpen,
    editingEmployee,
    formData,
    isLoading,
    error,
    fetchEmployeesData, // May not be needed by component if auto-fetched
    handleInputChange,
    handleOpenModalForAdd,
    handleOpenModalForEdit,
    handleCloseModal,
    handleSaveEmployee,
    handleDeleteEmployee, // Expose this for the delete button
    employeeRoles, // Expose for the form
    vehicles, // Expose vehicles for the form
  };
};

// Helper to map chuc_vu code to display string
function mapChucVu(code) {
  switch (code) {
    case 'quan-ly':
      return 'Quản lý';
    case 'ke-toan':
      return 'Kế toán';
    case 'giao-nhan':
      return 'Giao nhận';
    case 'lai-xe':
      return 'Lái xe';
    default:
      return code || 'Chưa xác định';
  }
}

export default useNhanVienManagement;
