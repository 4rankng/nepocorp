import React from 'react';
import { Box, Chip } from '@mui/material';
import { formatDateForDisplay, formatCurrencyVND } from '../utils/lichVanChuyenUtils';
// Status mapping for display
export const trangThaiMap = {
  len_lich: 'Lên lịch',
  tam_thoi: 'Tạm thời',
  dang_chay: 'Đang chạy',
  hoan_thanh: 'Hoàn thành',
  huy_bo: 'Hủy bỏ',
};
/**
 * Generate table columns configuration for Lich Van Chuyen (Transport Schedule)
 * @param {Object} selectOptions - Options for select fields (khachHang, nhanVien)
 * @param {Object} theme - MUI theme object
 * @returns {Array} Array of column configurations
 */
export const createLichVanChuyenColumns = (selectOptions, theme) => [
  {
    field: 'ma_chuyen', // id -> field
    headerName: 'Mã', // header -> headerName
    width: 60, // '1%', maxWidth: '60px' -> fixed width
    // padding: '0px', // Not a standard DataGrid prop, handle with sx if needed
    sortable: true,
    renderCell: (params) => { // render -> renderCell, adapt signature
      const row = params.row;
      return (
        <Box
          component="span"
          sx={{
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            maxWidth: '60px', // Keep maxWidth for content
          }}
        >
          {row.ma_chuyen || '-'}
        </Box>
      );
    }
    // sortValue removed, DataGrid sorts by 'ma_chuyen' field by default
  },
  {
    field: 'ngay_di', // id -> field
    headerName: 'Ngày Đi', // header -> headerName
    width: 100, // '5%' -> fixed width or flex
    sortable: true,
    renderCell: (params) => (params.row.ngay_di ? formatDateForDisplay(params.row.ngay_di) : '-'),
    type: 'date', // Hint for DataGrid
    valueGetter: params => params.row.ngay_di ? new Date(params.row.ngay_di) : null, // For proper date sorting
  },
  {
    field: 'ma_khach_hang_display', // Using a new field for display/sorting by name
    headerName: 'Khách Hàng', // header -> headerName
    flex: 3.5, // '35%' -> flex
    sortable: true,
    valueGetter: params => { // To get customer name for sorting/filtering
      const row = params.row;
      if (!selectOptions.khachHang || selectOptions.khachHang.length === 0) {
        return row.ma_khach_hang || '-';
      }
      const khachHang = selectOptions.khachHang.find(kh => kh.ma_dinh_danh === row.ma_khach_hang);
      return khachHang ? khachHang.label : row.ma_khach_hang || '-';
    },
    renderCell: (params) => { // render -> renderCell
        // Value from valueGetter is params.value
      return (
        <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
          {params.value}
        </Box>
      );
    }
  },
  {
    field: 'bien_so_dau_keo', // id -> field
    headerName: 'Xe Vận Chuyển', // header -> headerName
    flex: 1, // '5%' -> flex
    sortable: true,
    renderCell: (params) => ( // render -> renderCell
      <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
        {params.row.bien_so_dau_keo || '-'}
      </Box>
    )
  },
  {
    field: 'ghi_chu', // id -> field
    headerName: 'Diễn Giải', // header -> headerName
    flex: 3, // '30%' -> flex
    sortable: true,
    renderCell: (params) => params.row.ghi_chu || '-'
  },
  {
    field: 'cuoc_van_chuyen_vnd', // id -> field
    headerName: 'Cước Vận Chuyển', // header -> headerName
    align: 'right',
    headerAlign: 'right',
    flex: 1.2, // '12%' -> flex
    sortable: true,
    renderCell: (params) =>
      params.row.cuoc_van_chuyen_vnd ? formatCurrencyVND(params.row.cuoc_van_chuyen_vnd) : '-',
    type: 'number',
  },
  {
    field: 'vnd_chi_phi', // id -> field
    headerName: 'Tổng Chi Phí', // header -> headerName
    align: 'right',
    headerAlign: 'right',
    flex: 1, // '10%' -> flex
    sortable: true,
    renderCell: (params) => formatCurrencyVND(params.row.vnd_chi_phi || 0),
    type: 'number',
  },
  {
    field: 'loi_nhuan_gop', // id -> field
    headerName: 'Lợi Nhuận Gộp', // header -> headerName
    align: 'right',
    headerAlign: 'right',
    flex: 1, // '10%' -> flex
    sortable: true,
    valueGetter: params => { // For correct sorting
      const row = params.row;
      const totalCost = row.vnd_chi_phi || 0;
      const revenue = row.cuoc_van_chuyen_vnd || 0;
      return revenue - totalCost;
    },
    renderCell: (params) => { // render -> renderCell
      const grossProfit = params.value; // Value from valueGetter
      return (
        <Box
          component="span"
          sx={{
            color: grossProfit >= 0 ? 'success.main' : 'error.main',
            fontWeight: 500,
          }}
        >
          {formatCurrencyVND(grossProfit)}
        </Box>
      );
    },
    type: 'number',
  },
  {
    field: 'trang_thai', // id -> field
    headerName: 'Trạng Thái', // header -> headerName
    width: 130, // '8%' -> fixed width for Chip or flex: 0.8
    sortable: true,
    renderCell: (params) => { // render -> renderCell
      const row = params.row;
      return (
        <Chip
          label={trangThaiMap[row.trang_thai] || row.trang_thai}
        size="small"
        sx={{
          borderRadius: 0.5,
          minWidth: 70,
          height: 22,
          fontSize: '0.7rem',
          padding: '0 4px',
          '& .MuiChip-label': {
            padding: '0 6px',
          },
          backgroundColor: theme => {
            switch (row.trang_thai) {
              case 'hoan_thanh':
                return 'rgba(76, 175, 80, 0.15)'; // Muted green
              case 'huy_bo':
                return 'rgba(211, 47, 47, 0.7)'; // More opaque red
              case 'dang_chay':
                return 'rgba(25, 118, 210, 0.15)'; // Muted blue
              case 'len_lich':
                return 'rgba(0, 150, 136, 0.7)'; // More opaque teal
              case 'tam_thoi':
                return 'rgba(97, 97, 97, 0.12)'; // Muted gray
              default:
                return theme.palette.grey[100];
            }
          },
          color: theme => {
            switch (row.trang_thai) {
              case 'hoan_thanh':
                return 'rgb(46, 125, 50)'; // Dark green
              case 'huy_bo':
                return theme.palette.common.white; // White text
              case 'dang_chay':
                return 'rgb(21, 101, 192)'; // Dark blue
              case 'len_lich':
                return theme.palette.common.white; // White text
              case 'tam_thoi':
                return 'rgb(97, 97, 97)'; // Dark gray
              default:
                return theme.palette.text.secondary;
            }
          },
        }}
      />
    ),
    sortValue: (_, row) => row.trang_thai || '',
  },
];
/**
 * Calculate total cost for a transport record
 * @param {Object} row - Transport record data
 * @returns {number} Total cost
 */
export const calculateTotalCost = row => {
  return (
    (row.vnd_dau || 0) +
    (row.vnd_di_duong || 0) +
    (row.cuoc_van_chuyen_vnd || 0) +
    (row.cuoc_thue_van_chuyen_vnd || 0)
  );
};
/**
 * Get status color configuration
 * @param {string} status - Status value
 * @returns {Object} Color configuration for the status
 */
export const getStatusColor = status => {
  const colorMap = {
    hoan_thanh: { bg: 'success.light', color: 'common.white' },
    huy_bo: { bg: 'error.light', color: 'common.white' },
    dang_di: { bg: 'info.light', color: 'common.white' },
    default: { bg: 'grey.200', color: 'text.primary' },
  };
  return colorMap[status] || colorMap.default;
};
