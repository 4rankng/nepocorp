// Re-export from types for backward compatibility
export * from '../types';
export * from '../utils';

// Legacy exports - kept for backward compatibility
export const TRANSACTION_TYPES = {
  INVOICE: 'INVOICE',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PARTNER_PAYMENT: 'PARTNER_PAYMENT',
  PARTNER_INVOICE: 'PARTNER_INVOICE',
  OPENING_BALANCE: 'OPENING_BALANCE',
  ADJUSTMENT: 'ADJUSTMENT'
};

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.INVOICE]: 'Phiếu thu khách hàng',
  [TRANSACTION_TYPES.PAYMENT_RECEIVED]: 'Nhận thanh toán',
  [TRANSACTION_TYPES.PARTNER_PAYMENT]: 'Thanh toán đối tác',
  [TRANSACTION_TYPES.PARTNER_INVOICE]: 'Phiếu thu đối tác',
  [TRANSACTION_TYPES.OPENING_BALANCE]: 'Số dư đầu kỳ',
  [TRANSACTION_TYPES.ADJUSTMENT]: 'Điều chỉnh'
};

// Status colors for transaction types
export const TRANSACTION_TYPE_COLORS = {
  [TRANSACTION_TYPES.INVOICE]: '#1976d2', // Blue
  [TRANSACTION_TYPES.PAYMENT_RECEIVED]: '#2e7d32', // Green
  [TRANSACTION_TYPES.PARTNER_PAYMENT]: '#ed6c02', // Orange
  [TRANSACTION_TYPES.PARTNER_INVOICE]: '#d32f2f', // Red
  [TRANSACTION_TYPES.OPENING_BALANCE]: '#9c27b0', // Purple
  [TRANSACTION_TYPES.ADJUSTMENT]: '#616161' // Gray
};

// Table columns for financial ledger
export const FINANCIAL_LEDGER_COLUMNS = [
  {
    id: 'transaction_date',
    label: 'Ngày giao dịch',
    sortable: true,
    width: '120px',
    render: (value) => {
      return value ? new Date(value).toLocaleDateString('vi-VN') : '-';
    }
  },
  {
    id: 'transaction_type',
    label: 'Loại giao dịch',
    sortable: true,
    width: '150px',
    render: (value) => {
      return TRANSACTION_TYPE_LABELS[value] || value;
    }
  },
  {
    id: 'reference_number',
    label: 'Số tham chiếu',
    sortable: true,
    width: '120px',
    render: (value) => value || '-'
  },
  {
    id: 'customer_name',
    label: 'Khách hàng',
    sortable: true,
    width: '150px',
    render: (value, row) => {
      return row.Customer?.name || '-';
    }
  },
  {
    id: 'partner_name',
    label: 'Đối tác',
    sortable: true,
    width: '150px',
    render: (value, row) => {
      return row.Partner?.name || '-';
    }
  },
  {
    id: 'debit',
    label: 'Nợ',
    sortable: true,
    width: '120px',
    align: 'right',
    render: (value) => {
      return value > 0 ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
      }).format(value) : '-';
    }
  },
  {
    id: 'credit',
    label: 'Có',
    sortable: true,
    width: '120px',
    align: 'right',
    render: (value) => {
      return value > 0 ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
      }).format(value) : '-';
    }
  },
  {
    id: 'notes',
    label: 'Ghi chú',
    sortable: true,
    width: '200px',
    render: (value) => value || '-'
  }
];

// Filter options
export const FILTER_OPTIONS = {
  TRANSACTION_TYPES: Object.keys(TRANSACTION_TYPE_LABELS).map(key => ({
    value: key,
    label: TRANSACTION_TYPE_LABELS[key]
  })),

  DATE_RANGES: [
    { value: 'today', label: 'Hôm nay' },
    { value: 'yesterday', label: 'Hôm qua' },
    { value: 'this_week', label: 'Tuần này' },
    { value: 'last_week', label: 'Tuần trước' },
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: 'this_quarter', label: 'Quý này' },
    { value: 'this_year', label: 'Năm này' },
    { value: 'custom', label: 'Tùy chỉnh' }
  ]
};

// Helper function to get date range
export const getDateRange = (range) => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  switch (range) {
    case 'today':
      return {
        startDate: startOfDay.toISOString().split('T')[0],
        endDate: endOfDay.toISOString().split('T')[0]
      };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        startDate: yesterday.toISOString().split('T')[0],
        endDate: yesterday.toISOString().split('T')[0]
      };
    }
    case 'this_week':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
    case 'last_week':
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return {
        startDate: startOfLastWeek.toISOString().split('T')[0],
        endDate: endOfLastWeek.toISOString().split('T')[0]
      };
    case 'this_month':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
    case 'last_month':
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: startOfLastMonth.toISOString().split('T')[0],
        endDate: endOfLastMonth.toISOString().split('T')[0]
      };
    case 'this_quarter':
      const quarter = Math.floor(today.getMonth() / 3);
      const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
      return {
        startDate: startOfQuarter.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
    case 'this_year':
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return {
        startDate: startOfYear.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      };
    default:
      return null;
  }
};
