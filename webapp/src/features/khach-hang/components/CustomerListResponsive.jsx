import React, { useState, useMemo } from 'react';
import {
  Box,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StandardTable from '@/components/StandardTable';
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
        (customer.ten && customer.ten.toLowerCase().includes(term)) ||
        (customer.dia_chi && customer.dia_chi.toLowerCase().includes(term)) ||
        (customer.ma_so_thue && customer.ma_so_thue.toLowerCase().includes(term)) ||
        (customer.ma_dinh_danh && customer.ma_dinh_danh.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);
  // Handle search input change
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
  };
  // Define columns for StandardTable
  const columns = [
    {
      key: 'ten',
      label: 'Tên khách hàng',
      align: 'left',
      sortable: true,
    },
    {
      key: 'dia_chi',
      label: 'Địa chỉ',
      align: 'left',
      sortable: true,
      render: value => value || 'Chưa cập nhật',
    },
    {
      key: 'ma_so_thue',
      label: 'Mã số thuế',
      align: 'left',
      sortable: true,
      render: value => value || 'Chưa cập nhật',
    },
  ];
  // Render action buttons for each row
  const renderActions = customer => (
    <>
      <EditButton onClick={() => onEdit(customer)} size="small" />
      <DeleteButton onClick={() => onDelete(customer)} size="small" sx={{ ml: 1 }} />
    </>
  );
  // Handle row click for better UX
  const handleRowClick = customer => {
    // Optional: you can implement row click functionality here
    // For now, we'll just use the action buttons
  };
  // Render mobile card view for better responsive experience
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {filteredCustomers.map(customer => (
        <Card key={customer.id} elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" component="div">
                  {customer.ten}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Địa chỉ:</strong> {customer.dia_chi || 'Chưa cập nhật'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Mã số thuế:</strong> {customer.ma_so_thue || 'Chưa cập nhật'}
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
  // Show mobile view on small screens, StandardTable on larger screens
  if (isMobile) {
    return (
      <Box>
        {/* Search bar */}
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
              sx: {
                borderRadius: '6px',
                height: 36,
                minHeight: 36,
                fontSize: '0.95rem',
              },
            }}
          />
        </Box>
        {!loading && !error && renderMobileView()}
      </Box>
    );
  }
  // Desktop view using StandardTable
  return (
    <Box>
      {/* Search bar */}
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
            sx: {
              borderRadius: '6px',
              height: 36,
              minHeight: 36,
              fontSize: '0.95rem',
            },
          }}
        />
      </Box>
      <StandardTable
        columns={columns}
        data={filteredCustomers}
        renderActions={renderActions}
        loading={loading}
        error={error}
        onRowClick={handleRowClick}
        emptyMessage={searchTerm ? 'Không tìm thấy khách hàng phù hợp' : emptyMessage}
        sortable={true}
        defaultSort={{ key: 'ten', direction: 'asc' }}
      />
    </Box>
  );
};
export default CustomerListResponsive;
