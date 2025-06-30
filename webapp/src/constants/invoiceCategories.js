// Invoice category constants matching backend values
export const INVOICE_CATEGORIES = {
  TRANSPORTATION: 'TRANSPORTATION',
  LOGISTICS_SERVICE: 'LOGISTICS_SERVICE',
  PORT_FEES: 'PORT_FEES',
  OTHER: 'OTHER',
};

// Vietnamese labels for invoice categories
export const INVOICE_CATEGORY_LABELS = {
  [INVOICE_CATEGORIES.TRANSPORTATION]: 'Vận chuyển',
  [INVOICE_CATEGORIES.LOGISTICS_SERVICE]: 'Dịch vụ logistics',
  [INVOICE_CATEGORIES.PORT_FEES]: 'Phí cảng',
  [INVOICE_CATEGORIES.OTHER]: 'Khác',
};

// Helper function to get Vietnamese label for invoice category
export const getInvoiceCategoryLabel = categoryName => {
  return INVOICE_CATEGORY_LABELS[categoryName] || categoryName;
};

export default {
  INVOICE_CATEGORIES,
  INVOICE_CATEGORY_LABELS,
  getInvoiceCategoryLabel,
};
