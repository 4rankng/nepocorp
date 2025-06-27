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
  Alert,
} from '@mui/material';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, SearchBar } from '@/components';
const ContainerListResponsive = ({
  data = [],
  loading = false,
  pagination = null,
  onEdit,
  onDelete,
  onPageChange,
  emptyMessage = 'Chưa có dữ liệu container',
  error = '',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchTerm, setSearchTerm] = useState('');
  // Use server pagination values
  const page = pagination ? pagination.page - 1 : 0; // MUI uses 0-based indexing
  const rowsPerPage = pagination ? pagination.limit : 10;
  const totalCount = pagination ? pagination.records_count : data.length;

  // Handle page change
  const handleChangePage = (event, newPage) => {
    if (onPageChange) {
      onPageChange(newPage + 1, rowsPerPage); // Convert back to 1-based indexing for API
    }
  };
  // Handle rows per page change
  const handleChangeRowsPerPage = event => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    if (onPageChange) {
      onPageChange(1, newRowsPerPage); // Reset to first page when changing rows per page
    }
  };
  // For server-side pagination, we use the data as-is since it's already paginated
  // Client-side search is removed as it should be handled server-side
  const displayData = data;
  // Handle search input change
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
    // For now, keep local search until server-side search is implemented
  };
  // Define columns for StandardTable
  const columns = [
    {
      key: 'category',
      label: 'LOẠI CONTAINER',
      align: 'left',
      sortable: true,
      render: value => value || 'Chưa sửa',
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
      {displayData.map(item => (
        <Card key={item.id} elevation={2}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6" component="div">
                  {item.category || 'Chưa sửa'}
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
      {!loading && displayData.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          {searchTerm ? 'Không tìm thấy container phù hợp' : emptyMessage}
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
            placeholder="Tìm kiếm theo loại container..."
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
        {!loading && !error && totalCount > 0 && (
          <TablePagination
            component="div"
            count={totalCount}
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
          placeholder="Tìm kiếm theo loại container..."
        />
      </Box>
      <StandardTable
        columns={columns}
        data={displayData}
        renderActions={renderActions}
        loading={loading}
        error={error}
        emptyMessage={searchTerm ? 'Không tìm thấy container phù hợp' : emptyMessage}
        sortable={true}
        defaultSort={{ key: 'category', direction: 'asc' }}
        pagination={true}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        showSTT={true}
      />
    </Box>
  );
};
export default ContainerListResponsive;
