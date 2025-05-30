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
const PartnerListResponsive = ({
  partners = [],
  loading = false,
  onEdit,
  onDelete,
  emptyMessage = 'Không có dữ liệu đối tác',
  error = '',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchTerm, setSearchTerm] = useState('');
  // Filter partners based on search term
  const filteredPartners = useMemo(() => {
    if (!searchTerm.trim()) return partners;
    const term = searchTerm.toLowerCase();
    return partners.filter(
      partner =>
        (partner.ten && partner.ten.toLowerCase().includes(term)) ||
        (partner.dia_chi && partner.dia_chi.toLowerCase().includes(term)) ||
        (partner.ma_so_thue && partner.ma_so_thue.toLowerCase().includes(term)) ||
        (partner.ma_dinh_danh && partner.ma_dinh_danh.toLowerCase().includes(term))
    );
  }, [partners, searchTerm]);
  // Handle search input change
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
  };
  // Render mobile card view
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {filteredPartners.map(partner => (
        <Card key={partner.id} elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="body2" color="primary" fontWeight="medium">
                    {partner.ma_dinh_danh || '--'}
                  </Typography>
                  <Typography variant="h6" component="div">
                    {partner.ten}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Địa chỉ:</strong> {partner.dia_chi || 'Chưa cập nhật'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Mã số thuế:</strong> {partner.ma_so_thue || 'Chưa cập nhật'}
                </Typography>
              </Box>
              <Box>
                <EditButton onClick={() => onEdit(partner)} size="small" />
                <DeleteButton onClick={() => onDelete(partner)} size="small" sx={{ ml: 1 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
      {!loading && filteredPartners.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          {searchTerm ? 'Không tìm thấy đối tác phù hợp' : emptyMessage}
        </Typography>
      )}
    </Box>
  );
  // Render desktop table view
  const renderDesktopView = () => (
    <TableContainer component={Paper} elevation={2}>
      <Table sx={{ minWidth: 650 }} aria-label="danh sách đối tác">
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>Mã đối tác</strong>
            </TableCell>
            <TableCell>
              <strong>Tên đối tác</strong>
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
          {filteredPartners.map(partner => (
            <TableRow key={partner.id} hover>
              <TableCell sx={{ fontWeight: 'medium' }}>{partner.ma_dinh_danh || '--'}</TableCell>
              <TableCell>{partner.ten}</TableCell>
              <TableCell>{partner.dia_chi || '--'}</TableCell>
              <TableCell>{partner.ma_so_thue || '--'}</TableCell>
              <TableCell align="right">
                <EditButton onClick={() => onEdit(partner)} size="small" />
                <DeleteButton onClick={() => onDelete(partner)} size="small" sx={{ ml: 1 }} />
              </TableCell>
            </TableRow>
          ))}
          {!loading && filteredPartners.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchTerm ? 'Không tìm thấy đối tác phù hợp' : emptyMessage}
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
export default PartnerListResponsive;
