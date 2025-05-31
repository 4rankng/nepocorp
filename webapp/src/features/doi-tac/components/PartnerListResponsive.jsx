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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { EditButton, DeleteButton } from '@/components/ActionButtons';
import StandardTable from '@/components/StandardTable'; 
import { SearchBar } from '@/components';
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
    // Ensure partners is always an array
    const partnersArray = Array.isArray(partners) ? partners : [];
    if (!searchTerm.trim()) return partnersArray;
    const term = searchTerm.toLowerCase();
    return partnersArray.filter(
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
  // Define columns for StandardTable
  const columns = [
    {
      key: 'ma_dinh_danh',
      label: 'Mã đối tác',
      align: 'left',
      sortable: true,
      render: value => value || '--',
    },
    {
      key: 'ten',
      label: 'Tên đối tác',
      align: 'left',
      sortable: true,
    },
    {
      key: 'dia_chi',
      label: 'Địa chỉ',
      align: 'left',
      sortable: true,
      render: value => value || '--',
    },
    {
      key: 'ma_so_thue',
      label: 'Mã số thuế',
      align: 'left',
      sortable: true,
      render: value => value || '--',
    },
  ];

  // Render action buttons for each row
  const renderActions = partner => (
    <>
      <EditButton onClick={() => onEdit(partner)} size="small" />
      <DeleteButton onClick={() => onDelete(partner)} size="small" sx={{ ml: 1 }} />
    </>
  );

  // Handle row click for better UX
  const handleRowClick = partner => {
    // Optional: you can implement row click functionality here
    // For now, we'll just use the action buttons
  };

  // Render desktop view using StandardTable
  const renderDesktopView = () => (
    <StandardTable
      columns={columns}
      data={filteredPartners}
      renderActions={renderActions}
      loading={loading}
      error={error}
      onRowClick={handleRowClick}
      emptyMessage={searchTerm ? 'Không tìm thấy đối tác phù hợp' : emptyMessage}
      sortable={true}
      defaultSort={{ key: 'ten', direction: 'asc' }}
      pagination={true}
      page={0}
      rowsPerPage={10}
      totalCount={filteredPartners.length}
      onPageChange={(_, page) => console.log('Page changed to:', page)}
      onRowsPerPageChange={(e) => console.log('Rows per page changed to:', e.target.value)}
      showSTT={true}
    />
  );
  return (
    <Box>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Tìm kiếm theo tên, địa chỉ hoặc mã số thuế..."
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
