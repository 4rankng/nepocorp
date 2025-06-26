import React from 'react';
import { formatCurrency } from '../utils/baoDuongUtils';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

// Helper function to map payment status to Vietnamese
const getPaymentStatusText = (status) => {
  const statusMap = {
    'DRAFT': 'Nháp',
    'PENDING': 'Chờ xử lý',
    'PAID': 'Đã thanh toán',
    'UNPAID': 'Chưa thanh toán',
    'CANCELLED': 'Đã hủy',
    'APPROVED': 'Đã duyệt',
    'REJECTED': 'Đã từ chối'
  };
  return statusMap[status] || status;
};

export const getBaoDuongTableColumns = () => {
  return [
    {
      key: 'stt',
      label: 'STT',
      render: (value, row, index) => index + 1,
      minWidth: 50,
      maxWidth: 60,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
    },
    {
      key: 'license_plate',
      label: 'Biển số',
      sortable: true,
      minWidth: 100,
    },
    {
      key: 'vendor_name',
      label: 'Nhà cung cấp',
      sortable: true,
      minWidth: 150,
    },
    {
      key: 'expense_created_at',
      label: 'Ngày tạo',
      render: value => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
      sortable: true,
      minWidth: 100,
    },
    {
      key: 'item_name',
      label: 'Hạng mục',
      sortable: true,
      minWidth: 150,
    },
    {
      key: 'install_date',
      label: 'Ngày lắp đặt',
      render: value => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
      sortable: true,
      minWidth: 120,
    },
    {
      key: 'expiry_date',
      label: 'Ngày hết hạn',
      render: value => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
      sortable: true,
      minWidth: 120,
    },
    {
      key: 'quantity',
      label: 'Số lượng',
      align: 'right',
      headerAlign: 'center',
      sortable: true,
      minWidth: 80,
      maxWidth: 100,
    },
    {
      key: 'total',
      label: 'Tổng tiền',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 120,
    },
  ];
};

export const baoDuongTableColumns = getBaoDuongTableColumns();