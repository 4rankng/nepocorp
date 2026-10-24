/**
 * Shared audit log helpers — used by AuditLogPage and AuditLogWidget.
 * Single source of truth for action labels, category resolution, and relative time.
 */

// ─── Action label map ──────────────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
  // Trip lifecycle
  TRIP_CREATED: 'Tạo chuyến',
  TRIP_DISPATCHED: 'Xuất phát',
  TRIP_UPDATED_PRE_DEPARTURE: 'Cập nhật trước KH',
  TRIP_UPDATED_ACTUALS: 'Cập nhật thực tế',
  TRIP_COMPLETED: 'Hoàn thành',
  TRIP_LOCKED: 'Khóa chuyến',
  TRIP_CANCELED: 'Hủy chuyến',
  // Financial
  PAYMENT_RECEIVED: 'Thanh toán',
  ADJUSTMENT_CREATED: 'Điều chỉnh',
  PENALTY_CREATED: 'Kỷ luật',
  PENALTY_CANCELED: 'Hủy kỷ luật',
  DRIVER_SALARY_RECORDED: 'Ghi lương',
  PROFIT_DISTRIBUTED: 'Chia lợi nhuận',
  // Generic CRUD
  ENTITY_CREATED: 'Tạo mới',
  ENTITY_UPDATED: 'Cập nhật',
  ENTITY_DELETED: 'Xóa',
  // Auth
  USER_LOGIN: 'Đăng nhập',
  USER_LOGOUT: 'Đăng xuất',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  ACCESS_DENIED: 'Bị từ chối quyền',
};

// ─── Category resolution ───────────────────────────────────────────────────────

export type AuditCategory = 'trip' | 'config' | 'finance' | 'auth' | 'penalty';

export function resolveCategory(action: string): AuditCategory {
  if (action.startsWith('TRIP_')) return 'trip';
  if (['PAYMENT_RECEIVED', 'ADJUSTMENT_CREATED', 'PROFIT_DISTRIBUTED'].includes(action)) return 'finance';
  if (action === 'PENALTY_CREATED' || action === 'PENALTY_CANCELED') return 'penalty';
  if (['USER_LOGIN', 'USER_LOGOUT', 'LOGIN_FAILED', 'ACCESS_DENIED'].includes(action)) return 'auth';
  return 'config';
}

// ─── Relative time formatting ──────────────────────────────────────────────────

/** "Vừa xong", "12 phút trước", "3 giờ trước", "02/06 14:32" */
export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── Duplicate collapse (NEPO-15) ─────────────────────────────────────────────
// The dashboard "Hoạt động gần đây" feed repeatedly showed pairs of
// near-identical rows (same actor + same action + same object minutes-to-an-
// hour apart) that read as rendering bugs: double login after a session drop,
// a trip form saved twice. Real events, but noise at a glance level — collapse
// them into one row carrying a ×N count. Full traceability stays on
// /audit-logs ("Xem tất cả").

export interface GroupableAuditEntry {
  id: number;
  timestamp: string;
  userName: string;
  action: string;
  message: string;
}

/** Collapse window for identical (actor, action, object) events. */
export const AUDIT_GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Collapse consecutive duplicates from a newest-first audit feed.
 * Identity key = userName + action + rendered message (the message already
 * carries the object: "… cập nhật thông tin lệnh vận chuyển TRP-…-0068").
 * Two same-key events merge only when their timestamps sit inside
 * `windowMs` of the group's latest event; the row keeps the LATEST
 * timestamp so ordering stays chronological. Generic: extra fields on the
 * entry type (e.g. `category`) survive the collapse.
 */
export function groupRecentAuditEntries<T extends GroupableAuditEntry>(
  entries: T[],
  windowMs: number = AUDIT_GROUP_WINDOW_MS,
): Array<T & { count: number }> {
  const groups: Array<{ entry: T; count: number; latestMs: number; key: string }> = [];
  for (const e of entries) {
    const t = Date.parse(e.timestamp);
    const key = `${e.userName}\u0000${e.action}\u0000${e.message}`;
    const hit = groups.find(g => g.key === key && g.latestMs - t <= windowMs);
    if (hit) {
      hit.count += 1;
      hit.latestMs = Math.max(hit.latestMs, t);
    } else {
      groups.push({ entry: e, count: 1, latestMs: t, key });
    }
  }
  return groups.map(({ entry, count, latestMs }) => ({
    ...entry,
    count,
    timestamp: new Date(Number.isNaN(latestMs) ? Date.parse(entry.timestamp) : latestMs).toISOString(),
  }));
}
