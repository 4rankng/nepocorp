import { useState, useEffect, useCallback } from 'react';
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  employeeRoles,
} from '@services/mockData/employees';
import { getVehicles } from '@services/mockData/vehicles';

// Define initialFormState inside the hook or make it exportable if needed elsewhere
const getInitialFormState = () => ({
  maNhanVien: '',
  tenNhanVien: '',
  tenDangNhap: '',
  matKhau: '',
  email: '',
  chucVu: employeeRoles[0] || '', // Default to the first role
  bienSoXe: '',
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
      const data = await getEmployees();
      setEmployees(data);
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
      const data = await getVehicles();
      setVehicles(data);
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
      maNhanVien: newCode,
    });
    setError('');
    setIsModalOpen(true);
  }, [employees, generateEmployeeCode]);

  const handleOpenModalForEdit = useCallback(employee => {
    setEditingEmployee(employee);
    setFormData({
      maNhanVien: employee.maNhanVien || '',
      tenNhanVien: employee.tenNhanVien,
      tenDangNhap: employee.tenDangNhap,
      matKhau: '', // Password field is cleared for edit
      email: employee.email,
      chucVu: employee.chucVu,
      bienSoXe: employee.bienSoXe || '',
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
      !formData.tenNhanVien.trim() ||
      !formData.tenDangNhap.trim() ||
      !formData.email.trim() ||
      !formData.chucVu.trim()
    ) {
      setError('Vui lòng điền đầy đủ các trường: Tên nhân viên, Tên đăng nhập, Email, Chức vụ.');
      return;
    }
    if (!editingEmployee && !formData.matKhau.trim()) {
      setError('Mật khẩu là bắt buộc khi thêm nhân viên mới.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingEmployee) {
        const dataToUpdate = { ...formData };
        if (!formData.matKhau.trim()) {
          delete dataToUpdate.matKhau;
        }
        await updateEmployee(editingEmployee.id, dataToUpdate);
      } else {
        await addEmployee(formData);
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
        await deleteEmployee(id);
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

export default useNhanVienManagement;
