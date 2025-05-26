import React, { useState, useEffect } from 'react'; // useEffect might not be needed if all async logic is in hook
import { AddButton, EditButton, DeleteButton } from '@/components/ActionButtons';
// Employee service imports are now in the hook
import StandardTable from '@/components/StandardTable';
import { PlusIcon } from '@assets/icons/index.jsx';
import useNhanVienManagement from './hooks/useNhanVienManagement'; // Import the hook
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
  InputAdornment,
  Fab,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import EmployeeCard from './components/EmployeeCard'; // Adjusted path
import NhanVienForm from './components/NhanVienForm'; // Import the new form
import { useTheme, useMediaQuery } from '@mui/material';

// initialFormState is now handled by the hook

const QuanLyNhanVien = () => {
  const {
    employees,
    isModalOpen,
    editingEmployee,
    formData,
    isLoading,
    error, // This error from the hook will be used for the form
    // fetchEmployeesData, // Not needed directly by component if hook handles initial fetch
    handleInputChange,
    handleOpenModalForAdd,
    handleOpenModalForEdit,
    handleCloseModal,
    handleSaveEmployee,
    handleDeleteEmployee: deleteEmployeeById, // Renamed to avoid conflict with a potential local var
    employeeRoles, // Get this from the hook for the form
  } = useNhanVienManagement();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [search, setSearch] = useState(''); // Search remains component-local state
  const [pageError, setPageError] = useState(''); // For errors not directly related to form save

  // useEffect for initial data fetch is in the hook.
  // useEffect for ESC key is in the hook.

  // If there's an error from the hook (e.g. save error), it will be passed to NhanVienForm.
  // If there's a page-level error (e.g., initial load error), it could be set via setPageError.
  // For simplicity, we can use the 'error' from the hook for the main Alert,
  // and NhanVienForm will also display it.

  const handleDeleteClick = async record => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      await deleteEmployeeById(record.id);
    }
  };

  // Define table columns. This is display logic, so it stays.
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

  // Filter employees by search
  const filteredEmployees = employees.filter(emp => {
    const q = search.toLowerCase();
    return (
      emp.tenNhanVien.toLowerCase().includes(q) ||
      emp.tenDangNhap.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý nhân viên
      </Typography>

      {/* Search bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo tên, tên đăng nhập hoặc email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2 }}>
        {isMobile ? (
          <Box>
            {isLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : filteredEmployees.length === 0 ? (
              <Typography align="center" color="text.secondary" py={4}>Không có dữ liệu nhân viên</Typography>
            ) : (
              filteredEmployees.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onEdit={handleOpenModalForEdit}
                  onDelete={handleDeleteClick}
                  loading={isLoading}
                />
              ))
            )}
          </Box>
        ) : (
          <StandardTable
            columns={columns}
            data={filteredEmployees}
            loading={isLoading}
            emptyMessage="Không có dữ liệu nhân viên"
            // Remove headerAction, since AddButton is now above
          />
        )}
      </Paper>

      {/* Floating Add FAB */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleOpenModalForAdd}
        sx={{
          position: 'fixed',
          bottom: { xs: 24, md: 32 },
          right: { xs: 24, md: 32 },
          zIndex: 1201,
          boxShadow: 6,
        }}
      >
        <PlusIcon />
      </Fab>

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
                {isLoading ? (editingEmployee ? 'Đang sửa...' : 'Đang lưu...') : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};

export default QuanLyNhanVien;
