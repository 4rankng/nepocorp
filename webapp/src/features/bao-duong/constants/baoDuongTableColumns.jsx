import React from 'react';
import { formatCurrency, addMonths } from '../utils/baoDuongUtils';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

export const getBaoDuongTableColumns = () => {
  return [
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
    minWidth: 32,
    maxWidth: 48,
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
    minWidth: 300,
    sortable: false,
    flex: 2,
  },
];
};

export const baoDuongTableColumns = getBaoDuongTableColumns();
