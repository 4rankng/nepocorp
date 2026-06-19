import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Compass, Layers, Truck, AlertTriangle, Wallet, DollarSign,
  Receipt, FileText, Store, Route, Settings, Users, ScrollText, Package,
  Fuel, MapPin, UserCheck, Building, Tags, Calendar,
} from 'lucide-react';

export type SearchItemType = 'page' | 'config' | 'action';

export interface SearchItem {
  id: string;
  type: SearchItemType;
  label: string;
  description?: string;
  path: string;
  icon: LucideIcon;
  action?: string;
}

function normalise(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function filterItems(items: SearchItem[], query: string): SearchItem[] {
  const q = normalise(query.trim());
  if (!q) return [];
  return items.filter(
    item =>
      normalise(item.label).includes(q) ||
      (item.description ? normalise(item.description).includes(q) : false),
  );
}

const ADMIN_BASE_ITEMS: SearchItem[] = [
  { id: 'dashboard', type: 'page', label: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard },
  { id: 'dispatch', type: 'page', label: 'Phân xe', path: '/dispatch', icon: Compass },
  { id: 'fleet', type: 'page', label: 'Đội xe', path: '/fleet', icon: Layers },
  { id: 'trips', type: 'page', label: 'Sổ chuyến đi', path: '/trips', icon: Truck },
  { id: 'penalties', type: 'page', label: 'Kỷ luật', path: '/penalties', icon: AlertTriangle },
  { id: 'finance', type: 'page', label: 'Báo cáo lãi lỗ', path: '/finance', icon: Wallet },
  { id: 'profit', type: 'page', label: 'Phân chia lợi nhuận', path: '/profit', icon: DollarSign },
  { id: 'debt', type: 'page', label: 'Công nợ phải thu', path: '/debt', icon: Receipt },
  { id: 'payables', type: 'page', label: 'Công nợ phải trả', path: '/payables', icon: Receipt },
  { id: 'expenses', type: 'page', label: 'Chi phí phát sinh', path: '/expenses', icon: FileText },
  { id: 'advances', type: 'page', label: 'Tạm ứng', path: '/advances', icon: Wallet },

  { id: 'customers', type: 'page', label: 'Khách hàng', path: '/customers', icon: Users },
  { id: 'suppliers', type: 'page', label: 'Nhà cung cấp', path: '/suppliers', icon: Store },
  { id: 'config', type: 'page', label: 'Cấu hình', path: '/config', icon: Settings },
];

export const CONFIG_ITEMS: SearchItem[] = [
  { id: 'fuel', type: 'config', label: 'Định mức nhiên liệu', description: 'Định mức tiêu hao theo xe, loại tải (vỏ rỗng, <20t, >20t) và loại tuyến (đồng bằng / núi).', path: '/config/fuel', icon: Fuel, action: 'Sửa' },
  { id: 'road-allowances', type: 'config', label: 'Tiền đi đường', description: 'Tiền chuẩn theo tuyến × loại rơ-mooc. Quy tắc: − vé QL5, + chuyến về có hàng, − phí/trạm.', path: '/config/road-allowances', icon: Route, action: 'Sửa' },
  { id: 'trip-expense', type: 'config', label: 'Chi phí chuyến đi', description: 'Tiền kết hợp, trả hàng 2 điểm, lưu ca xe, tiền trạm BOT, thưởng chuyến về có hàng.', path: '/config/trip-expense', icon: Settings, action: 'Sửa' },
  { id: 'penalty-reasons', type: 'config', label: 'Quy tắc kỷ luật & phạt', description: 'Thiếu hoá đơn dầu (100K), vi phạm ATGT (500K / sa thải).', path: '/config/penalty-reasons', icon: AlertTriangle, action: 'Sửa' },
  { id: 'drivers', type: 'config', label: 'Người dùng & lái xe', description: 'Quản lý tài khoản lái xe, lương cơ bản, xe phụ trách và thông tin hồ sơ liên hệ.', path: '/users', icon: UserCheck, action: 'Sửa' },
  { id: 'cap-table', type: 'config', label: 'Thông tin công ty & Cổ phần', description: 'Mã số thuế, địa chỉ, người đại diện và tỷ lệ vốn góp giữa các đối tác cổ đông.', path: '/config/cap-table', icon: Building, action: 'Xem' },
  { id: 'customers', type: 'config', label: 'Khách hàng & Đối tác', description: 'Danh mục đối tác vận chuyển hàng hóa, thông tin liên hệ và mã số thuế phục vụ công nợ.', path: '/config/customers', icon: Users, action: 'Sửa' },
  { id: 'routes', type: 'config', label: 'Tuyến đường & Cự ly', description: 'Danh sách các tuyến chặng, số trạm thu phí BOT, quãng đường di chuyển chuẩn.', path: '/config/routes', icon: MapPin, action: 'Sửa' },
  { id: 'trucks', type: 'config', label: 'Xe đầu kéo', description: 'Biển số các đầu kéo kéo container đang vận hành, định mức mặc định và lịch bảo dưỡng đầu xe.', path: '/config/trucks', icon: Truck, action: 'Sửa' },
  { id: 'tire-positions', type: 'config', label: 'Vị trí lốp', description: 'Danh mục vị trí lốp dùng khi thêm hoặc cập nhật lốp trên xe.', path: '/config/tire-positions', icon: Tags, action: 'Sửa' },
  { id: 'trailers', type: 'config', label: 'Rơ-moóc', description: 'Danh sách rơ-moóc, loại rơ-moóc và thông tin đăng kiểm.', path: '/config/trailers', icon: Truck, action: 'Sửa' },
  { id: 'cargo-types', type: 'config', label: 'Loại hàng hóa', description: 'Bảng quy chuẩn loại hàng hóa vận chuyển ảnh hưởng đến việc phân xe chặng.', path: '/config/cargo-types', icon: Package, action: 'Sửa' },
  { id: 'pricing-tables', type: 'config', label: 'Bảng giá cước', description: 'Bảng giá cước chi tiết thỏa thuận với từng đối tác khách hàng trên mỗi tuyến.', path: '/config/pricing-tables', icon: DollarSign, action: 'Sửa' },
  { id: 'salary-periods', type: 'config', label: 'Kỳ lương', description: 'Cấu hình kỳ lương hàng tháng. Mặc định: ngày 26 tháng trước đến ngày 25 tháng này.', path: '/config/salary-periods', icon: Calendar, action: 'Sửa' },
  { id: 'expense-categories', type: 'config', label: 'Hạng mục chi phí', description: 'Phân loại chi phí vận hành. Bật định kỳ để theo dõi ngày gia hạn bảo hiểm, đăng kiểm, bảo dưỡng.', path: '/config/expense-categories', icon: Tags, action: 'Sửa' },
  { id: 'forwarder-expense-types', type: 'config', label: 'Loại chi phí giao nhận', description: 'Danh mục các khoản chi phí phát sinh do nhân viên giao nhận nhập (nâng hạ, hải quan, cân xe, kiểm tra…).', path: '/config/forwarder-expense-types', icon: Tags, action: 'Sửa' },
];

const ACTION_ITEMS: SearchItem[] = [
  { id: 'action-new-trip', type: 'action', label: 'Tạo chuyến mới', path: '/trips/new', icon: Truck },
  { id: 'action-audit-logs', type: 'action', label: 'Xem nhật ký hoạt động', path: '/audit-logs', icon: ScrollText },
  { id: 'action-dispatch', type: 'action', label: 'Điều vận & Phân xe', path: '/dispatch', icon: Compass },
  { id: 'action-config', type: 'action', label: 'Cấu hình hệ thống', path: '/config', icon: Settings },
];

const DRIVER_ITEMS: SearchItem[] = [
  { id: 'my-trips', type: 'page', label: 'Hành trình', path: '/my-trips', icon: Route },
  { id: 'my-earnings', type: 'page', label: 'Thu nhập', path: '/my-earnings', icon: DollarSign },
  { id: 'my-penalties', type: 'page', label: 'Kỷ luật', path: '/my-penalties', icon: AlertTriangle },
];

const FORWARDER_ITEMS: SearchItem[] = [
  { id: 'my-forwarder-trips', type: 'page', label: 'Chuyến đi', path: '/my-forwarder-trips', icon: Package },
  { id: 'my-advances', type: 'page', label: 'Tạm ứng', path: '/my-advances', icon: Wallet },
  { id: 'my-settlements', type: 'page', label: 'Phiếu thanh toán', path: '/my-settlements', icon: FileText },
];

export function getSearchItems(role: string): SearchItem[] {
  const normRole = String(role || '').toUpperCase();
  switch (normRole) {
    case 'ADMIN':
    case 'MANAGER':
      return [
        ...ADMIN_BASE_ITEMS,
        { id: 'users', type: 'page', label: 'Người dùng', path: '/users', icon: Users },
        { id: 'audit-logs', type: 'page', label: 'Nhật ký người dùng', path: '/audit-logs', icon: ScrollText },
        ...CONFIG_ITEMS,
        ...ACTION_ITEMS,
      ];
    case 'ACCOUNTANT':
      return [...ADMIN_BASE_ITEMS, ...CONFIG_ITEMS];
    case 'DRIVER':
      return DRIVER_ITEMS;
    case 'FORWARDER':
      return FORWARDER_ITEMS;
    default:
      return [];
  }
}
