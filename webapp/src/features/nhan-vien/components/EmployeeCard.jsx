import React from 'react';
import { Card, CardContent, Typography, Box, IconButton, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

const EmployeeCard = ({ employee, onEdit, onDelete, loading }) => {
  return (
    <Card className="mb-4 shadow-md" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6" className="font-semibold text-gray-800">
                {employee.tenNhanVien}
              </Typography>
              <Chip
                label={employee.maNhanVien || 'NV000'}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
              <Typography variant="body2" color="text.secondary">
                <span className="font-medium">Tài khoản:</span> {employee.tenDangNhap}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <span className="font-medium">•</span> {employee.email}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Chip
                label={employee.chucVu || 'Chưa xác định'}
                size="small"
                color={
                  employee.chucVu === 'Quản lý' ? 'primary' :
                  employee.chucVu === 'Lái xe' ? 'secondary' :
                  employee.chucVu === 'Kế toán' ? 'success' :
                  employee.chucVu === 'Giao nhận' ? 'warning' :
                  'default'
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
          </Box>
          <Box display="flex" flexDirection="column" gap={1}>
            <IconButton
              aria-label="edit"
              onClick={() => onEdit(employee)}
              disabled={loading}
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="delete"
              onClick={() => onDelete(employee)}
              disabled={loading}
              size="small"
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
