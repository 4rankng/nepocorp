export const formatInvoiceDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
  } catch (error) {
    return '-';
  }
};

export const calculateInvoiceItemTotal = (item) => {
  const price = parseFloat(item.price) || 0;
  const quantity = parseFloat(item.quantity) || 0;
  const taxRate = parseFloat(item.tax_rate) || 0;
  const subtotal = price * quantity;
  const taxAmount = subtotal * (taxRate / 100);
  return subtotal + taxAmount;
};

export const calculateInvoiceTotal = (items) => {
  return items.reduce((sum, item) => sum + calculateInvoiceItemTotal(item), 0);
};

export const prepareInvoiceItemsForUpdate = (items) => {
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
      subtotal,
      total
    };
  });
};

// Invoice status colors - same as payment status
export const getInvoiceStatusColor = (status) => {
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

// Format customer display name
export const formatCustomerDisplay = (customer) => {
  if (!customer) return '-';
  if (customer.tax_code) {
    return `${customer.name} (${customer.tax_code})`;
  }
  return customer.name;
};

// Format invoice category with Vietnamese label
export const formatInvoiceCategoryDisplay = (categoryName) => {
  const labels = {
    'TRANSPORTATION': 'Vận chuyển',
    'LOGISTICS_SERVICE': 'Dịch vụ logistics',
    'PORT_FEES': 'Phí cảng',
    'OTHER': 'Khác'
  };
  return labels[categoryName] || categoryName;
};

// Format expense category with Vietnamese label
export const formatExpenseCategoryDisplay = (categoryName) => {
  const labels = {
    'FUEL': 'Nhiên liệu',
    'ROAD_FEES': 'Phí đường bộ',
    'REPAIRS': 'Sửa chữa',
    'TIRES': 'Lốp xe',
    'DRIVER_SALARY': 'Lương tài xế',
    'PARKING': 'Phí đỗ xe',
    'MAINTENANCE': 'Bảo dưỡng',
    'INSURANCE': 'Bảo hiểm',
    'REGISTRATION': 'Đăng kiểm',
    'OTHER': 'Khác'
  };
  return labels[categoryName] || categoryName;
};