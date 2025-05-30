import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme, CircularProgress, Alert, Skeleton } from '@mui/material';
import { StandardTable } from '@components';
import { useDiDuong } from '../hooks';

const DinhMucDiDuong = () => {
  const muiTheme = useTheme();
  const { roadNorms, containerTypes, routes, isLoading, error } = useDiDuong();

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
        key: 'ten_tuyen',
        label: 'Tên tuyến',
        width: '20%', // Adjusted width
        sortable: true,
        render: (_cellValue, rowData) => (
          <Typography variant="caption" color="text.secondary">
            {`${rowData.diem_di} → ${rowData.diem_den?.split(';')[0] || ''}`}
          </Typography>
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
        <StandardTable
          columns={columns}
          data={tableData}
          loading={false} // We handle loading state separately
          emptyMessage="Chưa có dữ liệu định mức đi đường"
          rowKeyField="id"
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
      )}
    </Paper>
  );
};

export default DinhMucDiDuong;
