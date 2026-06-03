import React, { useMemo } from 'react';
import { Settings, Truck, DollarSign, LogIn, FileText, Activity } from 'lucide-react';
import type { DashboardAuditEntry } from '../hooks/useDashboardData';

// ─── Action label map (kept local — only the labels the widget actually uses) ─

const ACTION_LABELS: Record<string, string> = {
  TRIP_CREATED: 'Tạo chuyến',
  TRIP_DISPATCHED: 'Xuất phát',
  TRIP_UPDATED: 'Cập nhật chuyến',
  TRIP_UPDATED_PRE_DEPARTURE: 'Cập nhật trước KH',
  TRIP_UPDATED_ACTUALS: 'Cập nhật thực tế',
  TRIP_COMPLETED: 'Hoàn thành',
  TRIP_LOCKED: 'Khóa chuyến',
  TRIP_CANCELED: 'Hủy chuyến',
  PAYMENT_RECEIVED: 'Thanh toán',
  ADJUSTMENT_CREATED: 'Điều chỉnh',
  PENALTY_CREATED: 'Kỷ luật',
  DRIVER_SALARY_RECORDED: 'Ghi lương',
  ENTITY_CREATED: 'Tạo mới',
  ENTITY_UPDATED: 'Cập nhật',
  ENTITY_DELETED: 'Xóa',
  USER_LOGIN: 'Đăng nhập',
  USER_LOGOUT: 'Đăng xuất',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  STATUS_CHANGED: 'Đổi trạng thái',
  TRIP_REASSIGNED: 'Đổi xe / tài xế',
  PROFIT_DISTRIBUTED: 'Chia lợi nhuận',
  EXPENSE_CREATED: 'Tạo chi phí',
};

// Map raw API entry → category (mirrors AuditLogPage logic)
function resolveCategory(action: string): 'trip' | 'config' | 'finance' | 'auth' | 'penalty' {
  if (action.startsWith('TRIP_') || action === 'STATUS_CHANGED') return 'trip';
  if (['PAYMENT_RECEIVED', 'ADJUSTMENT_CREATED', 'PROFIT_DISTRIBUTED'].includes(action)) return 'finance';
  if (action === 'PENALTY_CREATED') return 'penalty';
  if (['USER_LOGIN', 'USER_LOGOUT', 'LOGIN_FAILED', 'ACCESS_DENIED'].includes(action)) return 'auth';
  return 'config';
}

function categoryDotClass(c: string): string {
  if (c === 'trip') return 'audit-dot--trip';
  if (c === 'config') return 'audit-dot--update';
  if (c === 'finance') return 'audit-dot--finance';
  if (c === 'auth') return 'audit-dot--auth';
  if (c === 'penalty') return 'audit-dot--delete';
  return 'audit-dot--create';
}

function categoryIcon(c: string) {
  if (c === 'trip') return <Truck size={12} />;
  if (c === 'config') return <Settings size={12} />;
  if (c === 'finance') return <DollarSign size={12} />;
  if (c === 'auth') return <LogIn size={12} />;
  if (c === 'penalty') return <Activity size={12} />;
  return <FileText size={12} />;
}

// "Vừa xong", "12 phút trước", "3 giờ trước", "02/06 14:32"
function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── Component ──────────────────────────────────────────────────────────────

interface AuditLogWidgetProps {
  entries: DashboardAuditEntry[];
  navigate: (path: string) => void;
}

export function AuditLogWidget({ entries, navigate }: AuditLogWidgetProps) {
  // Normalize: fill in category if backend didn't provide it
  const normalized = useMemo(
    () =>
      entries.map((e) => ({
        ...e,
        category: (e.category as any) || resolveCategory(e.action || ''),
      })),
    [entries],
  );

  return (
    <div className="wf-card wf-audit">
      <div className="wf-card-h">
        <div>
          <div className="ttl">Hoạt động gần đây</div>
          <div className="sub">Nhật ký vận hành thời gian thực</div>
        </div>
        <button className="wf-link" onClick={() => navigate('/audit-log')}>
          Xem tất cả
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <div className="body">
        {normalized.length === 0 ? (
          <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--wf-ink-3)', textAlign: 'center' }}>
            Chưa có hoạt động nào được ghi nhận.
          </div>
        ) : (
          normalized.map((entry, idx) => {
            const label = ACTION_LABELS[entry.action] || entry.action || 'Hoạt động';
            return (
              <React.Fragment key={entry.id ?? idx}>
                {idx > 0 && <div className="wf-divider" />}
                <div
                  className="wf-aurow"
                  onClick={() => navigate('/audit-log')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate('/audit-log');
                  }}
                >
                  <span className={`audit-dot ${categoryDotClass(entry.category)}`} style={{ width: 8, height: 8 }} />
                  <div className="tx">
                    <div className="lab">
                      <span className="audit-event-tag">
                        {categoryIcon(entry.category)}
                        <span className="lbl-txt">{label}</span>
                      </span>
                      <span className="t">{formatTimeShort(entry.timestamp)}</span>
                    </div>
                    <div className="msg" title={entry.message}>
                      {entry.message}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
