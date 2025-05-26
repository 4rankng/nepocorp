import { useState, useEffect, useCallback } from 'react';
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  employeeRoles, // Import directly
} from '@services/mockData/employees';

// Define initialFormState inside the hook or make it exportable if needed elsewhere
const getInitialFormState = () => ({
  tenNhanVien: '',
  tenDangNhap: '',
  matKhau: '',
  email: '',
  chucVu: employeeRoles[0] || '', // Default to the first role
});

const useNhanVienManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(getInitialFormState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);

  const handleInputChange = useCallback(e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleOpenModalForAdd = useCallback(() => {
    setEditingEmployee(null);
    setFormData(getInitialFormState());
    setError('');
    setIsModalOpen(true);
  }, []);

  const handleOpenModalForEdit = useCallback(employee => {
    setEditingEmployee(employee);
    setFormData({
      tenNhanVien: employee.tenNhanVien,
      tenDangNhap: employee.tenDangNhap,
      matKhau: '', // Password field is cleared for edit
      email: employee.email,
      chucVu: employee.chucVu,
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

  const handleDeleteEmployee = useCallback(async (id) => { // Renamed to avoid conflict if used directly
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
  }, [fetchEmployeesData]);

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
  };
};

export default useNhanVienManagement;
