import React from 'react';
import { formatCurrency, addMonths } from '../utils/baoDuongUtils';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

export const getBaoDuongTableColumns = () => {
  return [
    {
      key: 'bien_so',
      label: 'Biển số',
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'item_name',
      label: 'Hạng mục',
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'ngay_thay',
      label: 'Ngày thay',
      render: value => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'ngay_het_han',
      label: 'Ngày hết hạn',
      render: value => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'so_luong',
      label: 'Số lượng',
      align: 'right',
      sortable: true,
      minWidth: 32,
      maxWidth: 40,
      headerAlign: 'center',
    },
    {
      key: 'don_gia',
      label: 'Đơn giá',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'tong_tien',
      label: 'Tổng tiền',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'ghi_chu',
      label: 'Ghi chú',
      sortable: false,
      flex: 1,
    },
  ];
};

export const baoDuongTableColumns = getBaoDuongTableColumns();
