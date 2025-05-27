import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Typography,
  IconButton,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

const CustomerListResponsive = ({
  customers = [],
  loading = false,
  onEdit,
  onDelete,
  emptyMessage = 'Không có dữ liệu khách hàng',
  error = '',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchTerm, setSearchTerm] = useState('');

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;

    const term = searchTerm.toLowerCase();
    return customers.filter(
      customer =>
        (customer.name && customer.name.toLowerCase().includes(term)) ||
        (customer.address && customer.address.toLowerCase().includes(term)) ||
        (customer.taxCode && customer.taxCode.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Handle search input change
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
  };

  // Render mobile card view
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {filteredCustomers.map(customer => (
        <Card key={customer.id} elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" component="div">
                  {customer.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Địa chỉ:</strong> {customer.address || 'Chưa cập nhật'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Mã số thuế:</strong> {customer.taxCode || 'Chưa cập nhật'}
                </Typography>
              </Box>
              <Box>
                <EditButton onClick={() => onEdit(customer)} size="small" />
                <DeleteButton onClick={() => onDelete(customer)} size="small" sx={{ ml: 1 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
      {!loading && filteredCustomers.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          {searchTerm ? 'Không tìm thấy khách hàng phù hợp' : emptyMessage}
        </Typography>
      )}
    </Box>
  );

  // Render desktop table view
  const renderDesktopView = () => (
    <TableContainer component={Paper} elevation={2}>
      <Table sx={{ minWidth: 650 }} aria-label="danh sách khách hàng">
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>Tên khách hàng</strong>
            </TableCell>
            <TableCell>
              <strong>Địa chỉ</strong>
            </TableCell>
            <TableCell>
              <strong>Mã số thuế</strong>
            </TableCell>
            <TableCell align="right">
              <strong>Thao tác</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredCustomers.map(customer => (
            <TableRow key={customer.id} hover>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.address || 'Chưa cập nhật'}</TableCell>
              <TableCell>{customer.taxCode || 'Chưa cập nhật'}</TableCell>
              <TableCell align="right">
                <EditButton onClick={() => onEdit(customer)} size="small" />
                <DeleteButton onClick={() => onDelete(customer)} size="small" sx={{ ml: 1 }} />
              </TableCell>
            </TableRow>
          ))}
          {!loading && filteredCustomers.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchTerm ? 'Không tìm thấy khách hàng phù hợp' : emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo tên, địa chỉ hoặc mã số thuế..."
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

      {/* Loading state */}
      {loading && (
        <Box textAlign="center" py={4}>
          <Typography>Đang tải dữ liệu...</Typography>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Box color="error.main" py={2}>
          <Typography>{error}</Typography>
        </Box>
      )}

      {/* Content */}
      {!loading && !error && <>{isMobile ? renderMobileView() : renderDesktopView()}</>}
    </Box>
  );
};

export default CustomerListResponsive;
