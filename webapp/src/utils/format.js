// utils/format.js
// Hàm tiện ích định dạng số tiền
export function formatCurrency(amount) {
  return amount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) || '';
}

// Hàm tiện ích định dạng ngày tháng
export function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
}
