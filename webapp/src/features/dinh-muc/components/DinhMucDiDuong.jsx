import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  CircularProgress,
  Alert,
  Skeleton,
  TextField,
  InputAdornment,
} from '@mui/material';
import { StandardTable } from '@components';
import { useDiDuong } from '../hooks';
import { Search as SearchIcon } from '@mui/icons-material';

const DinhMucDiDuong = () => {
  const muiTheme = useTheme();
  const { roadNorms, containerTypes, routes, isLoading, error } = useDiDuong();
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  // Sort container types by name (e.g., "20'", "40'") for consistent column order
  const sortedContainerTypes = useMemo(() => {
    return [...containerTypes].sort((a, b) => {
      // Extract numbers for sorting, e.g., 20 from "20'"
      const numA = parseInt(a.ten_loai_container, 10) || 0;
      const numB = parseInt(b.ten_loai_container, 10) || 0;
      return numA - numB;
    });
  }, [containerTypes]);
  // Prepare columns for StandardTable
  const columns = useMemo(
    () => [
      {
        key: 'ma_tuyen',
        label: 'Mã tuyến',
        width: '10%', // Adjusted width
        sortable: true,
        render: (_cellValue, rowData) => (
          <Typography variant="body2" fontWeight={500}>
            {rowData.ma_tuyen}
          </Typography>
        ),
      },
      {
        key: 'diem_di',
        label: 'Điểm đi',
        width: '10%',
        sortable: true,
        render: (_cellValue, rowData) => <Typography variant="body2">{rowData.diem_di}</Typography>,
      },
      {
        key: 'diem_den',
        label: 'Điểm đến',
        width: '20%',
        sortable: true,
        render: (_cellValue, rowData) => (
          <Typography variant="body2">{rowData.diem_den}</Typography>
        ),
      },
      ...sortedContainerTypes.map(ct => ({
        key: `container_${ct.ma_loai_container}`,
        label: ct.ten_loai_container,
        align: 'right',
        sortable: true,
        render: (_cellValue, rowData) => {
          const normValue = rowData.containerNorms[ct.ma_loai_container];
          return (
            <Typography variant="body2">
              {normValue !== undefined ? normValue.toLocaleString('vi-VN') : '-'}
            </Typography>
          );
        },
      })),
    ],
    [sortedContainerTypes]
  );
  // Transform data for StandardTable - group by routes and container types
  const tableData = useMemo(() => {
    // Create a map of routes
    const routeMap = routes.reduce((acc, route) => {
      acc[route.ma_so] = {
        id: route.ma_so,
        ma_tuyen: route.ma_so,
        diem_di: route.diem_di,
        diem_den: route.diem_den,
        containerNorms: {},
      };
      return acc;
    }, {});
    // Fill in the norm values for each route and container type
    roadNorms.forEach(norm => {
      const routeKey = norm.ma_tuyen;
      const containerKey = norm.ma_loai_container;
      // If the route exists in our map
      if (routeMap[routeKey]) {
        // Add the norm value for this container type
        routeMap[routeKey].containerNorms[containerKey] = norm.dinh_muc;
      }
    });
    // Convert the map to an array for the table
    return Object.values(routeMap);
  }, [routes, roadNorms]);

  // Filtered data by search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return tableData;
    const lower = searchTerm.trim().toLowerCase();
    return tableData.filter(
      row =>
        (row.ma_tuyen && row.ma_tuyen.toLowerCase().includes(lower)) ||
        (row.diem_di && row.diem_di.toLowerCase().includes(lower)) ||
        (row.diem_den && row.diem_den.toLowerCase().includes(lower))
    );
  }, [tableData, searchTerm]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const handlePageChange = (_event, newPage) => {
    setPage(newPage);
  };
  const handleRowsPerPageChange = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
    setPage(0);
  };
  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        mb: 3,
        boxShadow: muiTheme.customShadows ? muiTheme.customShadows.card : muiTheme.shadows[1],
      }}
    >
      {isLoading && (
        <Box sx={{ width: '100%', minHeight: 200, p: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ mb: 1 }} />
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} variant="rectangular" width="100%" height={52} sx={{ mb: 0.5 }} />
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body2">Đang tải dữ liệu...</Typography>
          </Box>
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Không thể tải dữ liệu định mức đi đường: {error}
        </Alert>
      )}
      {!isLoading && !error && (
        <>
          <Box sx={{ mb: 2, width: '100%' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Tìm kiếm theo mã tuyến, điểm đi, điểm đến..."
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
            data={paginatedData}
            loading={false} // We handle loading state separately
            emptyMessage={
              searchTerm
                ? `Không tìm thấy kết quả cho "${searchTerm}"`
                : 'Chưa có dữ liệu định mức đi đường'
            }
            rowKeyField="id"
            pagination
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={filteredData.length}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            sx={{
              '& .MuiTableCell-root': {
                py: 1.5,
                px: 2,
              },
              '& .MuiTableHead-root': {
                backgroundColor: muiTheme.palette.grey[100],
              },
              '& .MuiTableRow-hover:hover': {
                backgroundColor: muiTheme.palette.action.hover,
              },
            }}
          />
        </>
      )}
    </Paper>
  );
};
export default DinhMucDiDuong;
