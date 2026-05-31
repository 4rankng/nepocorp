import { ROLE_LABELS } from '@nepocorp/shared';
import type { Role } from '@nepocorp/shared';
import { AuditEvent } from './audit-types';
import type { AuditPayload } from './audit-types';

const ENTITY_LABELS: Record<string, string> = {
  customers: 'khách hàng',
  trucks: 'xe đầu kéo',
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
  /** Display name of the actor — human name, never email. */
  actor: string;
  entityLabel: string;
  /**
   * Human-readable identifier of the target entity. Prefers natural keys
   * (trip code, license plate, customer name) over numeric ids. Empty string
   * if nothing is known so the rendered sentence reads naturally.
   */
  entityKey: string;
  ipAddress: string;
}

function ctx(payload: AuditPayload): TemplateContext {
  const roleLabel = payload.actorRole
    ? ROLE_LABELS[payload.actorRole as Role] || payload.actorRole
    : 'Hệ thống';
  // Resolve actor display name in priority order:
  //   1) actorName (from JWT.fullName — what users want to see)
  //   2) anything before the @ in the email (legacy fallback so old log rows
  //      with only email still render readably)
  //   3) "Người dùng"
  let actor = (payload.actorName || '').trim();
  if (!actor && payload.actorEmail) actor = payload.actorEmail.split('@')[0];
  if (!actor) actor = 'Người dùng';

  // Avoid awkward duplication when the actor's display name overlaps with
  // the role label (e.g. a user named "Quản trị viên" combined with role
  // label "Quản trị" would read "Quản trị Quản trị viên ..."). Collapse to
  // the actor name alone in any of these cases.
  const actorL = actor.toLowerCase();
  const roleL = roleLabel.toLowerCase();
  // Use word-boundary matching to avoid false positives on Vietnamese names.
  // E.g. role "tài" must not match actor "tài xế lê văn tài" unless the actor
  // IS the role label. Only exact match or prefix-with-space counts.
  const overlaps = actorL === roleL
    || actorL.startsWith(roleL + ' ')
    || actorL.endsWith(' ' + roleL)
    || actorL.includes(' ' + roleL + ' ');
  const role = overlaps ? '' : roleLabel;

  // Prefer the natural key over "#id". Only fall back to the numeric id when
  // the call site couldn't supply a natural key (defensive — every emit
  // should try to pass entityKey).
  const entityKey = (payload.entityKey || '').trim()
    || (payload.entityId ? String(payload.entityId) : '');

  const ipAddress = (payload as any).ipAddress || '';

  return {
    role,
    actor,
    entityLabel: ENTITY_LABELS[payload.entityType] || payload.entityType,
    entityKey,
    ipAddress,
  };
}

/** Compose "<role> <actor>" with single space, collapsed when role is empty. */
function subj(c: TemplateContext): string {
  return c.role ? `${c.role} ${c.actor}` : c.actor;
}

/** Returns " <key>" with a leading space when key is non-empty, else "". */
function withKey(key: string): string {
  return key ? ` ${key}` : '';
}

const templates: Record<string, (c: TemplateContext) => string> = {
  [AuditEvent.TRIP_CREATED]: (c) => `${subj(c)} tạo lệnh vận chuyển${withKey(c.entityKey)}`,
  [AuditEvent.TRIP_DISPATCHED]: (c) => `${subj(c)} xuất phát chuyến${withKey(c.entityKey)}`,
  [AuditEvent.TRIP_UPDATED_PRE_DEPARTURE]: (c) => `${subj(c)} cập nhật số liệu trước xuất phát chuyến${withKey(c.entityKey)}`,
  [AuditEvent.TRIP_UPDATED_ACTUALS]: (c) => `${subj(c)} cập nhật số liệu thực tế chuyến${withKey(c.entityKey)}`,
  [AuditEvent.TRIP_COMPLETED]: (c) => `${subj(c)} hoàn thành chuyến${withKey(c.entityKey)}`,
  [AuditEvent.TRIP_LOCKED]: (c) => `${subj(c)} khóa chuyến${withKey(c.entityKey)}`,
  [AuditEvent.TRIP_CANCELED]: (c) => `${subj(c)} hủy chuyến${withKey(c.entityKey)}`,

  [AuditEvent.PAYMENT_RECEIVED]: (c) => `${subj(c)} ghi nhận thanh toán${withKey(c.entityKey)}`,
  [AuditEvent.ADJUSTMENT_CREATED]: (c) => `${subj(c)} tạo hóa đơn điều chỉnh${withKey(c.entityKey)}`,
  [AuditEvent.PENALTY_CREATED]: (c) => `${subj(c)} ghi nhận kỷ luật${withKey(c.entityKey)}`,
  [AuditEvent.PENALTY_CANCELED]: (c) => `${subj(c)} hủy kỷ luật${withKey(c.entityKey)}`,
  [AuditEvent.DRIVER_SALARY_RECORDED]: (c) => `${subj(c)} ghi nhận lương tài xế${withKey(c.entityKey)}`,

  [AuditEvent.ENTITY_CREATED]: (c) => `${subj(c)} tạo ${c.entityLabel}${withKey(c.entityKey)}`,
  [AuditEvent.ENTITY_UPDATED]: (c) => `${subj(c)} cập nhật ${c.entityLabel}${withKey(c.entityKey)}`,
  [AuditEvent.ENTITY_DELETED]: (c) => `${subj(c)} xóa ${c.entityLabel}${withKey(c.entityKey)}`,

  [AuditEvent.USER_LOGIN]: (c) => `${subj(c)} đăng nhập hệ thống`,
  [AuditEvent.USER_LOGOUT]: (c) => `${subj(c)} đăng xuất hệ thống`,
  [AuditEvent.LOGIN_FAILED]: (c) => `Đăng nhập thất bại${c.entityKey ? ` cho tài khoản ${c.entityKey}` : ''}${c.ipAddress ? ` từ IP ${c.ipAddress}` : ''}`,
  [AuditEvent.ACCESS_DENIED]: (c) => `${subj(c)} bị từ chối truy cập ${c.entityLabel}${withKey(c.entityKey)}`,
};

export function renderAuditMessage(payload: AuditPayload): string {
  const template = templates[payload.event];
  if (template) return template(ctx(payload));
  const c = ctx(payload);
  return `${subj(c)} thực hiện ${payload.event} trên ${c.entityLabel}${withKey(c.entityKey)}`;
}
