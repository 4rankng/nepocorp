import React from 'react';
import { formatCurrency, addMonths } from '../utils/baoDuongUtils';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

// Helper function to get license plate from tractor_id or trailer_id
const getLicensePlate = (row, tractors, trailers) => {
  if (row.tractor_id) {
    const tractor = tractors.find(t => parseInt(t.id) === parseInt(row.tractor_id));
    return tractor?.license_plate || `Tractor ID: ${row.tractor_id}`;
  } else if (row.trailer_id) {
    const trailer = trailers.find(t => parseInt(t.id) === parseInt(row.trailer_id));
    return trailer?.license_plate || `Trailer ID: ${row.trailer_id}`;
  }
  return 'Không có thông tin xe';
};

export const getBaoDuongTableColumns = (tractors = [], trailers = []) => {
  return [
    {
      key: 'license_plate',
      label: 'Biển số',
      render: (value, row) => getLicensePlate(row, tractors, trailers),
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'vendor_name',
      label: 'Nhà cung cấp',
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'created_at',
      label: 'Ngày tạo',
      render: value => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'payment_status',
      label: 'Trạng thái',
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'subtotal',
      label: 'Tạm tính',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'total',
      label: 'Tổng tiền',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 50,
    },
    {
      key: 'remark',
      label: 'Ghi chú',
      sortable: false,
      flex: 1,
    },
  ];
};

export const baoDuongTableColumns = getBaoDuongTableColumns();
