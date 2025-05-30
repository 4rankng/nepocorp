import React from 'react';
import {
  Box,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  Typography,
  Grid,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import NhanVienCard from './NhanVienCard';

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
        <Grid container spacing={2}>
          {employees.map(employee => (
            <Grid item xs={12} sm={6} key={employee.id}>
              <NhanVienCard
                employee={employee}
                onEdit={() => handleOpenModalForEdit(employee)}
                onDelete={() => handleDeleteRequest(employee)}
                canEditDelete={canEditDelete(employee)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MobileView;
