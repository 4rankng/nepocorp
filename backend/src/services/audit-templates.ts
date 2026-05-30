import { ROLE_LABELS } from '@nepocorp/shared';
import type { Role } from '@nepocorp/shared';
import { AuditEvent } from './audit-types';
import type { AuditPayload } from './audit-types';

const ENTITY_LABELS: Record<string, string> = {
  customers: 'khách hàng',
  trucks: 'xe đầu kéo',
  trailers: 'rơ-moóc',
  routes: 'tuyến đường',
  'cargo-types': 'loại hàng hóa',
  'pricing-tables': 'bảng giá',
  'road-allowances': 'tiền đi đường',
  'fuel-config': 'cấu hình nhiên liệu',
  'penalty-reasons': 'lý do kỷ luật',
  drivers: 'lái xe',
  'management-fees': 'phí quản lý',
  'cap-table': 'cổ đông',
  trips: 'lệnh vận chuyển',
  payments: 'thanh toán',
  penalties: 'kỷ luật',
  adjustments: 'điều chỉnh',
  // /api/reports/distribute-profit, /api/reports/pnl → "reports"
  reports: 'báo cáo',
  auth: 'tài khoản',
  users: 'tài khoản',
};

interface TemplateContext {
  role: string;
  email: string;
  entityLabel: string;
  entityId: string;
}

function ctx(payload: AuditPayload): TemplateContext {
  const role = payload.actorRole
    ? ROLE_LABELS[payload.actorRole as Role] || payload.actorRole
    : 'Hệ thống';
  return {
    role,
    email: payload.actorEmail || '',
    entityLabel: ENTITY_LABELS[payload.entityType] || payload.entityType,
    entityId: payload.entityId ? ` #${payload.entityId}` : '',
  };
}

const templates: Record<string, (c: TemplateContext) => string> = {
  [AuditEvent.TRIP_CREATED]: (c) => `${c.role} ${c.email} tạo lệnh vận chuyển mới`,
  [AuditEvent.TRIP_DISPATCHED]: (c) => `${c.role} ${c.email} xuất phát chuyến xe${c.entityId}`,
  [AuditEvent.TRIP_UPDATED_PRE_DEPARTURE]: (c) => `${c.role} ${c.email} cập nhật số liệu trước xuất phát chuyến${c.entityId}`,
  [AuditEvent.TRIP_UPDATED_ACTUALS]: (c) => `${c.role} ${c.email} cập nhật số liệu thực tế chuyến${c.entityId}`,
  [AuditEvent.TRIP_COMPLETED]: (c) => `${c.role} ${c.email} hoàn thành chuyến xe${c.entityId}`,
  [AuditEvent.TRIP_LOCKED]: (c) => `${c.role} ${c.email} khóa chuyến xe${c.entityId}`,
  [AuditEvent.TRIP_CANCELED]: (c) => `${c.role} ${c.email} hủy chuyến xe${c.entityId}`,

  [AuditEvent.PAYMENT_RECEIVED]: (c) => `${c.role} ${c.email} ghi nhận thanh toán`,
  [AuditEvent.ADJUSTMENT_CREATED]: (c) => `${c.role} ${c.email} tạo hóa đơn điều chỉnh`,
  [AuditEvent.PENALTY_CREATED]: (c) => `${c.role} ${c.email} ghi nhận kỷ luật`,
  [AuditEvent.DRIVER_SALARY_RECORDED]: (c) => `${c.role} ${c.email} ghi nhận lương tài xế`,

  [AuditEvent.ENTITY_CREATED]: (c) => `${c.role} ${c.email} tạo ${c.entityLabel} mới`,
  [AuditEvent.ENTITY_UPDATED]: (c) => `${c.role} ${c.email} cập nhật ${c.entityLabel}${c.entityId}`,
  [AuditEvent.ENTITY_DELETED]: (c) => `${c.role} ${c.email} xóa ${c.entityLabel}${c.entityId}`,

  [AuditEvent.USER_LOGIN]: (c) => `${c.role} ${c.email} đăng nhập hệ thống`,
  [AuditEvent.USER_LOGOUT]: (c) => `${c.role} ${c.email} đăng xuất hệ thống`,
};

export function renderAuditMessage(payload: AuditPayload): string {
  const template = templates[payload.event];
  if (template) return template(ctx(payload));
  const c = ctx(payload);
  return `${c.role} ${c.email} thực hiện ${payload.event} trên ${c.entityLabel}${c.entityId}`;
}
