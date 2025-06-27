import React from 'react';
import { formatCurrency } from '../utils/baoDuongUtils';
import { InvoiceButton } from '@/components/ActionButtons';

// Robust date formatting function
const formatDate = (value, row, index) => {
  // Add debugging for first few rows
  if (index < 3) {
    console.log(`Row ${index} date formatting:`, { value, type: typeof value, row_id: row?.id });
  }
  
  if (!value) return '-';
  
  try {
    // Handle different date formats
    let date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      // Handle ISO string or other string formats
      date = new Date(value);
    } else {
      return '-';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', value);
      return '-';
    }
    
    const formatted = date.toLocaleDateString('vi-VN');
    if (index < 3) {
      console.log(`Row ${index} formatted date:`, formatted);
    }
    
    return formatted;
  } catch (error) {
    console.error('Error formatting date:', value, error);
    return '-';
  }
};


export const getBaoDuongTableColumns = (onInvoiceClick) => {
  return [
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
      key: 'item_name',
      label: 'Hạng mục',
      sortable: true,
      minWidth: 150,
    },
    {
      key: 'install_date',
      label: 'Ngày lắp đặt',
      render: formatDate,
      sortable: true,
      minWidth: 120,
    },
    {
      key: 'expiry_date',
      label: 'Ngày hết hạn',
      render: formatDate,
      sortable: true,
      minWidth: 120,
    },
    {
      key: 'price',
      label: 'Đơn giá',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 100,
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
      key: 'tax_rate',
      label: 'Thuế (%)',
      render: (value) => value ? `${value}%` : '0%',
      align: 'right',
      sortable: true,
      minWidth: 80,
    },
    {
      key: 'total',
      label: 'Tổng tiền',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 120,
    },
    {
      key: 'actions',
      label: 'Hóa đơn',
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      minWidth: 80,
      maxWidth: 80,
      render: (value, row) => (
        <InvoiceButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onInvoiceClick(row);
          }}
          disabled={!row.expense_id}
          tooltip={row.expense_id ? 'Xem hóa đơn' : 'Không có hóa đơn'}
        />
      ),
    },
  ];
};

export const baoDuongTableColumns = getBaoDuongTableColumns;