import React from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const EmployeeCard = ({ employee, onEdit, onDelete, loading }) => {
  return (
    <Card className="mb-4 shadow-md" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" className="font-semibold text-gray-800">
              {employee.tenNhanVien}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <span className="font-medium">Tên đăng nhập:</span> {employee.tenDangNhap}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <span className="font-medium">Email:</span> {employee.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <span className="font-medium">Chức vụ:</span> {employee.chucVu || 'Chưa xác định'}
            </Typography>
          </Box>
          <Box display="flex" flexDirection="column" gap={1}>
            <IconButton aria-label="edit" onClick={() => onEdit(employee)} disabled={loading} size="small">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton aria-label="delete" onClick={() => onDelete(employee)} disabled={loading} size="small" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
