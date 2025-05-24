import React, { useState, useEffect } from 'react';
import { AddButton, EditButton, DeleteButton } from '@shared/components/ActionButtons';
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  employeeRoles,
} from '../../services/mockData/employees.js';;
import StandardTable from '@shared/components/StandardTable';
import { PlusIcon } from '@assets/icons/index.jsx';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';

const initialFormState = {
  tenNhanVien: '',
  tenDangNhap: '',
  matKhau: '',
  email: '',
  chucVu: employeeRoles[0] || '', // Default to the first role or empty string
};

const QuanLyNhanVien = () => {
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchEmployeesData = async () => {
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
  };

  useEffect(() => {
    fetchEmployeesData();
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModalForAdd = () => {
    setEditingEmployee(null);
    setFormData(initialFormState);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = employee => {
    setEditingEmployee(employee);
    setFormData({
      tenNhanVien: employee.tenNhanVien,
      tenDangNhap: employee.tenDangNhap,
      matKhau: '', // Password field is cleared for edit, or handled differently
      email: employee.email,
      chucVu: employee.chucVu,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData(initialFormState);
    setError('');
  };

  // Handle ESC key press to close modal
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
  }, [isModalOpen]);

  const handleSaveEmployee = async () => {
    setError(''); // Clear previous errors
    // Basic frontend validation
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
      // Password required for new employee
      setError('Mật khẩu là bắt buộc khi thêm nhân viên mới.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingEmployee) {
        // For update, ensure matKhau is only included if changed.
        const dataToUpdate = { ...formData };
        if (!formData.matKhau.trim()) {
          // If password field empty during edit, don't update it
          delete dataToUpdate.matKhau;
        }
        await updateEmployee(editingEmployee.id, dataToUpdate);
      } else {
        await addEmployee(formData);
      }
      await fetchEmployeesData();
      handleCloseModal();
    } catch (err) {
      setError(err.message || `Lỗi khi ${editingEmployee ? 'cập nhật' : 'thêm'} nhân viên.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmployee = async id => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      setIsLoading(true);
      setError('');
      try {
        await deleteEmployee(id);
        await fetchEmployeesData();
      } catch (err) {
        setError('Lỗi khi xóa nhân viên.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteClick = async record => {
    await handleDeleteEmployee(record.id);
  };

  // Define table columns
  const columns = [
    {
      key: 'tenNhanVien',
      label: 'Tên nhân viên',
    },
    {
      key: 'tenDangNhap',
      label: 'Tên đăng nhập',
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'chucVu',
      label: 'Chức vụ',
      render: value => value || 'Chưa xác định',
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton onClick={() => handleOpenModalForEdit(record)} disabled={isLoading} />
          <DeleteButton onClick={() => handleDeleteClick(record)} disabled={isLoading} />
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý nhân viên
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2 }}>
        <StandardTable
          columns={columns}
          data={employees}
          loading={isLoading}
          emptyMessage="Không có dữ liệu nhân viên"
          headerAction={<AddButton onClick={handleOpenModalForAdd} size="small" sx={{ ml: 2 }} />}
        />
      </Paper>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              {editingEmployee ? 'Chỉnh Sửa Thông Tin Nhân Viên' : 'Thêm Nhân Viên Mới'}
            </h2>

            {error && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{error}</p>}

            <div className="space-y-4">
              <div>
                <label htmlFor="tenNhanVien" className="block text-sm font-medium text-gray-700">
                  Tên nhân viên
                </label>
                <input
                  type="text"
                  name="tenNhanVien"
                  id="tenNhanVien"
                  value={formData.tenNhanVien}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="tenDangNhap" className="block text-sm font-medium text-gray-700">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  name="tenDangNhap"
                  id="tenDangNhap"
                  value={formData.tenDangNhap}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="matKhau" className="block text-sm font-medium text-gray-700">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  name="matKhau"
                  id="matKhau"
                  value={formData.matKhau}
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="chucVu" className="block text-sm font-medium text-gray-700">
                  Chức vụ
                </label>
                <select
                  name="chucVu"
                  id="chucVu"
                  value={formData.chucVu}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {employeeRoles.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEmployee}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
              >
                {isLoading ? (editingEmployee ? 'Đang cập nhật...' : 'Đang lưu...') : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};

export default QuanLyNhanVien;
