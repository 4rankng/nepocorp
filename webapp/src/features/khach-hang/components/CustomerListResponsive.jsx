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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import { Search as SearchIcon, StickyNote2 as NotesIcon } from '@mui/icons-material';
import { EditButton, DeleteButton } from '@/components/ActionButtons';
import StandardTable from '@/components/StandardTable';
import { SearchBar } from '@/components';

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
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [notesDialog, setNotesDialog] = useState({ open: false, notes: '', customerName: '' });

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      customer =>
        (customer.name && customer.name.toLowerCase().includes(term)) ||
        (customer.address && customer.address.toLowerCase().includes(term)) ||
        (customer.tax_code && customer.tax_code.toLowerCase().includes(term)) ||
        (customer.contact_person && customer.contact_person.toLowerCase().includes(term)) ||
        (customer.contact_phone && customer.contact_phone.toLowerCase().includes(term)) ||
        (customer.contact_email && customer.contact_email.toLowerCase().includes(term)) ||
        (customer.notes && customer.notes.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Get current customers for the current page
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredCustomers, page, rowsPerPage]);

  // Handle search input change
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
  };

  // Handle notes dialog
  const handleNotesClick = customer => {
    setNotesDialog({
      open: true,
      notes: customer.notes || 'Không có ghi chú',
      customerName: customer.name || 'Khách hàng',
    });
  };

  const handleCloseNotesDialog = () => {
    setNotesDialog({ open: false, notes: '', customerName: '' });
  };

  // Render mobile card view
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {filteredCustomers.map(customer => (
        <Card key={customer.id} elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="h6" component="div">
                    {customer.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Địa chỉ:</strong> {customer.address || 'Chưa sửa'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Mã số thuế:</strong> {customer.tax_code || 'Chưa sửa'}
                </Typography>
                {(customer.contact_person || customer.contact_phone || customer.contact_email) && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Liên hệ:</strong>{' '}
                    {[customer.contact_person, customer.contact_phone, customer.contact_email]
                      .filter(Boolean)
                      .join(' / ')}
                  </Typography>
                )}
                {customer.notes && customer.notes.trim() !== '' && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Xem ghi chú">
                      <IconButton
                        size="small"
                        onClick={() => handleNotesClick(customer)}
                        sx={{
                          color: 'primary.main',
                          p: 0.5,
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                        }}
                      >
                        <NotesIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="caption" color="primary.main">
                      Có ghi chú
                    </Typography>
                  </Box>
                )}
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

  // Define columns for StandardTable
  const columns = [
    {
      key: 'name',
      label: 'Tên khách hàng',
      align: 'left',
      sortable: true,
    },
    {
      key: 'address',
      label: 'Địa chỉ',
      align: 'left',
      sortable: true,
      render: value => value || '--',
    },
    {
      key: 'tax_code',
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
      render: (value, customer) => {
        const contactParts = [];
        if (customer.contact_person) contactParts.push(customer.contact_person);
        if (customer.contact_phone) contactParts.push(customer.contact_phone);
        if (customer.contact_email) contactParts.push(customer.contact_email);
        return contactParts.length > 0 ? contactParts.join(' / ') : '--';
      },
    },
    {
      key: 'notes',
      label: 'Ghi chú',
      align: 'center',
      sortable: false,
      width: '80px',
      render: (value, customer) => {
        const hasNotes = customer.notes && customer.notes.trim() !== '';
        return (
          <Tooltip title={hasNotes ? 'Xem ghi chú' : 'Không có ghi chú'}>
            <IconButton
              size="small"
              onClick={() => handleNotesClick(customer)}
              sx={{
                color: hasNotes ? 'primary.main' : 'action.disabled',
                opacity: hasNotes ? 1 : 0.5,
                '&:hover': {
                  backgroundColor: hasNotes ? 'primary.light' : 'action.hover',
                  opacity: 1,
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <NotesIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      },
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

  // Render desktop view using StandardTable
  const renderDesktopView = () => (
    <StandardTable
      columns={columns}
      data={paginatedCustomers}
      renderActions={renderActions}
      loading={loading}
      error={error}
      onRowClick={handleRowClick}
      emptyMessage={searchTerm ? 'Không tìm thấy khách hàng phù hợp' : emptyMessage}
      sortable={true}
      defaultSort={{ key: 'name', direction: 'asc' }}
      pagination={true}
      page={page}
      totalCount={filteredCustomers.length}
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
          placeholder="Tìm kiếm theo tên, địa chỉ, mã số thuế, thông tin liên hệ hoặc ghi chú..."
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

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open} onClose={handleCloseNotesDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotesIcon color="primary" />
          Ghi chú - {notesDialog.customerName}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200',
              minHeight: '100px',
            }}
          >
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {notesDialog.notes}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotesDialog} variant="contained">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerListResponsive;
