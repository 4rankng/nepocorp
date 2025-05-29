import React from 'react';
import { Box, Chip } from '@mui/material';
import { formatDateForDisplay, formatCurrencyVND } from '../utils/lichVanChuyenUtils';

// Status mapping for display
export const trangThaiMap = {
  len_lich: 'Lên lịch',
  tam_thoi: 'Chờ xác nhận',
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
    id: 'ma_chuyen',
    header: 'Mã',
    width: '1%', 
    maxWidth: '60px',
    padding: '0px',
    sortable: true,
    render: (_, row) => (
      <Box 
        component="span" 
        sx={{ 
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
          maxWidth: '60px'
        }}
      >
        {row.ma_chuyen || '-'}
      </Box>
    ),
    sortValue: (_, row) => row.ma_chuyen || '',
  },
  {
    id: 'ngay_di',
    header: 'Ngày Đi',
    width: '5%',
    sortable: true,
    render: (_, row) => (row.ngay_di ? formatDateForDisplay(row.ngay_di) : '-'),
    sortValue: (_, row) => row.ngay_di || '',
  },
  {
    id: 'ma_khach_hang',
    header: 'Khách Hàng',
    width: '35%',
    sortable: true,
    render: (_, row) => {
      try {
        if (!selectOptions.khachHang || selectOptions.khachHang.length === 0) {
          console.warn('khachHang options not loaded yet');
          return row.ma_khach_hang || '-';
        }
        // Look up the customer by ma_dinh_danh instead of ID
        const khachHang = selectOptions.khachHang.find(kh => kh.ma_dinh_danh === row.ma_khach_hang);

        // Display the customer name (label) if found, otherwise show the ID
        return (
          <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {khachHang ? khachHang.label : row.ma_khach_hang || '-'}
          </Box>
        );
      } catch (error) {
        console.error('Error rendering ma_khach_hang:', error);
        return row.ma_khach_hang || '-';
      }
    },
    sortValue: (_, row) => {
      const khachHang = selectOptions.khachHang.find(kh => kh.ma_dinh_danh === row.ma_khach_hang);
      return khachHang ? khachHang.label : row.ma_khach_hang || '';
    },
  },
  {
    id: 'bien_so_dau_keo',
    header: 'Xe Vận Chuyển',
    width: '5%',
    sortable: true,
    render: (_, row) => (
      <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
        {row.bien_so_dau_keo || '-'}
      </Box>
    ),
    sortValue: (_, row) => row.bien_so_dau_keo || '',
  },
  {
    id: 'ghi_chu',
    header: 'Diễn Giải',
    width: '30%',
    sortable: true,
    render: (_, row) => row.ghi_chu || '-',
    sortValue: (_, row) => row.ghi_chu || '',
  },
  {
    id: 'cuoc_van_chuyen_vnd',
    header: 'Cước Vận Chuyển',
    align: 'right',
    width: '12%',
    sortable: true,
    render: (_, row) =>
      row.cuoc_van_chuyen_vnd ? formatCurrencyVND(row.cuoc_van_chuyen_vnd) : '-',
    sortValue: (_, row) => row.cuoc_van_chuyen_vnd || 0,
  },
  {
    id: 'vnd_chi_phi',
    header: 'Tổng Chi Phí',
    align: 'right',
    width: '10%',
    sortable: true,
    render: (_, row) => formatCurrencyVND(row.vnd_chi_phi || 0),
    sortValue: (_, row) => row.vnd_chi_phi || 0,
  },
  {
    id: 'loi_nhuan_gop',
    header: 'Lợi Nhuận Gộp',
    align: 'right',
    width: '10%',
    sortable: true,
    render: (_, row) => {
      const totalCost = row.vnd_chi_phi || 0;
      const revenue = row.cuoc_van_chuyen_vnd || 0;
      const grossProfit = revenue - totalCost;
      
      return (
        <Box 
          component="span" 
          sx={{ 
            color: grossProfit >= 0 ? 'success.main' : 'error.main',
            fontWeight: 500
          }}
        >
          {formatCurrencyVND(grossProfit)}
        </Box>
      );
    },
    sortValue: (_, row) => {
      const totalCost = row.vnd_chi_phi || 0;
      const revenue = row.cuoc_van_chuyen_vnd || 0;
      return revenue - totalCost;
    },
  },
  {
    id: 'trang_thai',
    header: 'Trạng Thái',
    width: '8%',
    sortable: true,
    render: (_, row) => (
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
          backgroundColor: theme =>
            row.trang_thai === 'hoan_thanh'
              ? theme.palette.success.light
              : row.trang_thai === 'huy_bo'
                ? theme.palette.error.light
                : row.trang_thai === 'dang_chay'
                  ? theme.palette.info.light
                  : theme.palette.grey[200],
          color: theme =>
            row.trang_thai === 'hoan_thanh' ||
            row.trang_thai === 'huy_bo' ||
            row.trang_thai === 'dang_chay'
              ? theme.palette.common.white
              : theme.palette.text.primary,
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
export const calculateTotalCost = (row) => {
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
export const getStatusColor = (status) => {
  const colorMap = {
    hoan_thanh: { bg: 'success.light', color: 'common.white' },
    huy_bo: { bg: 'error.light', color: 'common.white' },
    dang_di: { bg: 'info.light', color: 'common.white' },
    default: { bg: 'grey.200', color: 'text.primary' },
  };

  return colorMap[status] || colorMap.default;
};
