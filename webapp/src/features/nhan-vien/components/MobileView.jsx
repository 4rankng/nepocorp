import React from 'react';
import {
  Box,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  Typography,
  Chip,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ProfileCard from '@/components/ProfileCard';

const MobileView = ({
  employees,
  isLoading,
  error,
  searchTerm,
  handleSearchChange,
  handleOpenModalForEdit,
  handleDeleteRequest,
  canEditDelete,
}) => {
  // Helper function to render employee chips
  const renderEmployeeChips = employee => (
    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
      <Chip
        label={employee.chucVu || 'Chưa xác định'}
        size="small"
        color={
          employee.chucVu === 'Quản lý'
            ? 'primary'
            : employee.chucVu === 'Lái xe'
              ? 'secondary'
              : employee.chucVu === 'Kế toán'
                ? 'success'
                : employee.chucVu === 'Giao nhận'
                  ? 'warning'
                  : 'default'
        }
        variant="outlined"
      />
      {employee.chucVu === 'Lái xe' && employee.bienSoXe && (
        <Chip
          icon={<LocalShippingIcon fontSize="small" />}
          label={`Xe: ${employee.bienSoXe}`}
          size="small"
          color="secondary"
          variant="outlined"
        />
      )}
    </Box>
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
    <Box sx={{ p: { xs: 1, sm: 2 }, pb: { xs: 10, sm: 11 } }}>
      {' '}
      {/* Padding for potential FAB from parent */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm nhân viên..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {employees.length === 0 && !isLoading ? (
        <Box textAlign="center" py={4}>
          <Typography variant="subtitle1">Không tìm thấy nhân viên nào.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {employees.map(employee => (
            <ProfileCard
              key={employee.id}
              item={employee}
              identifier={employee.maNhanVien || 'NV--'}
              name={employee.tenNhanVien}
              infoLine1={
                <>
                  <strong>Tài khoản:</strong> {employee.tenDangNhap}
                </>
              }
              infoLine2={
                <>
                  <strong>Email:</strong> {employee.email}
                </>
              }
              extraContent={renderEmployeeChips(employee)}
              onEdit={() => handleOpenModalForEdit(employee)}
              onDelete={() => handleDeleteRequest(employee)}
              loading={isLoading}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default MobileView;
