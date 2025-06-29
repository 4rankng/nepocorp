export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

export const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'PAID':
      return '#10b981';
    case 'PENDING':
      return '#f59e0b';
    case 'DRAFT':
      return '#6b7280';
    case 'CANCELLED':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

export const calculateItemTotal = (item) => {
  const price = parseFloat(item.price) || 0;
  const quantity = parseFloat(item.quantity) || 0;
  const taxRate = parseFloat(item.tax_rate) || 0;
  const subtotal = price * quantity;
  const taxAmount = subtotal * (taxRate / 100);
  return subtotal + taxAmount;
};

export const calculateExpenseTotal = (items) => {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
};

export const prepareExpenseItemsForUpdate = (items) => {
  return items.map(item => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;
    const subtotal = price * quantity;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return {
      ...item,
      price,
      quantity,
      tax_rate: taxRate,
      total
    };
  });
};