import React, { useState } from 'react';
import { PlusIcon } from '@assets/icons/index.jsx'; // Assuming PlusIcon is used for FAB
import PersonIcon from '@mui/icons-material/Person';
import useNhanVien from '@features/nhan-vien/hooks/useNhanVien';
import {
  Box,
  CircularProgress, // Keep for top-level loading if needed before views render
  Alert, // Keep for top-level error before views render
  Fab,
  Zoom,
  Typography,
  Divider,
} from '@mui/material';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useTheme, useMediaQuery } from '@mui/material';
import NhanVienForm from '@features/nhan-vien/components/NhanVienForm';
import DesktopView from './components/DesktopView';
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
    dauKeoList,
    isDauKeoLoading,
    loadDauKeoList,
  } = useNhanVien();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchTerm, setSearchTerm] = useState('');
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, data: null });
  // useEffect for initial data fetch is in the hook.
  // useEffect for ESC key is in the hook.
  // If there's an error from the hook (e.g. save error), it will be passed to NhanVienForm.
  // If there's a page-level error (e.g., initial load error), it could be set via setPageError.
  // For simplicity, we can use the 'error' from the hook for the main Alert,
  // and NhanVienForm will also display it.
  const handleDeleteClick = record => {
    setDeleteDialog({ open: true, data: record });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.data) {
      await handleDeleteEmployee(deleteDialog.data.id);
    }
    setDeleteDialog({ open: false, data: null });
  };
  // Filter employees by search
  const filteredEmployees = employees.filter(emp => {
    if (!emp) return false;
    const q = searchTerm.toLowerCase();
    // Search by fields relevant to the DesktopView columns and placeholder, using mapped field names
    return (
      (emp.maNhanVien && emp.maNhanVien.toLowerCase().includes(q)) ||
      (emp.tenNhanVien && emp.tenNhanVien.toLowerCase().includes(q)) ||
      (emp.tenDangNhap && emp.tenDangNhap.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) || // Assuming email field name is consistent
      (emp.chucVu && emp.chucVu.toLowerCase().includes(q)) // Mapped field from hook
    );
  });
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
  };
  // Placeholder for canEditDelete logic, adapt as needed from your original context
  // This might depend on user roles or specific employee properties
  const canEditDelete = employeeRecord => {
    // Example: return hasAnyRole([ROLES.ADMIN, ROLES.QUAN_LY]);
    // Or based on employeeRecord.status or some other logic
    return true; // Defaulting to true for now, adjust as per your app's logic
  };
  return (
    <Box sx={{ position: 'relative' }}>
      {' '}
      {/* Main container, FAB will be fixed relative to viewport */}
      {/* Top-level error display if needed before views render */}
      {error && !isLoading && filteredEmployees.length === 0 && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
      <DesktopView
        employees={filteredEmployees}
        isLoading={isLoading}
        error={error}
        searchTerm={searchTerm}
        handleSearchChange={handleSearchChange}
        handleOpenModalForEdit={handleOpenModalForEdit}
        handleDeleteRequest={handleDeleteClick}
        canEditDelete={canEditDelete}
      />
      {/* Floating Add FAB */}
      <Zoom in={!isLoading}>
        <Fab
          color="primary"
          aria-label="Thêm nhân viên"
          onClick={handleOpenModalForAdd}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, sm: 32 },
            right: { xs: 24, sm: 32 },
            zIndex: 1201,
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 12px 40px rgba(25, 118, 210, 0.35)',
            },
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            width: 56, // Standard FAB size
            height: 56, // Standard FAB size
          }}
        >
          <PlusIcon />
        </Fab>
      </Zoom>
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
        dauKeoList={dauKeoList}
        isDauKeoLoading={isDauKeoLoading}
        onLoadDauKeo={loadDauKeoList}
      />
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onCancel={() => setDeleteDialog({ open: false, data: null })}
        onConfirm={handleConfirmDelete}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="error" />
            <span>Xóa nhân viên</span>
          </Box>
        }
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
        type="delete"
        content={() => (
          <Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="error.main" gutterBottom>
                Thông tin nhân viên:
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  Tên nhân viên:
                </Typography>
                <Typography variant="body2">{deleteDialog.data?.tenNhanVien || '-'}</Typography>

                <Typography variant="body2" fontWeight={500}>
                  Mã nhân viên:
                </Typography>
                <Typography variant="body2">{deleteDialog.data?.maNhanVien || '-'}</Typography>
              </Box>
            </Box>
          </Box>
        )}
      />
    </Box>
  );
};
export default QuanLyNhanVien;
