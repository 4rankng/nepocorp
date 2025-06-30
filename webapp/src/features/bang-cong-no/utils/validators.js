// Form validation utilities for financial ledger

export const validateTransaction = transactionData => {
  const errors = {};

  // Required fields validation
  if (!transactionData.transaction_date) {
    errors.transaction_date = 'Ngày giao dịch là bắt buộc';
  }

  if (!transactionData.transaction_type) {
    errors.transaction_type = 'Loại giao dịch là bắt buộc';
  }

  // Customer or Partner validation
  if (!transactionData.customer_id && !transactionData.partner_id) {
    errors.entity = 'Phải chọn khách hàng hoặc đối tác';
  }

  if (transactionData.customer_id && transactionData.partner_id) {
    errors.entity = 'Chỉ được chọn khách hàng hoặc đối tác, không được chọn cả hai';
  }

  // Amount validation
  const debit = parseFloat(transactionData.debit) || 0;
  const credit = parseFloat(transactionData.credit) || 0;

  if (debit === 0 && credit === 0) {
    errors.amount = 'Phải nhập số tiền nợ hoặc có';
  }

  if (debit > 0 && credit > 0) {
    errors.amount = 'Chỉ được nhập số tiền nợ hoặc có, không được nhập cả hai';
  }

  if (debit < 0 || credit < 0) {
    errors.amount = 'Số tiền không được âm';
  }

  // Reference number validation for certain transaction types
  const requiresReference = ['INVOICE', 'PARTNER_INVOICE'];
  if (
    requiresReference.includes(transactionData.transaction_type) &&
    !transactionData.reference_number
  ) {
    errors.reference_number = 'Số tham chiếu là bắt buộc cho loại giao dịch này';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateAmount = amount => {
  if (!amount || amount === '') {
    return { isValid: false, error: 'Số tiền là bắt buộc' };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Số tiền không hợp lệ' };
  }

  if (numAmount <= 0) {
    return { isValid: false, error: 'Số tiền phải lớn hơn 0' };
  }

  if (numAmount > 999999999999.99) {
    return { isValid: false, error: 'Số tiền quá lớn' };
  }

  return { isValid: true };
};

export const validateDate = date => {
  if (!date) {
    return { isValid: false, error: 'Ngày là bắt buộc' };
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Ngày không hợp lệ' };
  }

  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 5);
  const oneYearAhead = new Date();
  oneYearAhead.setFullYear(today.getFullYear() + 1);

  if (dateObj < oneYearAgo) {
    return { isValid: false, error: 'Ngày không được quá xa trong quá khứ' };
  }

  if (dateObj > oneYearAhead) {
    return { isValid: false, error: 'Ngày không được quá xa trong tương lai' };
  }

  return { isValid: true };
};

export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Cả ngày bắt đầu và kết thúc đều bắt buộc' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Ngày không hợp lệ' };
  }

  if (start > end) {
    return { isValid: false, error: 'Ngày bắt đầu phải trước ngày kết thúc' };
  }

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 366) {
    return { isValid: false, error: 'Khoảng thời gian không được vượt quá 1 năm' };
  }

  return { isValid: true };
};

export const validateReferenceNumber = refNumber => {
  if (!refNumber || refNumber.trim() === '') {
    return { isValid: false, error: 'Số tham chiếu là bắt buộc' };
  }

  if (refNumber.length > 100) {
    return { isValid: false, error: 'Số tham chiếu không được vượt quá 100 ký tự' };
  }

  const validPattern = /^[A-Za-z0-9\-_.]+$/;
  if (!validPattern.test(refNumber)) {
    return {
      isValid: false,
      error: 'Số tham chiếu chỉ được chứa chữ cái, số, dấu gạch ngang, gạch dưới và dấu chấm',
    };
  }

  return { isValid: true };
};

export const validateNotes = notes => {
  if (notes && notes.length > 1000) {
    return { isValid: false, error: 'Ghi chú không được vượt quá 1000 ký tự' };
  }

  return { isValid: true };
};

export const sanitizeAmount = amount => {
  if (!amount) return 0;

  // Remove all non-numeric characters except decimal point
  const cleaned = amount.toString().replace(/[^\d.]/g, '');

  // Handle multiple decimal points
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parseFloat(parts[0] + '.' + parts.slice(1).join(''));
  }

  return parseFloat(cleaned) || 0;
};

export const formatFormAmount = amount => {
  if (!amount || amount === 0) return '';
  return amount.toString();
};
