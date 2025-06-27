// Payment status constants
export const PAYMENT_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING', 
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
};

// Payment status display labels (English)
export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.DRAFT]: 'DRAFT',
  [PAYMENT_STATUS.PENDING]: 'PENDING',
  [PAYMENT_STATUS.PAID]: 'PAID',
  [PAYMENT_STATUS.CANCELLED]: 'CANCELLED'
};

// Payment status colors for UI
export const PAYMENT_STATUS_COLORS = {
  [PAYMENT_STATUS.DRAFT]: 'gray',
  [PAYMENT_STATUS.PENDING]: 'orange',
  [PAYMENT_STATUS.PAID]: 'green',
  [PAYMENT_STATUS.CANCELLED]: 'red'
};

export default {
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS
};