import { PAYMENT_STATUS, PAYMENT_STATUS_COLORS } from './payment';

// Invoice status constants (same as payment status)
export const INVOICE_STATUS = PAYMENT_STATUS;

// Vietnamese labels for invoice status
export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.DRAFT]: 'Nháp',
  [INVOICE_STATUS.PENDING]: 'Chờ thanh toán',
  [INVOICE_STATUS.PAID]: 'Đã thanh toán',
  [INVOICE_STATUS.CANCELLED]: 'Đã hủy'
};

// Colors for invoice status (same as payment)
export const INVOICE_STATUS_COLORS = PAYMENT_STATUS_COLORS;

export default {
  INVOICE_STATUS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS
};