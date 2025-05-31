import React from 'react';
import { formatCurrency, addMonths } from '../utils/baoDuongUtils';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

export const getBaoDuongTableColumns = () => {
  return [
    {
      field: 'bien_so', // key -> field
      headerName: 'Biển số', // label -> headerName
      sortable: true,
      width: 120, // minWidth -> width
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'item_name', // key -> field
      headerName: 'Hạng mục', // label -> headerName
      sortable: true,
      width: 180, // minWidth -> width, increased
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'ngay_thay', // key -> field
      headerName: 'Ngày thay', // label -> headerName
      renderCell: params => (params.value ? new Date(params.value).toLocaleDateString('vi-VN') : '-'), // render -> renderCell
      sortable: true,
      width: 120, // minWidth -> width
      type: 'date',
      valueGetter: params => params.value ? new Date(params.value) : null,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'ngay_het_han', // key -> field
      headerName: 'Ngày hết hạn', // label -> headerName
      renderCell: params => (params.value ? new Date(params.value).toLocaleDateString('vi-VN') : '-'), // render -> renderCell
      sortable: true,
      width: 120, // minWidth -> width
      type: 'date',
      valueGetter: params => params.value ? new Date(params.value) : null,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'so_luong', // key -> field
      headerName: 'Số lượng', // label -> headerName
      align: 'right',
      sortable: true,
      width: 80, // minWidth, maxWidth -> width
      headerAlign: 'center',
      type: 'number',
    },
    {
      field: 'don_gia', // key -> field
      headerName: 'Đơn giá', // label -> headerName
      renderCell: params => formatCurrency(params.value), // render -> renderCell
      align: 'right',
      headerAlign: 'right',
      sortable: true,
      width: 120, // minWidth -> width
      type: 'number',
    },
    {
      field: 'tong_tien', // key -> field
      headerName: 'Tổng tiền', // label -> headerName
      renderCell: params => formatCurrency(params.value), // render -> renderCell
      align: 'right',
      headerAlign: 'right',
      sortable: true,
      width: 150, // minWidth -> width, increased
      type: 'number',
    },
    {
      field: 'ghi_chu', // key -> field
      headerName: 'Ghi chú', // label -> headerName
      sortable: false,
      flex: 1, // Keeps flex
      headerAlign: 'left',
      align: 'left',
    },
  ];
};

export const baoDuongTableColumns = getBaoDuongTableColumns();
