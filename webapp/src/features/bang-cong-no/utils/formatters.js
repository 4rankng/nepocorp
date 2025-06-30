// Currency and date formatting utilities for financial ledger
// Using website fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif for UI
// Using monospace fonts: 'SF Mono', Monaco, monospace for numbers

export const formatCurrency = (value, options = {}) => {
  const {
    currency = 'VND',
    locale = 'vi-VN',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    showSymbol = true,
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return showSymbol ? '0 ₫' : '0';
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: showSymbol ? currency : undefined,
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return formatter.format(value);
};

export const formatDate = (date, format = 'dd/MM/yyyy') => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'dd-MM-yyyy':
      return `${day}-${month}-${year}`;
    case 'MM/dd/yyyy':
      return `${month}/${day}/${year}`;
    default:
      return d.toLocaleDateString('vi-VN');
  }
};

export const formatDateTime = date => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTransactionType = type => {
  const typeLabels = {
    INVOICE: 'Phiếu thu',
    PAYMENT_RECEIVED: 'Thanh toán nhận',
    PARTNER_PAYMENT: 'Thanh toán đối tác',
    PARTNER_INVOICE: 'Phiếu thu đối tác',
    OPENING_BALANCE: 'Số dư đầu kỳ',
    ADJUSTMENT: 'Điều chỉnh',
  };

  return typeLabels[type] || type;
};

export const formatAmount = (debit, credit) => {
  if (debit > 0) {
    return {
      amount: formatCurrency(debit),
      type: 'debit',
      color: '#d32f2f',
    };
  }

  if (credit > 0) {
    return {
      amount: formatCurrency(credit),
      type: 'credit',
      color: '#2e7d32',
    };
  }

  return {
    amount: formatCurrency(0),
    type: 'zero',
    color: '#616161',
  };
};

export const formatBalance = balance => {
  const absBalance = Math.abs(balance);
  const color = balance > 0 ? '#d32f2f' : balance < 0 ? '#2e7d32' : '#616161';
  const label = balance > 0 ? 'Nợ' : balance < 0 ? 'Có' : 'Cân bằng';

  return {
    amount: formatCurrency(absBalance),
    label,
    color,
    isPositive: balance > 0,
    isNegative: balance < 0,
    isZero: balance === 0,
  };
};

export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';

  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start === end) return start;

  return `${start} → ${end}`;
};

export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) return '0';

  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
