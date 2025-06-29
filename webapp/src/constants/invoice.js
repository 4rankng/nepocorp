import { PAYMENT_STATUS, PAYMENT_STATUS_COLORS } from './payment';

// Invoice status constants (same as payment status)
export const INVOICE_STATUS = PAYMENT_STATUS;

// English labels for invoice status
export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.DRAFT]: 'DRAFT',
  [INVOICE_STATUS.PENDING]: 'PENDING',
  [INVOICE_STATUS.PAID]: 'PAID',
  [INVOICE_STATUS.CANCELLED]: 'CANCELLED'
};

// Colors for invoice status (same as payment)
export const INVOICE_STATUS_COLORS = PAYMENT_STATUS_COLORS;

export default {
  INVOICE_STATUS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS
};