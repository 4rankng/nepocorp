import { useState, useMemo, useEffect } from 'react';
import { getInitials } from '../lib/avatar';
import { downloadCSV } from '../lib/csv';
import {
  Search, Activity, Users, Clock, TrendingUp, Download, FileText,
  Truck, Settings, DollarSign, LogIn, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Panel, KPI } from '../components/UI';
import { useAuditLogs, type AuditEntry, type Category } from '../hooks/useAuditLogs';

// ─── Types ──────────────────────────────────────────────────────────────

// Normalized entry with guaranteed non-optional fields.
type NormalizedEntry = AuditEntry & { userEmail: string; userName: string; category: NonNullable<AuditEntry['category']> };

// Map raw API entry → canonical shape with both case-forms populated.
function normalizeEntry(e: any): NormalizedEntry {
  const email = e.user_email || e.userEmail || '';
  const name = e.user_name || e.userName || email;
  // Categorise from the action when the backend hasn't set it explicitly.
  const action: string = e.action || '';
  let category: AuditEntry['category'] = 'config';
  if (action.startsWith('TRIP_') || action === 'STATUS_CHANGED') category = 'trip';
  else if (['PAYMENT_RECEIVED', 'ADJUSTMENT_CREATED', 'PROFIT_DISTRIBUTED'].includes(action)) category = 'finance';
  else if (action === 'PENALTY_CREATED') category = 'penalty';
  else if (action === 'USER_LOGIN' || action === 'USER_LOGOUT') category = 'auth';
  return {
    ...e,
    userEmail: email,
    userName: name,
    category: e.category || category,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

const CATEGORIES: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: 'all',     label: 'Tất cả',    icon: FileText },
  { key: 'trip',    label: 'Chuyến đi', icon: Truck },
  { key: 'config',  label: 'Cấu hình',  icon: Settings },
  { key: 'finance', label: 'Tài chính', icon: DollarSign },
  { key: 'auth',    label: 'Xác thực',  icon: LogIn },
  { key: 'penalty', label: 'Kỷ luật',   icon: Activity },
];

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
  // Status transitions audited from the trips service write a raw
  // STATUS_CHANGED action — these were leaking the uppercase enum value
  // straight into the UI instead of a Vietnamese label.
  STATUS_CHANGED: 'Đổi trạng thái',
  TRIP_REASSIGNED: 'Đổi xe / tài xế',
  PROFIT_DISTRIBUTED: 'Chia lợi nhuận',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatExactTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function avatarColor(str: string): string {
  return `avatar-ring--${str.length % 5 + 1}`;
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
  if (c === 'trip') return <Truck size={13} />;
  if (c === 'config') return <Settings size={13} />;
  if (c === 'finance') return <DollarSign size={13} />;
  if (c === 'auth') return <LogIn size={13} />;
  if (c === 'penalty') return <Activity size={13} />;
  return <FileText size={13} />;
}

// ─── Component ──────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function AuditLogPage() {
  const [filter, setFilter] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading: loading } = useAuditLogs(page, PAGE_SIZE, filter, search);
  const rawEntries: AuditEntry[] = data?.items ?? [];
  const entries = useMemo(() => rawEntries.map(normalizeEntry), [rawEntries]);
  const total = data?.total ?? 0;

  useEffect(() => { setPage(1); }, [filter, search]);

  const paged = entries;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // KPI counts from all entries (server-filtered)
  const todayCount = total;
  const uniqueUsers = new Set(entries.map(e => e.userEmail)).size;
  const topCategory = (() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const labels: Record<string, string> = { trip: 'Chuyến đi', config: 'Cấu hình', finance: 'Tài chính', auth: 'Xác thực', penalty: 'Kỷ luật' };
    return { label: labels[sorted[0]?.[0] || 'trip'], count: sorted[0]?.[1] || 0 };
  })();

  // Category counts (from current page only in API mode)
  const catCounts = useMemo(() => {
    const m: Record<string, number> = { all: total };
    entries.forEach(e => { m[e.category] = (m[e.category] || 0) + 1; });
    return m;
  }, [entries, total]);

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      {/* ── Page Header ── */}
      <header className="page-header">
        <div className="page-header-main">
          <h1 className="page-title">Nhật ký người dùng</h1>
          <p className="page-subtitle">
            Theo dõi mọi thao tác của người dùng trên hệ thống — {todayCount} hành động hôm nay
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--secondary" onClick={() => {
            const headers = ['#', 'Thời gian', 'Người dùng', 'Hành động', 'Nội dung'];
            const rows = entries.map((e, i) => [
              i + 1,
              formatExactTime(e.timestamp),
              e.userName || e.userEmail,
              ACTION_LABELS[e.action] || e.action,
              e.message,
            ]);
            downloadCSV(`nhat-ky-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
          }}>
            <Download size={14} />
            Xuất Excel
          </button>
        </div>
      </header>

      {/* ── KPI Strip ── */}
      <div className="kpi-grid">
        <KPI
          label="Hành động hôm nay"
          value={todayCount}
          unit="sự kiện"
          icon={Activity}
          meta={
            <div className="kpi__meta kpi__meta--up">
              <TrendingUp size={11} />
              <strong>+12%</strong> so với hôm qua
            </div>
          }
        />

        <KPI
          label="Người dùng hoạt động"
          value={uniqueUsers}
          unit="người"
          icon={Users}
          variant="info"
          meta="Trong 24 giờ qua"
        />

        <KPI
          label="Phổ biến nhất"
          value={topCategory.count}
          unit={topCategory.label}
          icon={TrendingUp}
          variant="accent"
          meta={`Chiếm ${todayCount > 0 ? Math.round((topCategory.count / todayCount) * 100) : 0}% tổng hoạt động`}
        />

        <KPI
          label="Hoạt động gần nhất"
          value={entries[0] ? formatTime(entries[0].timestamp) : '—'}
          icon={Clock}
          meta={`${entries[0]?.message.slice(0, 40) ?? 'Đang tải...'}…`}
        />
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = filter === cat.key;
          return (
            <button
              key={cat.key}
              className={`filter-pill${isActive ? ' is-active' : ''}`}
              onClick={() => { setFilter(cat.key); setPage(1); }}
            >
              <Icon size={14} />
              {cat.label}
              {catCounts[cat.key] !== undefined && (
                <span className="filter-pill__count">{catCounts[cat.key]}</span>
              )}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <div className="toolbar__search" style={{ minWidth: 260 }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Tìm theo nội dung, email, hành động..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <Panel flush>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th style={{ width: 170 }}>Thời gian</th>
                <th style={{ width: 200 }}>Người dùng</th>
                <th style={{ width: 160 }}>Hành động</th>
                <th>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--ink-3)' }}>
                    Không tìm thấy bản ghi nào khớp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paged.map((entry, idx) => (
                  <tr key={entry.id}>
                    <td className="num">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{formatTime(entry.timestamp)}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{formatExactTime(entry.timestamp)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`avatar-ring ${avatarColor(entry.userName || entry.userEmail)}`}>
                          {getInitials(entry.userName || entry.userEmail)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.userName || entry.userEmail}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                            {entry.userEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="audit-event-tag">
                        <span className={`audit-dot ${categoryDotClass(entry.category)}`} />
                        {categoryIcon(entry.category)}
                        <span>{ACTION_LABELS[entry.action] || entry.action}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45, maxWidth: 400 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.message}>
                        {entry.message}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        {totalPages > 0 && (
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
            fontSize: 12,
            color: 'var(--ink-3)',
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed' }} />
                Chuyến đi
              </span>
              <span className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--info)' }} />
                Cấu hình
              </span>
              <span className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)' }} />
                Tài chính
              </span>
              <span className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
                Kỷ luật
              </span>
              <span className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink-3)' }} />
                Xác thực
              </span>
            </div>
            <span>Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}</span>
          </div>
        )}
      </Panel>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button
            className="btn btn--secondary btn--sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={14} />
            Trước
          </button>
          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn--secondary btn--sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Tiếp
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
