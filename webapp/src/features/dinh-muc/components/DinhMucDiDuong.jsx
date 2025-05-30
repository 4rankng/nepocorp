import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme, CircularProgress, Alert } from '@mui/material';
import { StandardTable } from '@components';
import { useDiDuong } from '../hooks';

const DinhMucDiDuong = () => {
  const muiTheme = useTheme();
  const { roadNorms, containerTypes, isLoading, error } = useDiDuong();

  // Sort container types by name (e.g., "20'", "40'") for consistent column order
  const sortedContainerTypes = React.useMemo(() => {
    return [...containerTypes].sort((a, b) => {
      // Extract numbers for sorting, e.g., 20 from "20'"
      const numA = parseInt(a.ten_loai_container, 10);
      const numB = parseInt(b.ten_loai_container, 10);
      return numA - numB;
    });
  }, [containerTypes]);

  // Prepare columns for StandardTable
  const columns = useMemo(() => [
    {
      key: 'routeName',
      label: 'Tuyến đường',
      width: '25%',
      sortable: true,
      render: (value) => (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      )
    },
    ...sortedContainerTypes.map(ct => ({
      key: `norms.${ct.ma_loai_container}`,
      label: ct.ten_loai_container,
      align: 'right',
      sortable: true,
      render: (_, row) => (
        <Typography variant="body2">
          {row.norms[ct.ma_loai_container] 
            ? row.norms[ct.ma_loai_container].toLocaleString('vi-VN') 
            : '-'}
        </Typography>
      )
    }))
  ], [sortedContainerTypes]);

  // Transform data for StandardTable
  const tableData = useMemo(() => {
    return roadNorms.map(row => ({
      ...row,
      id: row.routeId // Required for rowKeyField
    }));
  }, [roadNorms]);

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        mb: 3,
        boxShadow: muiTheme.customShadows ? muiTheme.customShadows.card : muiTheme.shadows[1],
      }}
    >
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
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
              px: 2
            },
            '& .MuiTableHead-root': {
              backgroundColor: muiTheme.palette.grey[100]
            },
            '& .MuiTableRow-hover:hover': {
              backgroundColor: muiTheme.palette.action.hover
            }
          }}
        />
      )}
    </Paper>
  );
};

export default DinhMucDiDuong;
