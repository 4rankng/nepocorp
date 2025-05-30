import React from 'react';
import { formatCurrency, addMonths } from '../utils/baoDuongUtils';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

export const getBaoDuongTableColumns = (page = 0, pageSize = 10) => [
  {
    key: 'stt',
    label: 'STT',
    align: 'center',
    minWidth: 60,
    maxWidth: 80,
    render: (_, __, index) => {
      try {
        // Ensure we have valid numbers for calculation
        const pageNum = Number.isInteger(page) ? Math.max(0, page) : 0;
        const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
        const rowNumber = (pageNum * size) + index + 1;
        return isNaN(rowNumber) ? index + 1 : rowNumber; // Fallback to index + 1 if calculation fails
      } catch (error) {
        console.error('Error calculating row number:', error);
        return index + 1; // Fallback to index + 1 if there's an error
      }
    },
    sortable: false,
  },
  {
    key: 'bien_so',
    label: 'Biển số',
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'item_name',
    label: 'Hạng mục',
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'ngay_thay',
    label: 'Ngày thay',
    render: value => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'ngay_het_han',
    label: 'Ngày hết hạn',
    render: value => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'so_luong',
    label: 'Số lượng',
    align: 'right',
    sortable: true,
    minWidth: 40,
    maxWidth: 60,
    headerAlign: 'center',
  },
  {
    key: 'don_gia',
    label: 'Đơn giá',
    render: formatCurrency,
    align: 'right',
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'tong_tien',
    label: 'Tổng tiền',
    render: formatCurrency,
    align: 'right',
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'ghi_chu',
    label: 'Ghi chú',
    minWidth: 200,
    sortable: false,
    flex: 1,
  },
];

export const baoDuongTableColumns = getBaoDuongTableColumns();
