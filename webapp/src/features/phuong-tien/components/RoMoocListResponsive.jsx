import React, { useState, useMemo } from 'react';
import { 
  Box, 
  useMediaQuery, 
  useTheme, 
  Card, 
  CardContent, 
  Typography, 
  TablePagination,
  CircularProgress,
  Alert
} from '@mui/material';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, SearchBar } from '@/components';
const RoMoocListResponsive = ({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  emptyMessage = 'Chưa có dữ liệu rơ-mooc',
  error = '',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchTerm, setSearchTerm] = useState('');
  // State for pagination
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
  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      item =>
        (item.bien_so && item.bien_so.toLowerCase().includes(term)) ||
        (item.mo_ta && item.mo_ta.toLowerCase().includes(term))
    );
  }, [data, searchTerm]);
  // Get current data for the current page
  const paginatedData = useMemo(() => {
    return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);
  // Handle search input change
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };
  // Define columns for StandardTable
  const columns = [
    {
      key: 'bien_so',
      label: 'BIỂN SỐ',
      align: 'left',
      sortable: true,
    },
    {
      key: 'mo_ta',
      label: 'MÔ TẢ',
      align: 'left',
      sortable: true,
      render: value => value || 'Chưa cập nhật',
    },
  ];
  // Render action buttons for each row
  const renderActions = item => (
    <>
      <EditButton onClick={() => onEdit(item)} size="small" />
      <DeleteButton onClick={() => onDelete(item)} size="small" sx={{ ml: 1 }} />
    </>
  );
  // Render mobile card view for better responsive experience
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {paginatedData.map(item => (
        <Card key={item.id} elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" component="div">
                  {item.bien_so}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Mô tả:</strong> {item.mo_ta || 'Chưa cập nhật'}
                </Typography>
              </Box>
              <Box>
                <EditButton onClick={() => onEdit(item)} size="small" />
                <DeleteButton onClick={() => onDelete(item)} size="small" sx={{ ml: 1 }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
      {!loading && paginatedData.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          {searchTerm ? 'Không tìm thấy rơ-mooc phù hợp' : emptyMessage}
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
          <SearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm kiếm theo biển số hoặc mô tả..."
          />
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          renderMobileView()
        )}
        {/* Pagination for mobile view */}
        {!loading && !error && filteredData.length > 0 && (
          <TablePagination
            component="div"
            count={filteredData.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Số dòng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
            sx={{
              '.MuiTablePagination-toolbar': {
                minHeight: 52,
              },
              '.MuiTablePagination-select': {
                fontSize: '0.875rem',
              },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: '0.875rem',
              },
            }}
          />
        )}
      </Box>
    );
  }
  // Desktop view using StandardTable
  return (
    <Box>
      {/* Search bar */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Tìm kiếm theo biển số hoặc mô tả..."
        />
      </Box>
      <StandardTable
        columns={columns}
        data={paginatedData}
        renderActions={renderActions}
        loading={loading}
        error={error}
        emptyMessage={searchTerm ? 'Không tìm thấy rơ-mooc phù hợp' : emptyMessage}
        sortable={true}
        defaultSort={{ key: 'bien_so', direction: 'asc' }}
        pagination={true}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={filteredData.length}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        showSTT={true}
      />
    </Box>
  );
};
export default RoMoocListResponsive;
