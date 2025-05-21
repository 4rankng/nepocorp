// utils/format.js
// Hàm tiện ích định dạng số tiền
export function formatCurrency(amount) {
  return amount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) || '';
}
