import { useState, useMemo } from 'react';
import {
  Search,
  Activity,
  Users,
  Clock,
  TrendingUp,
  Download,
  Filter,
  FileText,
  Truck,
  Settings,
  DollarSign,
  LogIn,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Panel } from '../components/UI';

// ─── Types ──────────────────────────────────────────────────────────────

interface AuditEntry {
  id: number;
  timestamp: string;
  userEmail: string;
  userName: string;
  action: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET';
  message: string;
  category: 'trip' | 'config' | 'finance' | 'auth' | 'penalty';
}

// ─── Mock data ──────────────────────────────────────────────────────────

const USERS = [
  { email: 'giamdoc@nepo.vn', name: 'Nguyễn Văn Giám', initials: 'NG' },
  { email: 'ketoan@nepo.vn', name: 'Trần Thị Lan', initials: 'TL' },
  { email: 'vanhanh@nepo.vn', name: 'Phạm Đức Minh', initials: 'PM' },
  { email: 'admin@nepo.vn', name: 'Lê Quang Admin', initials: 'LA' },
];

function ts(hoursAgo: number, minutesAgo = 0): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo, d.getMinutes() - minutesAgo, 0, 0);
  return d.toISOString();
}

const MOCK_ENTRIES: AuditEntry[] = [
  { id: 1,  timestamp: ts(0, 12),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'TRIP_DISPATCHED',           method: 'PUT',    message: 'Xuất phát chuyến xe #42 — HP → HN',                                     category: 'trip' },
  { id: 2,  timestamp: ts(0, 25),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'PAYMENT_RECEIVED',           method: 'POST',   message: 'Ghi nhận thanh toán 15.000.000₫ từ Công ty ABC',                        category: 'finance' },
  { id: 3,  timestamp: ts(0, 40),  userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_CREATED',               method: 'POST',   message: 'Tạo lệnh vận chuyển mới — Khách: Công ty XYZ, Tuyến: HP → QN',          category: 'trip' },
  { id: 4,  timestamp: ts(0, 55),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_UPDATED',             method: 'PUT',    message: 'Cập nhật xe đầu kéo 29C-567.89 → trạng thái Bảo trì',                  category: 'config' },
  { id: 5,  timestamp: ts(1, 10),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'TRIP_LOCKED',                method: 'PUT',    message: 'Khóa chuyến #38 — HP → NB, doanh thu 8.500.000₫',                      category: 'trip' },
  { id: 6,  timestamp: ts(1, 30),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'ADJUSTMENT_CREATED',         method: 'POST',   message: 'Tạo hóa đơn điều chỉnh +2.300.000₫ — Công ty DEF',                     category: 'finance' },
  { id: 7,  timestamp: ts(1, 45),  userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_UPDATED_ACTUALS',       method: 'PUT',    message: 'Cập nhật số liệu thực tế chuyến #41 — KM thực: 186, dầu: 52L',         category: 'trip' },
  { id: 8,  timestamp: ts(2, 5),   userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_CREATED',             method: 'POST',   message: 'Thêm tuyến đường mới: Hải Phòng → Thái Nguyên (214 km)',               category: 'config' },
  { id: 9,  timestamp: ts(2, 20),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'PENALTY_CREATED',            method: 'POST',   message: 'Ghi kỷ luật tài xế Hoàng Nam — Vượt tốc độ, phạt 500.000₫',            category: 'penalty' },
  { id: 10, timestamp: ts(2, 35),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'TRIP_COMPLETED',             method: 'PUT',    message: 'Hoàn thành chuyến #39 — HP → HN, doanh thu 6.200.000₫',               category: 'trip' },
  { id: 11, timestamp: ts(2, 50),  userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_UPDATED_PRE_DEPARTURE', method: 'PUT',    message: 'Cập nhật số liệu trước xuất phát chuyến #43 — thêm 3 legs',            category: 'trip' },
  { id: 12, timestamp: ts(3, 15),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_DELETED',             method: 'DELETE', message: 'Xóa loại hàng hóa "Cát đen" khỏi danh mục',                             category: 'config' },
  { id: 13, timestamp: ts(3, 30),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'USER_LOGIN',                 method: 'POST',   message: 'Đăng nhập hệ thống',                                                    category: 'auth' },
  { id: 14, timestamp: ts(3, 45),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'USER_LOGIN',                 method: 'POST',   message: 'Đăng nhập hệ thống',                                                    category: 'auth' },
  { id: 15, timestamp: ts(4, 0),   userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_CANCELED',              method: 'PUT',    message: 'Hủy chuyến #37 — Khách hủy đơn, tuyến HP → BN',                        category: 'trip' },
  { id: 16, timestamp: ts(4, 20),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_CREATED',             method: 'POST',   message: 'Thêm lý do kỷ luật: "Sử dụng điện thoại khi lái xe"',                  category: 'config' },
  { id: 17, timestamp: ts(4, 40),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'DRIVER_SALARY_RECORDED',     method: 'POST',   message: 'Ghi lương tài xế Lê Văn Tài — 8.500.000₫ (tháng 5)',                  category: 'finance' },
  { id: 18, timestamp: ts(5, 10),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'PAYMENT_RECEIVED',           method: 'POST',   message: 'Ghi nhận thanh toán 22.000.000₫ từ Công ty GHI',                       category: 'finance' },
  { id: 19, timestamp: ts(5, 30),  userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_DISPATCHED',            method: 'PUT',    message: 'Xuất phát chuyến #40 — xe 29C-234.56, tài xế Hoàng Nam',               category: 'trip' },
  { id: 20, timestamp: ts(5, 50),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_UPDATED',             method: 'PUT',    message: 'Cập nhật bảng giá tuyến HP → HN cho Công ty ABC → 7.800.000₫/chuyến',  category: 'config' },
  { id: 21, timestamp: ts(6, 15),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'TRIP_CREATED',               method: 'POST',   message: 'Tạo lệnh vận chuyển — Khách: Công ty JKL, Tuyến: HN → LS',            category: 'trip' },
  { id: 22, timestamp: ts(6, 35),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'USER_LOGOUT',                method: 'POST',   message: 'Đăng xuất hệ thống',                                                    category: 'auth' },
  { id: 23, timestamp: ts(7, 0),   userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'TRIP_LOCKED',                method: 'PUT',    message: 'Khóa chuyến #36 — HN → QN, doanh thu 9.100.000₫',                      category: 'trip' },
  { id: 24, timestamp: ts(7, 20),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'ENTITY_CREATED',             method: 'POST',   message: 'Thêm tài xế mới: Nguyễn Văn Hùng — SĐT 0954 321 098',                  category: 'config' },
  { id: 25, timestamp: ts(7, 45),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'PENALTY_CREATED',            method: 'POST',   message: 'Ghi kỷ luật tài xế Vũ Đức — Đi trễ 3 lần, phạt 300.000₫',             category: 'penalty' },
  { id: 26, timestamp: ts(8, 10),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'TRIP_COMPLETED',             method: 'PUT',    message: 'Hoàn thành chuyến #35 — HP → HP (nội thành), doanh thu 3.400.000₫',    category: 'trip' },
  { id: 27, timestamp: ts(8, 30),  userEmail: 'vanhanh@nepo.vn',  userName: 'Phạm Đức Minh',   action: 'ENTITY_UPDATED',             method: 'PUT',    message: 'Cập nhật tiền đi đường tuyến HP → TN (núi) → 1.850.000₫/chuyến',      category: 'config' },
  { id: 28, timestamp: ts(8, 50),  userEmail: 'admin@nepo.vn',    userName: 'Lê Quang Admin',   action: 'USER_LOGIN',                 method: 'POST',   message: 'Đăng nhập hệ thống',                                                    category: 'auth' },
  { id: 29, timestamp: ts(9, 15),  userEmail: 'giamdoc@nepo.vn',  userName: 'Nguyễn Văn Giám', action: 'PAYMENT_RECEIVED',           method: 'POST',   message: 'Ghi nhận thanh toán 18.500.000₫ từ Công ty MNO',                       category: 'finance' },
  { id: 30, timestamp: ts(9, 40),  userEmail: 'ketoan@nepo.vn',   userName: 'Trần Thị Lan',    action: 'TRIP_DISPATCHED',            method: 'PUT',    message: 'Xuất phát chuyến #34 — xe 29C-345.67, tài xế Trần Thương',             category: 'trip' },
];

// ─── Helpers ────────────────────────────────────────────────────────────

type Category = 'all' | 'trip' | 'config' | 'finance' | 'auth' | 'penalty';

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

function getUserInitials(email: string): string {
  const u = USERS.find(u => u.email === email);
  return u?.initials || email.slice(0, 2).toUpperCase();
}

function getUserName(email: string): string {
  const u = USERS.find(u => u.email === email);
  return u?.name || email;
}

function avatarColor(email: string): string {
  const idx = USERS.findIndex(u => u.email === email);
  return `avatar-ring--${(idx >= 0 ? idx : email.length) % 5 + 1}`;
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

  const filtered = useMemo(() => {
    let list = MOCK_ENTRIES;
    if (filter !== 'all') list = list.filter(e => e.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.message.toLowerCase().includes(q) ||
        e.userEmail.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI counts from all data (unfiltered)
  const todayCount = MOCK_ENTRIES.length;
  const uniqueUsers = new Set(MOCK_ENTRIES.map(e => e.userEmail)).size;
  const topCategory = (() => {
    const counts: Record<string, number> = {};
    MOCK_ENTRIES.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const labels: Record<string, string> = { trip: 'Chuyến đi', config: 'Cấu hình', finance: 'Tài chính', auth: 'Xác thực', penalty: 'Kỷ luật' };
    return { label: labels[sorted[0]?.[0] || 'trip'], count: sorted[0]?.[1] || 0 };
  })();

  // Category counts for pills
  const catCounts = useMemo(() => {
    const m: Record<string, number> = { all: MOCK_ENTRIES.length };
    MOCK_ENTRIES.forEach(e => { m[e.category] = (m[e.category] || 0) + 1; });
    return m;
  }, []);

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
          <button className="btn btn--secondary">
            <Download size={14} />
            Xuất Excel
          </button>
        </div>
      </header>

      {/* ── KPI Strip ── */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__label">Hành động hôm nay</span>
            <div className="kpi__icon">
              <Activity size={18} />
            </div>
          </div>
          <div className="kpi__value">{todayCount}<span className="kpi__value-unit">sự kiện</span></div>
          <div className="kpi__meta kpi__meta--up">
            <TrendingUp size={11} />
            <strong>+12%</strong> so với hôm qua
          </div>
        </div>

        <div className="kpi kpi--info">
          <div className="kpi__top">
            <span className="kpi__label">Người dùng hoạt động</span>
            <div className="kpi__icon">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi__value">{uniqueUsers}<span className="kpi__value-unit">người</span></div>
          <div className="kpi__meta">Trong 24 giờ qua</div>
        </div>

        <div className="kpi kpi--accent">
          <div className="kpi__top">
            <span className="kpi__label">Phổ biến nhất</span>
            <div className="kpi__icon">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi__value">{topCategory.count}<span className="kpi__value-unit">{topCategory.label}</span></div>
          <div className="kpi__meta">Chiếm {Math.round((topCategory.count / todayCount) * 100)}% tổng hoạt động</div>
        </div>

        <div className="kpi">
          <div className="kpi__top">
            <span className="kpi__label">Hoạt động gần nhất</span>
            <div className="kpi__icon">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi__value" style={{ fontSize: 22 }}>{formatTime(MOCK_ENTRIES[0]?.timestamp || '')}</div>
          <div className="kpi__meta">{MOCK_ENTRIES[0]?.message.slice(0, 40)}…</div>
        </div>
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
                        <div className={`avatar-ring ${avatarColor(entry.userEmail)}`}>
                          {getUserInitials(entry.userEmail)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getUserName(entry.userEmail)}
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
            <span>Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
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
