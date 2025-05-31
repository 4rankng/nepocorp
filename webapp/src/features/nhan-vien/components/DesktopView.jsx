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
      { 
        key: 'maNhanVien', 
        label: 'MÃ NV', 
        minWidth: 100,
        sortable: true 
      },
      { 
        key: 'tenNhanVien', 
        label: 'HỌ TÊN', 
        minWidth: 170,
        sortable: true 
      },
      { 
        key: 'tenDangNhap', 
        label: 'TÊN ĐĂNG NHẬP', 
        minWidth: 150,
        sortable: true 
      },
      { 
        key: 'email', 
        label: 'EMAIL', 
        minWidth: 170,
        sortable: true 
      },
      { 
        key: 'chucVu', 
        label: 'CHỨC VỤ', 
        minWidth: 120,
        sortable: true 
      }
    ],
    []
  );

  // Render action buttons for each row
  const renderActions = (row) => (
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
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {employees.length === 0 && !isLoading ? (
          <Box textAlign="center" py={4}>
            <Typography variant="subtitle1">Không tìm thấy nhân viên nào.</Typography>
          </Box>
        ) : (
          <StandardTable
            columns={columns}
            data={employees}
            renderActions={renderActions}
            loading={isLoading}
            error={error}
            emptyMessage="Không có dữ liệu nhân viên"
            sortable={true}
            defaultSort={{ key: 'tenNhanVien', direction: 'asc' }}
            pagination={true}
            page={0}
            rowsPerPage={10}
            totalCount={employees.length}
            onPageChange={(_, page) => console.log('Page changed to:', page)}
            onRowsPerPageChange={(e) => console.log('Rows per page changed to:', e.target.value)}
            showSTT={true}
          />
        )}
      </Paper>
    </Box>
  );
};
export default DesktopView;
