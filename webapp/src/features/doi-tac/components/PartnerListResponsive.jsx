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
import { EditButton, DeleteButton } from '@shared/components/ActionButtons';

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
    return partners.filter(partner => 
      (partner.name && partner.name.toLowerCase().includes(term)) ||
      (partner.address && partner.address.toLowerCase().includes(term)) ||
      (partner.taxCode && partner.taxCode.toLowerCase().includes(term))
    );
  }, [partners, searchTerm]);

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // Render mobile card view
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {filteredPartners.map((partner) => (
        <Card key={partner.id} elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" component="div">
                  {partner.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Địa chỉ:</strong> {partner.address || 'Chưa cập nhật'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Mã số thuế:</strong> {partner.taxCode || 'Chưa cập nhật'}
                </Typography>
              </Box>
              <Box>
                <EditButton onClick={() => onEdit(partner)} size="small" />
                <DeleteButton 
                  onClick={() => onDelete(partner)} 
                  size="small" 
                  sx={{ ml: 1 }} 
                />
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
            <TableCell><strong>Tên đối tác</strong></TableCell>
            <TableCell><strong>Địa chỉ</strong></TableCell>
            <TableCell><strong>Mã số thuế</strong></TableCell>
            <TableCell align="right"><strong>Thao tác</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredPartners.map((partner) => (
            <TableRow key={partner.id} hover>
              <TableCell>{partner.name}</TableCell>
              <TableCell>{partner.address || 'Chưa cập nhật'}</TableCell>
              <TableCell>{partner.taxCode || 'Chưa cập nhật'}</TableCell>
              <TableCell align="right">
                <EditButton onClick={() => onEdit(partner)} size="small" />
                <DeleteButton 
                  onClick={() => onDelete(partner)} 
                  size="small" 
                  sx={{ ml: 1 }} 
                />
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
      {!loading && !error && (
        <>
          {isMobile ? renderMobileView() : renderDesktopView()}
        </>
      )}
    </Box>
  );
};

export default PartnerListResponsive;
