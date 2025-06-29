// Transaction type definitions and constants

export const TRANSACTION_TYPES = {
  INVOICE: 'INVOICE',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PARTNER_PAYMENT: 'PARTNER_PAYMENT',
  PARTNER_INVOICE: 'PARTNER_INVOICE',
  OPENING_BALANCE: 'OPENING_BALANCE',
  ADJUSTMENT: 'ADJUSTMENT'
};

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.INVOICE]: 'Phiếu thu',
  [TRANSACTION_TYPES.PAYMENT_RECEIVED]: 'Thanh toán nhận',
  [TRANSACTION_TYPES.PARTNER_PAYMENT]: 'Thanh toán đối tác',
  [TRANSACTION_TYPES.PARTNER_INVOICE]: 'Phiếu thu đối tác',
  [TRANSACTION_TYPES.OPENING_BALANCE]: 'Số dư đầu kỳ',
  [TRANSACTION_TYPES.ADJUSTMENT]: 'Điều chỉnh'
};

export const TRANSACTION_TYPE_COLORS = {
  [TRANSACTION_TYPES.INVOICE]: '#1976d2',
  [TRANSACTION_TYPES.PAYMENT_RECEIVED]: '#2e7d32',
  [TRANSACTION_TYPES.PARTNER_PAYMENT]: '#d32f2f',
  [TRANSACTION_TYPES.PARTNER_INVOICE]: '#ed6c02',
  [TRANSACTION_TYPES.OPENING_BALANCE]: '#9c27b0',
  [TRANSACTION_TYPES.ADJUSTMENT]: '#616161'
};

export const TRANSACTION_TYPE_OPTIONS = [
  {
    value: TRANSACTION_TYPES.INVOICE,
    label: TRANSACTION_TYPE_LABELS[TRANSACTION_TYPES.INVOICE],
    color: TRANSACTION_TYPE_COLORS[TRANSACTION_TYPES.INVOICE],
    isDebit: true
  },
  {
    value: TRANSACTION_TYPES.PAYMENT_RECEIVED,
    label: TRANSACTION_TYPE_LABELS[TRANSACTION_TYPES.PAYMENT_RECEIVED],
    color: TRANSACTION_TYPE_COLORS[TRANSACTION_TYPES.PAYMENT_RECEIVED],
    isDebit: false
  },
  {
    value: TRANSACTION_TYPES.PARTNER_PAYMENT,
    label: TRANSACTION_TYPE_LABELS[TRANSACTION_TYPES.PARTNER_PAYMENT],
    color: TRANSACTION_TYPE_COLORS[TRANSACTION_TYPES.PARTNER_PAYMENT],
    isDebit: true
  },
  {
    value: TRANSACTION_TYPES.PARTNER_INVOICE,
    label: TRANSACTION_TYPE_LABELS[TRANSACTION_TYPES.PARTNER_INVOICE],
    color: TRANSACTION_TYPE_COLORS[TRANSACTION_TYPES.PARTNER_INVOICE],
    isDebit: false
  },
  {
    value: TRANSACTION_TYPES.OPENING_BALANCE,
    label: TRANSACTION_TYPE_LABELS[TRANSACTION_TYPES.OPENING_BALANCE],
    color: TRANSACTION_TYPE_COLORS[TRANSACTION_TYPES.OPENING_BALANCE],
    isDebit: null
  },
  {
    value: TRANSACTION_TYPES.ADJUSTMENT,
    label: TRANSACTION_TYPE_LABELS[TRANSACTION_TYPES.ADJUSTMENT],
    color: TRANSACTION_TYPE_COLORS[TRANSACTION_TYPES.ADJUSTMENT],
    isDebit: null
  }
];

export const AMOUNT_TYPES = {
  DEBIT: 'debit',
  CREDIT: 'credit',
  ZERO: 'zero'
};

export const BALANCE_STATES = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  ZERO: 'zero'
};

// Default transaction structure
export const createEmptyTransaction = () => ({
  id: null,
  transaction_date: new Date().toISOString().split('T')[0],
  customer_id: null,
  partner_id: null,
  job_id: null,
  transaction_type: '',
  debit: 0,
  credit: 0,
  reference_number: '',
  notes: '',
  customer: null,
  partner: null,
  job: null
});

// Transaction form modes
export const FORM_MODES = {
  CREATE: 'create',
  EDIT: 'edit',
  VIEW: 'view'
};

// Column definitions for table display
export const TRANSACTION_COLUMNS = [
  {
    id: 'transaction_date',
    label: 'Ngày',
    sortable: true,
    width: '120px',
    align: 'center'
  },
  {
    id: 'transaction_type',
    label: 'Loại giao dịch',
    sortable: true,
    width: '150px'
  },
  {
    id: 'customer_partner',
    label: 'Khách hàng/Đối tác',
    sortable: false,
    width: '200px'
  },
  {
    id: 'reference_number',
    label: 'Số tham chiếu',
    sortable: true,
    width: '150px'
  },
  {
    id: 'debit',
    label: 'Nợ',
    sortable: true,
    width: '120px',
    align: 'right'
  },
  {
    id: 'credit',
    label: 'Có',
    sortable: true,
    width: '120px',
    align: 'right'
  },
  {
    id: 'running_balance',
    label: 'Số dư',
    sortable: false,
    width: '120px',
    align: 'right'
  },
  {
    id: 'notes',
    label: 'Ghi chú',
    sortable: false,
    width: '200px'
  }
];

// Status for transaction processing
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};
