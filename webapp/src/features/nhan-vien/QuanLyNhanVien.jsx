import React, { useState } from 'react';
import { PlusIcon } from '@assets/icons/index.jsx'; // Assuming PlusIcon is used for FAB
import useNhanVien from '@features/nhan-vien/hooks/useNhanVien';
import {
  Box,
  CircularProgress, // Keep for top-level loading if needed before views render
  Alert, // Keep for top-level error before views render
  Fab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Zoom,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import NhanVienForm from '@features/nhan-vien/components/NhanVienForm';
import DesktopView from './components/DesktopView';
import MobileView from './components/MobileView';

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
      {/* Conditional Rendering of Views */}
      {isMobile ? (
        <MobileView
          employees={filteredEmployees}
          isLoading={isLoading}
          error={error} // Pass error to be handled within MobileView if needed
          searchTerm={searchTerm}
          handleSearchChange={handleSearchChange}
          handleOpenModalForEdit={handleOpenModalForEdit}
          handleDeleteRequest={handleDeleteClick} // Renamed for clarity
          canEditDelete={canEditDelete}
        />
      ) : (
        <DesktopView
          employees={filteredEmployees}
          isLoading={isLoading}
          error={error} // Pass error to be handled within DesktopView if needed
          searchTerm={searchTerm}
          handleSearchChange={handleSearchChange}
          handleOpenModalForEdit={handleOpenModalForEdit}
          handleDeleteRequest={handleDeleteClick} // Renamed for clarity
          canEditDelete={canEditDelete}
        />
      )}
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
