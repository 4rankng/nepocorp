import React, { useState, useMemo } from 'react';
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
  // Format date to browser timezone
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Get current employees for the current page
  const paginatedEmployees = useMemo(() => {
    return employees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [employees, page, rowsPerPage]);
  const columns = React.useMemo(
    () => [
      {
        key: 'name',
        label: 'HỌ TÊN',
        minWidth: 170,
        sortable: true,
      },
      {
        key: 'username',
        label: 'TÊN ĐĂNG NHẬP',
        minWidth: 150,
        sortable: true,
      },
      {
        key: 'email',
        label: 'EMAIL',
        minWidth: 170,
        sortable: true,
      },
      {
        key: 'role',
        label: 'CHỨC VỤ',
        minWidth: 120,
        sortable: true,
      },
      {
        key: 'created_at',
        label: 'NGÀY TẠO',
        minWidth: 150,
        sortable: true,
        render: (value) => formatDateTime(value),
      },
    ],
    []
  );

  // Render action buttons for each row
  const renderActions = row => (
    <>
      <EditButton
        onClick={() => handleOpenModalForEdit(row)}
        disabled={!canEditDelete(row)}
        tooltip="Chỉnh sửa nhân viên"
      />
      <DeleteButton
        onClick={() => handleDeleteRequest(row)}
        disabled={!canEditDelete(row)}
        tooltip="Xóa nhân viên"
        sx={{ ml: 1 }}
      />
    </>
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
      <Paper elevation={0} sx={{ borderRadius: 0, overflow: 'hidden' }}>
        {employees.length === 0 && !isLoading ? (
          <Box textAlign="center" py={4}>
            <Typography variant="subtitle1">Không tìm thấy nhân viên nào.</Typography>
          </Box>
        ) : (
          <StandardTable
            columns={columns}
            data={paginatedEmployees}
            renderActions={renderActions}
            loading={isLoading}
            error={error}
            emptyMessage="Không có dữ liệu nhân viên"
            sortable={true}
            defaultSort={{ key: 'tenNhanVien', direction: 'asc' }}
            pagination={true}
            page={page}
            totalCount={employees.length}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            showSTT={true}
          />
        )}
      </Paper>
    </Box>
  );
};
export default DesktopView;
