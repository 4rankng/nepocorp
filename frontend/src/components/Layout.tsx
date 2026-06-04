import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Wallet,
  Receipt,
  AlertTriangle,
  Settings,
  Users,
  ScrollText,
  Route,
  DollarSign,
  LogOut,
  User,
  UserCog,
  KeyRound,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Compass,
  Layers,
  FileText,
  Store,
  Package,
  X,
  CalendarDays,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useClickOutside } from '../hooks/useClickOutside';
import { api } from '../lib/api';
import { Modal, FormGroup } from './UI';
import { useBadgeCounts } from '../hooks/useQueries';
import { ROLE_LABELS } from '@nepocorp/shared';
import type { Role } from '@nepocorp/shared';
import { useUnreadCount } from '../hooks/useNotificationQueries';
import { MonthProvider, useMonth } from '../hooks/useMonth';
import { NotificationDrawer } from './NotificationDrawer';
import { useSearch } from '../context/SearchContext';
import { getSearchItems, filterItems } from '../data/searchRegistry';
import type { SearchItem } from '../data/searchRegistry';
import { SearchDropdown } from './SearchDropdown';

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  section?: 'operations' | 'financials' | 'admin';
  count?: number;
}

function getNavItems(role: Role, dispatchCount?: number, penaltiesCount?: number): NavItem[] {
  const normRole = String(role || '').toUpperCase();
  switch (normRole) {
    case 'MANAGER':
    case 'ACCOUNTANT':
    case 'ADMIN':
      return [
        { key: 'dashboard', label: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard, section: 'operations' },
        { key: 'dispatch', label: 'Phân xe', path: '/dispatch', icon: Compass, section: 'operations', count: dispatchCount },
        { key: 'fleet', label: 'Đội xe', path: '/fleet', icon: Layers, section: 'admin' },
        { key: 'trips', label: 'Sổ chuyến đi', path: '/trips', icon: Truck, section: 'operations' },
        { key: 'penalties', label: 'Kỷ luật', path: '/penalties', icon: AlertTriangle, section: 'operations', count: penaltiesCount },

        { key: 'finance', label: 'Báo cáo lãi lỗ', path: '/finance', icon: Wallet, section: 'financials' },
        { key: 'profit', label: 'Phân chia lợi nhuận', path: '/profit', icon: DollarSign, section: 'financials' },
        { key: 'debt', label: 'Công nợ phải thu', path: '/debt', icon: Receipt, section: 'financials' },
        { key: 'payables', label: 'Công nợ phải trả', path: '/payables', icon: Receipt, section: 'financials' },
        { key: 'expenses', label: 'Chi phí phát sinh', path: '/expenses', icon: FileText, section: 'financials' },
        { key: 'advances', label: 'Tạm ứng', path: '/advances', icon: Wallet, section: 'financials' },
        { key: 'settlements', label: 'Phiếu thanh toán', path: '/settlements', icon: FileText, section: 'financials' },
        { key: 'salary', label: 'Lương & Chấm công', path: '/salary', icon: CalendarDays, section: 'financials' },

        { key: 'customers', label: 'Khách hàng', path: '/customers', icon: Users, section: 'admin' },
        { key: 'suppliers', label: 'Nhà cung cấp', path: '/suppliers', icon: Store, section: 'admin' },
        { key: 'routes', label: 'Tuyến đường', path: '/config/routes', icon: Route, section: 'admin' },
        { key: 'config', label: 'Cấu hình', path: '/config', icon: Settings, section: 'admin' },
        ...(role === 'ADMIN' || role === 'MANAGER' ? [
          { key: 'users', label: 'Người dùng', path: '/users', icon: Users, section: 'admin' as const },
          { key: 'audit-logs', label: 'Nhật ký người dùng', path: '/audit-logs', icon: ScrollText, section: 'admin' as const },
        ] : []),
      ];
    case 'DRIVER':
      return [
        { key: 'my-trips', label: 'Lệnh của tôi', path: '/my-trips', icon: Route, section: 'operations' },
        { key: 'my-earnings', label: 'Thu nhập', path: '/my-earnings', icon: DollarSign, section: 'operations' },
        { key: 'my-penalties', label: 'Kỷ luật', path: '/my-penalties', icon: AlertTriangle, section: 'operations' },
      ];
    case 'FORWARDER':
      return [
        { key: 'my-forwarder-trips', label: 'Chuyến đi', path: '/my-forwarder-trips', icon: Package, section: 'operations' },
        { key: 'my-advances', label: 'Tạm ứng', path: '/my-advances', icon: Wallet, section: 'operations' },
        { key: 'my-settlements', label: 'Phiếu thanh toán', path: '/my-settlements', icon: FileText, section: 'operations' },
      ];
    default:
      return [];
  }
}

function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role] || role;
}

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Tổng quan';
  if (pathname.startsWith('/dispatch')) return 'Điều vận & Phân xe';
  if (pathname.startsWith('/fleet')) return 'Đội xe';
  const tripMatch = pathname.match(/^\/trips\/(\d+)(?:\/edit)?$/);
  if (tripMatch) {
    const isEdit = pathname.endsWith('/edit');
    return isEdit ? 'Sửa lệnh vận chuyển' : 'Chi tiết lệnh vận chuyển';
  }
  if (pathname === '/trips/new') return 'Tạo lệnh vận chuyển';
  if (pathname.startsWith('/trips')) return 'Lệnh vận chuyển';
  if (pathname === '/finance') return 'Báo cáo lãi lỗ';
  if (pathname.startsWith('/profit')) return 'Phân chia lợi nhuận';
  if (pathname.startsWith('/debt')) return 'Công nợ phải thu';
  if (pathname.startsWith('/payables')) return 'Công nợ phải trả';
  if (pathname.startsWith('/expenses/new')) return 'Ghi nhận chi phí';
  if (pathname.match(/^\/expenses\/\d+\/edit$/)) return 'Sửa chi phí';
  if (pathname.startsWith('/expenses')) return 'Chi phí phát sinh';
  if (pathname.startsWith('/suppliers')) return 'Nhà cung cấp';
  if (pathname === '/penalties' || pathname === '/my-penalties') return 'Kỷ luật';
  if (pathname.startsWith('/customers')) return 'Khách hàng';
  if (pathname.startsWith('/config/routes') || pathname.startsWith('/routes')) return 'Tuyến đường';
  if (pathname === '/config') return 'Cấu hình hệ thống';
  if (pathname.startsWith('/config')) return 'Cấu hình';
  if (pathname === '/users') return 'Người dùng';
  if (pathname === '/audit-logs') return 'Nhật ký người dùng';
  if (pathname.startsWith('/my-trips')) return 'Lệnh của tôi';
  if (pathname.startsWith('/my-earnings')) return 'Thu nhập';
  if (pathname.startsWith('/my-forwarder-trips')) return 'Chuyến đi';
  if (pathname.startsWith('/my-advances')) return 'Tạm ứng';
  if (pathname.startsWith('/my-settlements')) return 'Phiếu thanh toán';
  if (pathname.startsWith('/advances')) return 'Quản lý tạm ứng';
  if (pathname.startsWith('/settlements')) return 'Quản lý phiếu thanh toán';
  if (pathname.startsWith('/salary')) return 'Lương & Chấm công';
  return 'NEPO';
}

const errorBoxStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: '#FEF2F2',
  borderRadius: 8,
  color: 'var(--danger)',
  fontSize: 13,
  marginBottom: 16,
};

const MONTHS = [
  { m: 1, short: 'T1' }, { m: 2, short: 'T2' }, { m: 3, short: 'T3' },
  { m: 4, short: 'T4' }, { m: 5, short: 'T5' }, { m: 6, short: 'T6' },
  { m: 7, short: 'T7' }, { m: 8, short: 'T8' }, { m: 9, short: 'T9' },
  { m: 10, short: 'T10' }, { m: 11, short: 'T11' }, { m: 12, short: 'T12' },
];

/** Clickable month chip in the topbar — opens a month/year grid picker */
function MonthNavigator() {
  const { month, year, setMonthYear } = useMonth();
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), { escapeKey: true, enabled: open });

  useEffect(() => {
    if (open) setPickerYear(year);
  }, [open, year]);

  const months = MONTHS;

  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <div className={`topbar-date ${open ? 'is-open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="topbar-date__trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Chọn tháng"
      >
        <Calendar size={14} className="topbar-date__icon" />
        <span className="topbar-date__label">Tháng {month}/{year}</span>
        <ChevronDown size={12} className="topbar-date__caret" />
      </button>

      {open && (
        <div className="month-picker" role="dialog" aria-label="Chọn tháng">
          <div className="month-picker__header">
            <button
              type="button"
              className="month-picker__year-nav"
              onClick={() => setPickerYear(y => y - 1)}
              aria-label="Năm trước"
            >
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span className="month-picker__year">{pickerYear}</span>
            <button
              type="button"
              className="month-picker__year-nav"
              onClick={() => setPickerYear(y => y + 1)}
              aria-label="Năm sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="month-picker__grid">
            {months.map(({ m, short }) => {
              const isSelected = m === month && pickerYear === year;
              const isThisMonth = pickerYear === now.getFullYear() && m === now.getMonth() + 1;
              return (
                <button
                  key={m}
                  type="button"
                  className={[
                    'month-picker__cell',
                    isSelected ? 'is-selected' : '',
                    isThisMonth && !isSelected ? 'is-current' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    setMonthYear(m, pickerYear);
                    setOpen(false);
                  }}
                >
                  {short}
                </button>
              );
            })}
          </div>
          <div className="month-picker__footer">
            <button
              type="button"
              className="month-picker__today"
              onClick={() => {
                const n = new Date();
                setMonthYear(n.getMonth() + 1, n.getFullYear());
                setOpen(false);
              }}
            >
              Hôm nay
            </button>
            <span className="month-picker__hint">
              {isCurrentMonth ? 'Đang chọn tháng hiện tại' : ' '}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useSearch();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: unreadData } = useUnreadCount({ enabled: user?.role !== 'DRIVER' });
  const unreadCount = unreadData?.count ?? 0;

  const userMenuRef = useRef<HTMLDivElement>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', phone: '', username: '', fullName: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const toggleUserMenu = useCallback(() => setUserMenuOpen(v => !v), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);

  useClickOutside(userMenuRef, closeUserMenu, { escapeKey: true, enabled: userMenuOpen });
  useClickOutside(searchContainerRef, () => setSearchQuery(''), { enabled: searchQuery.length > 0 });

  const openProfileModal = () => {
    if (!user) return;
    setProfileForm({ email: user.email || '', phone: user.phone || '', username: user.username || '', fullName: user.fullName || '' });
    setProfileError(null);
    setProfileModalOpen(true);
    setUserMenuOpen(false);
  };

  const openPasswordModal = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError(null);
    setPasswordModalOpen(true);
    setUserMenuOpen(false);
  };

  const handleSaveProfile = async () => {
    if (profileSaving) return; // guard re-entry (Enter key + button)
    setProfileSaving(true);
    setProfileError(null);
    try {
      const updated = await api.patch<{ email: string; phone: string; username: string; fullName: string | null }>('/auth/me', profileForm);
      updateUser({ email: updated.email, phone: updated.phone, username: updated.username, fullName: updated.fullName ?? undefined });
      setProfileModalOpen(false);
    } catch (err: any) {
      setProfileError(err?.message || 'Không thể lưu thông tin.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordSaving) return; // guard re-entry
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (passwordForm.newPassword.length > 128) {
      setPasswordError('Mật khẩu quá dài (tối đa 128 ký tự).');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordModalOpen(false);
    } catch (err: any) {
      setPasswordError(err?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname, setSearchQuery]);

  const { data: badgeData } = useBadgeCounts({
    enabled: user?.role !== 'DRIVER' && user?.role !== 'FORWARDER',
  });
  const dispatchCount = badgeData?.dispatchCount;
  const penaltiesCount = badgeData?.penaltiesCount;

  // Derive nav items before early return so hooks remain unconditional
  const navItems = user ? getNavItems(user.role, dispatchCount, penaltiesCount) : [];
  const activeKey = navItems
    .filter(item => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.key || '';

  const pageTitle = getPageTitle(location.pathname);
  const activeSection = navItems.find(i => i.key === activeKey)?.section;

  const roleItems = useMemo(() => (user ? getSearchItems(user.role) : []), [user?.role]);
  const matchedItems = useMemo(() => filterItems(roleItems, searchQuery), [roleItems, searchQuery]);

  useEffect(() => { setActiveIndex(0); }, [searchQuery]);

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, matchedItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = matchedItems[activeIndex];
      if (item) {
        navigate(item.path);
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      searchInputRef.current?.blur();
    }
  }

  function handleSearchSelect(item: SearchItem) {
    navigate(item.path);
    setSearchQuery('');
    searchInputRef.current?.blur();
  }

  // Update browser tab title on route change
  useEffect(() => {
    document.title = `${pageTitle} · NEPOCORP`;
  }, [pageTitle]);

  // Announce page changes to screen readers
  const [ariaLiveMsg, setAriaLiveMsg] = useState('');
  useEffect(() => {
    setAriaLiveMsg(`Đã chuyển đến ${pageTitle}`);
  }, [pageTitle]);

  const navRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Track only the nav's own clientHeight — changes only on real window/sidebar resize,
  // never when we collapse/expand sections (avoids feedback loops with scrollHeight).
  const [navClientHeight, setNavClientHeight] = useState(0);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    setNavClientHeight(nav.clientHeight);
    const ro = new ResizeObserver(() => setNavClientHeight(nav.clientHeight));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []); // no deps — just measures the element, never writes collapsed

  // Auto-collapse / expand based on calculated total height vs available height.
  // Uses item counts (stable per role) instead of scrollHeight (changes with collapse state).
  useEffect(() => {
    if (!sidebarOpen || navClientHeight === 0) return;
    const nav = navRef.current;
    if (!nav) return;
    const item = nav.querySelector('.sidebar-item') as HTMLElement | null;
    const label = nav.querySelector('.sidebar-section-label') as HTMLElement | null;
    const navStyle = getComputedStyle(nav);
    const ITEM_H = item?.offsetHeight ?? 38;
    const LABEL_H = label?.offsetHeight ?? 36;
    const NAV_PAD = parseFloat(navStyle.paddingTop) + parseFloat(navStyle.paddingBottom) || 20;
    const totalH = (['operations', 'financials', 'admin'] as const).reduce((acc, s) => {
      const count = navItems.filter(i => i.section === s).length;
      return count > 0 ? acc + LABEL_H + count * ITEM_H : acc;
    }, NAV_PAD);

    if (totalH > navClientHeight) {
      setCollapsed(prev => {
        const next = new Set<string>(
          (['operations', 'financials', 'admin'] as const).filter(k => k !== activeSection)
        );
        if (next.size === prev.size && [...next].every(k => prev.has(k))) return prev;
        return next;
      });
    } else {
      setCollapsed(prev => (prev.size === 0 ? prev : new Set<string>()));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navClientHeight, sidebarOpen, activeSection, user?.role]);

  const toggleSection = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (!user) return null;

  const isDriver = user.role === 'DRIVER';

  const handleNavigate = (path: string) => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
    navigate(path);
  };

  const renderNavSection = (label: string, sectionName: 'operations' | 'financials' | 'admin') => {
    const items = navItems.filter(i => i.section === sectionName);
    if (items.length === 0) return null;
    const isCollapsed = collapsed.has(sectionName);

    return (
      <div key={sectionName}>
        <button
          className="sidebar-section-label sidebar-section-toggle"
          onClick={() => toggleSection(sectionName)}
          aria-expanded={!isCollapsed}
        >
          <span>{label}</span>
          <ChevronDown
            size={10}
            className={`sidebar-section-chevron${isCollapsed ? ' collapsed' : ''}`}
          />
        </button>
        {!isCollapsed && items.map(item => {
          const IconC = item.icon;
          const isActive = item.key === activeKey;
          const isDanger = item.key === 'penalties';
          return (
            <button
              key={item.key}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavigate(item.path)}
              title={item.label}
              aria-label={item.label}
            >
              <IconC size={16} />
              <span className="sidebar-item-label">{item.label}</span>

              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`nav-item__badge${isDanger ? ' nav-item__badge--danger' : ''}`}
                  style={{ marginLeft: 'auto' }}
                >
                  {item.count}
                </span>
              )}
              {isActive && (item.count === undefined || item.count === 0) && (
                <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`app ${!sidebarOpen ? 'sidebar-closed' : ''} ${isDriver ? 'is-driver' : ''}`}>
      <a href="#main-content" className="skip-link">Bỏ qua đến nội dung chính</a>
      {/* Screen reader live region for route changes */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{ariaLiveMsg}</div>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <img src="/assets/logo.avif" alt="NEPOCORP" />
          </div>
          <div className="sidebar-brand-meta">
            <strong>NEPOCORP</strong>
            <span>Logistics System</span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Đóng menu"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" ref={navRef as React.RefObject<HTMLElement>}>
          {renderNavSection('Vận hành', 'operations')}
          {renderNavSection('Tài chính', 'financials')}
          {renderNavSection('Danh mục', 'admin')}
        </nav>

        <div className="sidebar-footer" ref={userMenuRef}>
          <button className="sidebar-user" onClick={toggleUserMenu} aria-expanded={userMenuOpen} aria-label="Menu người dùng">
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="meta">
              <div className="name">{user.fullName || user.username || getRoleLabel(user.role)}</div>
              <div className="role">{getRoleLabel(user.role)}</div>
            </div>
            <ChevronUp size={14} className="sidebar-user-chevron" />
          </button>
          {userMenuOpen && (
            <div className="sidebar-user-dropdown">
              <div className="sidebar-user-dropdown-header">
                <div className="name">{user.fullName || getRoleLabel(user.role)}</div>
                <div className="role">{getRoleLabel(user.role)}</div>
              </div>
              <div className="sidebar-user-dropdown-divider" />
              <button
                className="sidebar-user-dropdown-item sidebar-user-dropdown-item--neutral"
                onClick={openProfileModal}
              >
                <UserCog size={16} />
                Thông tin cá nhân
              </button>
              <button
                className="sidebar-user-dropdown-item sidebar-user-dropdown-item--neutral"
                onClick={openPasswordModal}
              >
                <KeyRound size={16} />
                Đổi mật khẩu
              </button>
              <div className="sidebar-user-dropdown-divider" />
              <button
                className="sidebar-user-dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </aside>

      <Modal
        isOpen={profileModalOpen}
        title="Thông tin cá nhân"
        onClose={() => { if (!profileSaving) setProfileModalOpen(false); }}
        onConfirm={handleSaveProfile}
        footer={
          <>
            <button className="btn btn--secondary btn--sm" onClick={() => setProfileModalOpen(false)}>Hủy</button>
            <button className="btn btn--primary btn--sm" onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        {profileError && (
          <div style={errorBoxStyle}>
            {profileError}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormGroup label="Tên đăng nhập">
            <input
              className="input"
              value={profileForm.username}
              onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
              placeholder="username"
            />
          </FormGroup>
          <FormGroup label="Họ và tên">
            <input
              className="input"
              value={profileForm.fullName}
              onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="Nguyễn Văn A"
            />
          </FormGroup>
          <FormGroup label="Email">
            <input
              className="input"
              type="email"
              value={profileForm.email}
              onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </FormGroup>
          <FormGroup label="Số điện thoại">
            <input
              className="input"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="0912345678"
            />
          </FormGroup>
        </div>
      </Modal>

      <Modal
        isOpen={passwordModalOpen}
        title="Đổi mật khẩu"
        onClose={() => { if (!passwordSaving) setPasswordModalOpen(false); }}
        onConfirm={handleChangePassword}
        footer={
          <>
            <button className="btn btn--secondary btn--sm" onClick={() => setPasswordModalOpen(false)}>Hủy</button>
            <button className="btn btn--primary btn--sm" onClick={handleChangePassword} disabled={passwordSaving}>
              {passwordSaving ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </button>
          </>
        }
      >
        {passwordError && (
          <div style={errorBoxStyle}>
            {passwordError}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormGroup label="Mật khẩu hiện tại">
            <input
              className="input"
              type="password"
              value={passwordForm.currentPassword}
              onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
              placeholder="Nhập mật khẩu hiện tại"
            />
          </FormGroup>
          <FormGroup label="Mật khẩu mới">
            <input
              className="input"
              type="password"
              value={passwordForm.newPassword}
              onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="Ít nhất 6 ký tự"
            />
          </FormGroup>
          <FormGroup label="Xác nhận mật khẩu mới">
            <input
              className="input"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Nhập lại mật khẩu mới"
            />
          </FormGroup>
        </div>
      </Modal>

      <MonthProvider>
      <div className={`app-main ${isDriver ? 'driver-mode' : ''}`}>
        <header className={`topbar ${isDriver ? 'topbar--driver' : ''}`}>
          {!isDriver && (
            <button
              className="topbar__toggle"
              aria-label="Ẩn / hiện menu"
              title="Ẩn / hiện menu (⌘B)"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}

          {!isDriver && (
            <div ref={searchContainerRef} className="topbar__search" style={{ position: 'relative' }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm trang, cấu hình, thao tác…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {!searchQuery && <kbd>⌘ K</kbd>}
              {searchQuery.length > 0 && (
                <SearchDropdown
                  items={matchedItems}
                  query={searchQuery}
                  activeIndex={activeIndex}
                  onSelect={handleSearchSelect}
                  onHover={setActiveIndex}
                />
              )}
            </div>
          )}

          {isDriver && (
            <>
              <div className="topbar__left-driver">
                <div className="topbar__welcome">
                  <span className="greeting">Xin chào,</span>
                  <span className="name">{user.fullName || user.username}</span>
                </div>
              </div>
              <div className="topbar__center-driver">
                <MonthNavigator />
              </div>
            </>
          )}

          <div className="topbar__actions">
            {!isDriver && <MonthNavigator />}
            {!isDriver && (
              <button className="icon-btn help-btn" aria-label="Trợ giúp">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </button>
            )}
            <button className="icon-btn notification-btn" aria-label="Thông báo" onClick={() => setNotifOpen(true)}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              {unreadCount > 0 && (
                <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
          </div>
        </header>

        <main className="app-body" id="main-content">
          {children}
        </main>

        {/* Bottom Navigation for Drivers on Mobile */}
        {isDriver && (
          <nav className="bottom-nav">
            {navItems.map(item => {
              const IconC = item.icon;
              const isActive = item.key === activeKey;
              return (
                <button
                  key={item.key}
                  className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavigate(item.path)}
                >
                  <div className="bottom-nav-indicator" />
                  <div className="bottom-nav-icon-wrap">
                    <IconC size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="bottom-nav-label">{item.label}</span>
                </button>
              );
            })}
            
            {/* Account button for mobile bottom nav */}
            <button
              className={`bottom-nav-item ${userMenuOpen ? 'active' : ''}`}
              onClick={toggleUserMenu}
            >
              <div className="bottom-nav-indicator" />
              <div className="bottom-nav-icon-wrap">
                <User size={20} strokeWidth={userMenuOpen ? 2.5 : 2} />
              </div>
              <span className="bottom-nav-label">Tài khoản</span>
            </button>
          </nav>
        )}
      </div>

      {/* Mobile User Menu Sheet for Drivers */}
      {isDriver && userMenuOpen && (
        <div className="mobile-user-sheet-overlay" onClick={closeUserMenu}>
          <div className="mobile-user-sheet" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <div className="mobile-user-sheet-header">
              <div className="avatar">
                <User size={24} />
              </div>
              <div className="meta">
                <div className="name">{user.fullName || getRoleLabel(user.role)}</div>
                <div className="email">{user.email || user.username}</div>
              </div>
            </div>
            <div className="mobile-user-sheet-divider" />
            <div className="mobile-user-sheet-body">
              <button className="mobile-user-sheet-btn" onClick={openProfileModal}>
                <UserCog size={18} />
                <span>Thông tin cá nhân</span>
              </button>
              <button className="mobile-user-sheet-btn" onClick={openPasswordModal}>
                <KeyRound size={18} />
                <span>Đổi mật khẩu</span>
              </button>
              <div className="mobile-user-sheet-divider" />
              <button className="mobile-user-sheet-btn danger" onClick={() => { closeUserMenu(); logout(); }}>
                <LogOut size={18} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      </MonthProvider>
    </div>
  );
}
