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
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter partners based on search term
  const filteredPartners = useMemo(() => {
    if (!searchTerm.trim()) return partners;
    const term = searchTerm.toLowerCase();
    return partners.filter(
      partner =>
        (partner.ten && partner.ten.toLowerCase().includes(term)) ||
        (partner.dia_chi && partner.dia_chi.toLowerCase().includes(term)) ||
        (partner.ma_so_thue && partner.ma_so_thue.toLowerCase().includes(term)) ||
        (partner.ma_dinh_danh && partner.ma_dinh_danh.toLowerCase().includes(term)) ||
        (partner.contact_person && partner.contact_person.toLowerCase().includes(term)) ||
        (partner.contact_phone && partner.contact_phone.toLowerCase().includes(term)) ||
        (partner.contact_email && partner.contact_email.toLowerCase().includes(term))
    );
  }, [partners, searchTerm]);

  // Get current partners for the current page
  const paginatedPartners = useMemo(() => {
    return filteredPartners.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredPartners, page, rowsPerPage]);

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
                  <strong>Địa chỉ:</strong> {partner.dia_chi || 'Chưa sửa'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Mã số thuế:</strong> {partner.ma_so_thue || 'Chưa sửa'}
                </Typography>
                {(partner.contact_person || partner.contact_phone || partner.contact_email) && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Liên hệ:</strong> {[
                      partner.contact_person,
                      partner.contact_phone,
                      partner.contact_email
                    ].filter(Boolean).join(' / ')}
                  </Typography>
                )}
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
    {
      key: 'contact_info',
      label: 'Thông tin liên hệ',
      align: 'left',
      sortable: false,
      render: (value, partner) => {
        const contactParts = [];
        if (partner.contact_person) contactParts.push(partner.contact_person);
        if (partner.contact_phone) contactParts.push(partner.contact_phone);
        if (partner.contact_email) contactParts.push(partner.contact_email);
        return contactParts.length > 0 ? contactParts.join(' / ') : '--';
      },
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
      data={paginatedPartners}
      renderActions={renderActions}
      loading={loading}
      error={error}
      onRowClick={handleRowClick}
      emptyMessage={searchTerm ? 'Không tìm thấy đối tác phù hợp' : emptyMessage}
      sortable={true}
      defaultSort={{ key: 'ten', direction: 'asc' }}
      pagination={true}
      page={page}
      totalCount={filteredPartners.length}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
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
          placeholder="Tìm kiếm theo tên, địa chỉ, mã số thuế hoặc thông tin liên hệ..."
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
