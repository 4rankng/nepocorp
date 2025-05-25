// Main entry point for customer management feature

// Main component
export { default as QuanLyKhachHang } from '@features/khach-hang/QuanLyKhachHang';

// Reusable components
export {
  CustomerForm,
  CustomerList,
  CustomerManagement,
  KhachHangList,
} from '@features/khach-hang/components';

// Custom hooks
export { useCustomerManagement } from '@features/khach-hang/hooks';

// Default export for the main component
export { default } from '@features/khach-hang/QuanLyKhachHang';
