// Role constants
export const ROLES = {
  QUAN_LY: 'quan-ly',
  KE_TOAN: 'ke-toan',
  GIAO_NHAN: 'giao-nhan',
  LAI_XE: 'lai-xe',
};
// Role labels for display
export const ROLE_LABELS = {
  [ROLES.QUAN_LY]: 'Quản lý',
  [ROLES.KE_TOAN]: 'Kế toán',
  [ROLES.GIAO_NHAN]: 'Giao nhận',
  [ROLES.LAI_XE]: 'Lái xe',
};
// Role descriptions
export const ROLE_DESCRIPTIONS = {
  [ROLES.QUAN_LY]: 'Toàn quyền truy cập hệ thống',
  [ROLES.KE_TOAN]: 'Quản lý tài chính và kế toán',
  [ROLES.GIAO_NHAN]: 'Quản lý đơn hàng và giao nhận',
  [ROLES.LAI_XE]: 'Lái xe vận chuyển',
};
// Role-based menu items configuration
export const MENU_ITEMS = {
  [ROLES.QUAN_LY]: [
    { path: '/bao-cao', label: 'Báo cáo tài chính', icon: 'ChartBar' },
    { path: '/lich-van-chuyen', label: 'Lịch vận chuyển', icon: 'Calendar' },
    { path: '/nhan-vien', label: 'Nhân viên', icon: 'Users' },
    { path: '/khach-hang', label: 'Khách hàng', icon: 'User' },
    { path: '/doi-tac', label: 'Đối tác', icon: 'UserGroup' },
    { path: '/phuong-tien', label: 'Phương tiện', icon: 'Truck' },
  ],
  [ROLES.KE_TOAN]: [
    { path: '/lich-van-chuyen', label: 'Lịch vận chuyển', icon: 'Calendar' },
    { path: '/chi-phi', label: 'Chi phí', icon: 'CurrencyDollar' },
    { path: '/cong-no', label: 'Công nợ', icon: 'DocumentText' },
  ],
  [ROLES.GIAO_NHAN]: [
    { path: '/lich-van-chuyen', label: 'Lịch vận chuyển', icon: 'Calendar' },
    { path: '/don-hang', label: 'Đơn hàng', icon: 'DocumentText' },
  ],
  [ROLES.LAI_XE]: [
    { path: '/lich-lam-viec', label: 'Lịch làm việc', icon: 'Calendar' },
    { path: '/tai-lieu', label: 'Tài liệu', icon: 'DocumentText' },
  ],
};
// Role-based permissions
export const PERMISSIONS = {
  [ROLES.QUAN_LY]: [
    'view_dashboard',
    'manage_users',
    'manage_vehicles',
    'view_reports',
    'manage_finance',
    'manage_orders',
  ],
  [ROLES.KE_TOAN]: ['view_dashboard', 'view_reports', 'manage_finance', 'view_orders'],
  [ROLES.GIAO_NHAN]: ['view_orders', 'update_order_status', 'view_schedule'],
  [ROLES.LAI_XE]: ['view_schedule', 'update_delivery_status', 'view_documents'],
};
// Helper functions
export const getRoleLabel = role => ROLE_LABELS[role] || role;
export const getRoleDescription = role => ROLE_DESCRIPTIONS[role] || '';
export const getMenuItems = role => MENU_ITEMS[role] || [];
export const hasPermission = (role, permission) => PERMISSIONS[role]?.includes(permission) || false;
export default {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  MENU_ITEMS,
  PERMISSIONS,
  getRoleLabel,
  getRoleDescription,
  getMenuItems,
  hasPermission,
};
