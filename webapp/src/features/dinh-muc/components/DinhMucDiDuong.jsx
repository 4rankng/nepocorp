import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material';
import useDinhMucDiDuong from '@hooks/useDinhMucDiDuong';

const DinhMucDiDuong = () => {
  const muiTheme = useTheme();
  const { roadNorms, containerTypes, isLoading, error } = useDinhMucDiDuong();

  // Sort container types by name (e.g., "20'", "40'") for consistent column order
  const sortedContainerTypes = React.useMemo(() => {
    return [...containerTypes].sort((a, b) => {
      // Extract numbers for sorting, e.g., 20 from "20'"
      const numA = parseInt(a.ten_loai_container, 10);
      const numB = parseInt(b.ten_loai_container, 10);
      return numA - numB;
    });
  }, [containerTypes]);

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        mb: 3,
        boxShadow: muiTheme.customShadows ? muiTheme.customShadows.card : muiTheme.shadows[1],
      }}
    >
      <Typography
        variant="h6"
        component="h2"
        sx={{ fontWeight: 'bold', mb: 2, fontSize: { xs: '1rem', md: '1.25rem' } }}
      >
        Định mức đi đường (VNĐ/chuyến)
      </Typography>

      {isLoading && (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 150 }}
        >
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
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: `1px solid ${muiTheme.palette.divider}` }}
        >
          <Table sx={{ minWidth: 650 }} aria-label="road norms table">
            <TableHead sx={{ backgroundColor: muiTheme.palette.grey[100] }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tuyến đường</TableCell>
                {sortedContainerTypes.map(ct => (
                  <TableCell
                    key={ct.ma_loai_container}
                    align="right"
                    sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
                  >
                    {ct.ten_loai_container}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {roadNorms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={1 + sortedContainerTypes.length} align="center">
                    Chưa có dữ liệu định mức đi đường.
                  </TableCell>
                </TableRow>
              ) : (
                roadNorms.map(row => (
                  <TableRow
                    key={row.routeId}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {row.routeName}
                    </TableCell>
                    {sortedContainerTypes.map(ct => (
                      <TableCell key={`${row.routeId}-${ct.ma_loai_container}`} align="right">
                        {row.norms[ct.ma_loai_container]
                          ? row.norms[ct.ma_loai_container].toLocaleString('vi-VN')
                          : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!isLoading && !error && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="textSecondary">
            * Bảng hiển thị định mức chi phí cho mỗi chuyến vận chuyển theo tuyến đường và loại
            container.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default DinhMucDiDuong;
