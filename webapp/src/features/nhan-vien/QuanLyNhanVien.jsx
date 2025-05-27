import React, { useState } from 'react';
import { AddButton, EditButton, DeleteButton } from '@/components/ActionButtons';
import StandardTable from '@/components/StandardTable';
import { PlusIcon } from '@assets/icons/index.jsx';
import useNhanVienManagement from '@features/nhan-vien/hooks/useNhanVienManagement';
import {
  Box,
  Paper,
  Typography,
  TextField,
  CircularProgress,
  Alert,
  Fab,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import EmployeeCard from '@features/nhan-vien/components/EmployeeCard';
import NhanVienForm from '@features/nhan-vien/components/NhanVienForm';
import { useTheme, useMediaQuery } from '@mui/material';

// initialFormState is now handled by the hook

const QuanLyNhanVien = () => {
  const {
    employees,
    isModalOpen,
    editingEmployee,
    formData,
    isLoading,
    error,
    handleInputChange,
    handleOpenModalForAdd,
    handleOpenModalForEdit,
    handleCloseModal,
    handleSaveEmployee,
    handleDeleteEmployee,
    employeeRoles,
    vehicles,
  } = useNhanVienManagement();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [search, setSearch] = useState(''); // Search remains component-local state
  const [pageError, setPageError] = useState(''); // For errors not directly related to form save
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // useEffect for initial data fetch is in the hook.
  // useEffect for ESC key is in the hook.

  // If there's an error from the hook (e.g. save error), it will be passed to NhanVienForm.
  // If there's a page-level error (e.g., initial load error), it could be set via setPageError.
  // For simplicity, we can use the 'error' from the hook for the main Alert,
  // and NhanVienForm will also display it.

  const handleDeleteClick = record => {
    setEmployeeToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (employeeToDelete) {
      await handleDeleteEmployee(employeeToDelete.id);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  // Define table columns. This is display logic, so it stays.
  const columns = [
    {
      key: 'maNhanVien',
      label: 'Mã NV',
      width: '100px',
    },
    {
      key: 'tenNhanVien',
      label: 'Họ tên',
      minWidth: '150px',
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
      render: (value, record) => (
        <Box>
          <div>{value || 'Chưa xác định'}</div>
          {value === 'Lái xe' && record.bienSoXe && (
            <div className="text-xs text-gray-500">Xe: {record.bienSoXe}</div>
          )}
        </Box>
      ),
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
    if (!emp) return false;
    const q = search.toLowerCase();
    return (
      (emp.maNhanVien && emp.maNhanVien.toLowerCase().includes(q)) ||
      (emp.tenNhanVien && emp.tenNhanVien.toLowerCase().includes(q)) ||
      (emp.tenDangNhap && emp.tenDangNhap.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.bienSoXe && emp.bienSoXe.toLowerCase().includes(q))
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
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : filteredEmployees.length === 0 ? (
              <Typography align="center" color="text.secondary" py={4}>
                Không có dữ liệu nhân viên
              </Typography>
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

      <NhanVienForm
        open={isModalOpen}
        onClose={handleCloseModal}
        editingEmployee={editingEmployee}
        formData={formData}
        onFormChange={handleInputChange}
        onSave={handleSaveEmployee}
        isLoading={isLoading}
        error={error}
        employeeRoles={employeeRoles}
        vehicles={vehicles}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Xác nhận xóa nhân viên</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Bạn có chắc chắn muốn xóa nhân viên "{employeeToDelete?.tenNhanVien}" (Mã:{' '}
            {employeeToDelete?.maNhanVien})? Hành động này không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Hủy
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Xác nhận xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuanLyNhanVien;
