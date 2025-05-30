import React from 'react';
import {
  Box,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  InputAdornment,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

const DesktopView = ({
  employees,
  isLoading,
  error,
  searchTerm,
  handleSearchChange,
  handleOpenModalForEdit,
  handleDeleteRequest,
  canEditDelete,
}) => {
  const columns = React.useMemo(
    () => [
      { id: 'maNhanVien', label: 'MÃ NV', minWidth: 100 },
      { id: 'tenNhanVien', label: 'HỌ TÊN', minWidth: 170 },
      { id: 'tenDangNhap', label: 'TÊN ĐĂNG NHẬP', minWidth: 150 },
      { id: 'email', label: 'EMAIL', minWidth: 170 }, // Email field name is likely consistent
      { id: 'chucVu', label: 'CHỨC VỤ', minWidth: 120 }, // Mapped field from hook
      {
        id: 'actions',
        label: 'THAO TÁC',
        minWidth: 100,
        align: 'right',
        disableSort: true,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <EditButton
              onClick={() => handleOpenModalForEdit(row)}
              disabled={!canEditDelete(row)}
              tooltip="Chỉnh sửa nhân viên"
            />
            <DeleteButton
              onClick={() => handleDeleteRequest(row)}
              disabled={!canEditDelete(row)}
              tooltip="Xóa nhân viên"
            />
          </Box>
        ),
      },
    ],
    [handleOpenModalForEdit, handleDeleteRequest, canEditDelete]
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 3, height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 }, pb: { xs: 10, sm: 11 } }}>
      {' '}
      {/* Padding for potential FAB from parent */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo tên, tên đăng nhập hoặc email..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: {
              borderRadius: '6px',
              height: 36,
              minHeight: 36,
              fontSize: '0.95rem',
            },
          }}
        />
      </Box>
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {employees.length === 0 && !isLoading ? (
          <Box textAlign="center" py={4}>
            <Typography variant="subtitle1">Không tìm thấy nhân viên nào.</Typography>
          </Box>
        ) : (
          <StandardTable
            columns={columns}
            data={employees}
            rowKeyField="id"
            // Pass other necessary props like onSort, order, orderBy if needed
          />
        )}
      </Paper>
    </Box>
  );
};

export default DesktopView;
