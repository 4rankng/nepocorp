import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Fab,
  Zoom,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

const MobileView = ({
  customers = [],
  loading = false,
  onEdit,
  onDelete,
  onAdd,
  emptyMessage = 'Không có dữ liệu khách hàng',
  error = '',
}) => {
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

  return (
    <Box sx={{ pb: { xs: 10, sm: 11 } }}>
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
            sx: {
              borderRadius: '6px',
              height: 36,
              minHeight: 36,
              fontSize: '0.95rem',
            },
          }}
        />
      </Box>

      {/* Loading state */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress size={24} />
          <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Box color="error.main" py={2}>
          <Typography>{error}</Typography>
        </Box>
      )}

      {/* Content */}
      {!loading && !error && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredCustomers.map(customer => (
            <Card key={customer.id} elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight="medium"
                        sx={{
                          px: 1,
                          py: 0.25,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 0.5,
                          fontSize: '0.75rem',
                          backgroundColor: 'background.paper',
                        }}
                      >
                        {customer.ma_dinh_danh || '--'}
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        fontSize: '1.1rem',
                        wordBreak: 'break-word',
                      }}
                    >
                      {customer.ten}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      <strong>Địa chỉ:</strong> {customer.dia_chi || 'Chưa cập nhật'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Mã số thuế:</strong> {customer.ma_so_thue || 'Chưa cập nhật'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                    <EditButton
                      onClick={() => onEdit(customer)}
                      size="small"
                      sx={{ minWidth: 32, height: 32 }}
                    />
                    <DeleteButton
                      onClick={() => onDelete(customer)}
                      size="small"
                      sx={{ minWidth: 32, height: 32 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

          {filteredCustomers.length === 0 && (
            <Box textAlign="center" py={6}>
              <Typography variant="body1" color="text.secondary">
                {searchTerm ? 'Không tìm thấy khách hàng phù hợp' : emptyMessage}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Floating Action Button */}
      <Zoom in={!loading}>
        <Fab
          color="primary"
          aria-label="Thêm khách hàng"
          onClick={onAdd}
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
            transition: 'all 0.2s ease-in-out',
            width: 56,
            height: 56,
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default MobileView;
