import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Compass,
  Layers,
  FileText,
  Store,
  Package,
  CalendarDays,
  User,
  LogOut,
  UserCog,
  KeyRound,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useClickOutside } from '../hooks/useClickOutside';
import { api } from '../lib/api';
import { useBadgeCounts } from '../hooks/useQueries';
import { ROLE_LABELS } from '@tingting/shared';
import type { Role } from '@tingting/shared';
import { useUnreadCount } from '../hooks/useNotificationQueries';
import { MonthProvider } from '../hooks/useMonth';
import { NotificationDrawer } from './NotificationDrawer';
import { Sidebar } from './layout/Sidebar';
import { Topbar } from './layout/Topbar';
import { ProfileModal } from './layout/ProfileModal';
import { PasswordModal } from './layout/PasswordModal';
import type { NavItem } from './layout/types';
import { useBottomNavAnimations } from '../hooks/useBottomNavAnimations';

// ─── Navigation config ────────────────────────────────────────────────────

function getNavItems(role: Role, dispatchCount?: number, penaltiesCount?: number): NavItem[] {
  const normRole = String(role || '').toUpperCase();
  switch (normRole) {
    case 'MANAGER':
    case 'ACCOUNTANT':
    case 'ADMIN':
      return [
        { key: 'dashboard', label: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard },

        { key: 'dispatch', label: 'Phân xe', path: '/dispatch', icon: Compass, section: 'operations', count: dispatchCount },
        { key: 'trips', label: 'Sổ chuyến đi', path: '/trips', icon: Truck, section: 'operations' },

        { key: 'salary', label: 'Lương & Chấm công', path: '/salary', icon: CalendarDays, section: 'hr' },
        { key: 'penalties', label: 'Kỷ luật', path: '/penalties', icon: AlertTriangle, section: 'hr', count: penaltiesCount },

        { key: 'finance', label: 'Báo cáo lãi lỗ', path: '/finance', icon: Wallet, section: 'financials' },
        { key: 'profit', label: 'Phân chia lợi nhuận', path: '/profit', icon: DollarSign, section: 'financials' },
        { key: 'debt', label: 'Công nợ phải thu', path: '/debt', icon: Receipt, section: 'financials' },
        { key: 'payables', label: 'Công nợ phải trả', path: '/payables', icon: Receipt, section: 'financials' },
        { key: 'expenses', label: 'Chi phí phát sinh', path: '/expenses', icon: FileText, section: 'financials' },
        { key: 'advances', label: 'Tạm ứng', path: '/advances', icon: Wallet, section: 'financials' },


        { key: 'fleet', label: 'Đội xe', path: '/fleet', icon: Layers, section: 'master-data' },
        { key: 'customers', label: 'Khách hàng', path: '/customers', icon: Users, section: 'master-data' },
        { key: 'suppliers', label: 'Nhà cung cấp', path: '/suppliers', icon: Store, section: 'master-data' },
        { key: 'routes', label: 'Tuyến đường', path: '/config/routes', icon: Route, section: 'master-data' },

        ...(role === 'ADMIN' || role === 'MANAGER' || role === 'ACCOUNTANT' ? [
          { key: 'users', label: 'Người dùng', path: '/users', icon: Users, section: 'system' as const },
        ] : []),
        ...(role === 'ADMIN' || role === 'MANAGER' ? [
          { key: 'audit-logs', label: 'Nhật ký người dùng', path: '/audit-logs', icon: ScrollText, section: 'system' as const },
        ] : []),
        { key: 'config', label: 'Cấu hình', path: '/config', icon: Settings, section: 'system' },
      ];
    case 'DRIVER':
      return [
        { key: 'my-trips', label: 'Hành trình', path: '/my-trips', icon: Route, section: 'operations' },
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
  if (pathname.startsWith('/my-trips')) return 'Hành trình';
  if (pathname.startsWith('/my-earnings')) return 'Thu nhập';
  if (pathname.startsWith('/my-forwarder-trips')) return 'Chuyến đi';
  if (pathname.startsWith('/my-advances')) return 'Tạm ứng';
  if (pathname.match(/^\/my-settlements\/\d+$/)) return 'Chi tiết phiếu thanh toán';
  if (pathname.startsWith('/my-settlements')) return 'Phiếu thanh toán';
  if (pathname.startsWith('/advances')) return 'Quản lý tạm ứng';
  if (pathname.startsWith('/salary')) return 'Lương & Chấm công';
  return 'NEPO';
}

// ─── Layout component ─────────────────────────────────────────────────────

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const bottomNavRef = useBottomNavAnimations({ ready: !!user && user.role === 'DRIVER' });
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: unreadData } = useUnreadCount({ enabled: user?.role !== 'DRIVER' });
  const unreadCount = unreadData?.count ?? 0;

  // Profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', phone: '', username: '', fullName: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const toggleUserMenu = useCallback(() => setUserMenuOpen(v => !v), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);

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
    if (profileSaving) return;
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
    if (passwordSaving) return;
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Badge counts
  const { data: badgeData } = useBadgeCounts({
    enabled: user?.role !== 'DRIVER' && user?.role !== 'FORWARDER',
  });
  const dispatchCount = badgeData?.dispatchCount;
  const penaltiesCount = badgeData?.penaltiesCount;

  // Nav items and active state
  const navItems = user ? getNavItems(user.role, dispatchCount, penaltiesCount) : [];
  const activeKey = navItems
    .filter(item => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.key || '';

  const pageTitle = getPageTitle(location.pathname);
  const activeSection = navItems.find(i => i.key === activeKey)?.section;

  // Sidebar navigation handler
  const handleNavigate = useCallback((path: string) => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
    navigate(path);
  }, [navigate]);

  // Sidebar collapse state
  const navRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [navClientHeight, setNavClientHeight] = useState(0);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    setNavClientHeight(nav.clientHeight);
    const ro = new ResizeObserver(() => setNavClientHeight(nav.clientHeight));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

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
    const ungroupedCount = navItems.filter(i => !i.section).length;
    const totalH = (['operations', 'hr', 'financials', 'master-data', 'system'] as const).reduce((acc, s) => {
      const count = navItems.filter(i => i.section === s).length;
      return count > 0 ? acc + LABEL_H + count * ITEM_H : acc;
    }, NAV_PAD + ungroupedCount * ITEM_H);

    if (totalH > navClientHeight) {
      setCollapsed(prev => {
        const next = new Set<string>(
          (['operations', 'hr', 'financials', 'master-data', 'system'] as const).filter(k => k !== activeSection)
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

  // Update browser tab title on route change
  useEffect(() => {
    document.title = `${pageTitle} · TingTing`;
  }, [pageTitle]);

  // Screen reader live region
  const [ariaLiveMsg, setAriaLiveMsg] = useState('');
  useEffect(() => {
    setAriaLiveMsg(`Đã chuyển đến ${pageTitle}`);
  }, [pageTitle]);

  if (!user) return null;

  const isDriver = user.role === 'DRIVER';

  const sidebarProps = {
    user,
    navItems,
    activeKey,
    sidebarOpen,
    userMenuOpen,
    collapsed,
    onNavigate: handleNavigate,
    onToggleSidebar: () => setSidebarOpen(false),
    onToggleUserMenu: toggleUserMenu,
    onCloseUserMenu: closeUserMenu,
    onOpenProfileModal: openProfileModal,
    onOpenPasswordModal: openPasswordModal,
    onLogout: logout,
    navRef,
    activeSection,
    toggleSection,
  };

  const topbarProps = {
    user,
    isDriver,
    sidebarOpen,
    unreadCount,
    onToggleSidebar: () => setSidebarOpen(v => !v),
    onOpenNotifications: () => setNotifOpen(true),
  };

  return (
    <div className={`app ${!sidebarOpen ? 'sidebar-closed' : ''} ${isDriver ? 'is-driver' : ''}`}>
      <a href="#main-content" className="skip-link">Bỏ qua đến nội dung chính</a>
      {/* Screen reader live region for route changes */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{ariaLiveMsg}</div>

      <Sidebar {...sidebarProps} />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => { if (!profileSaving) setProfileModalOpen(false); }}
        saving={profileSaving}
        error={profileError}
        form={profileForm}
        onFormChange={setProfileForm}
        onSave={handleSaveProfile}
      />

      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => { if (!passwordSaving) setPasswordModalOpen(false); }}
        saving={passwordSaving}
        error={passwordError}
        form={passwordForm}
        onFormChange={setPasswordForm}
        onSave={handleChangePassword}
      />

      <div className={`app-main ${isDriver ? 'driver-mode' : ''}`}>
        <Topbar {...topbarProps} />

        <main className="app-body" id="main-content">
          {children}
        </main>

        {/* Bottom Navigation for Drivers on Mobile */}
        {isDriver && (
          <nav className="bottom-nav" ref={bottomNavRef as React.RefObject<HTMLElement>}>
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

      {/* Mobile User Menu Sheet for Drivers — Vantai Design System */}
      {isDriver && userMenuOpen && (
        <div className="mobile-user-sheet-overlay" onClick={closeUserMenu}>
          <div className="mobile-user-sheet" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="mobile-user-sheet-handle" />

            {/* Profile hero with brand gradient */}
            <div className="mobile-user-sheet-hero">
              <div className="mobile-user-sheet-header">
                <div className="avatar">
                  <User size={24} />
                </div>
                <div className="meta">
                  <div className="name">{user.fullName || getRoleLabel(user.role)}</div>
                  <div className="email">{user.email || user.username}</div>
                  <div className="mobile-user-sheet-role-badge">
                    <Shield size={10} />
                    {getRoleLabel(user.role)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mobile-user-sheet-divider" />

            {/* Menu items with icon tiles + trailing chevrons */}
            <div className="mobile-user-sheet-body">
              <button className="mobile-user-sheet-btn" onClick={openProfileModal}>
                <span className="icon-tile"><UserCog size={18} /></span>
                <span className="btn-label">Thông tin cá nhân</span>
                <ChevronRight size={16} className="btn-chevron" />
              </button>
              <button className="mobile-user-sheet-btn" onClick={openPasswordModal}>
                <span className="icon-tile"><KeyRound size={18} /></span>
                <span className="btn-label">Đổi mật khẩu</span>
                <ChevronRight size={16} className="btn-chevron" />
              </button>

              <div className="mobile-user-sheet-divider" />

              <button className="mobile-user-sheet-btn danger" onClick={() => { closeUserMenu(); logout(); }}>
                <span className="icon-tile"><LogOut size={18} /></span>
                <span className="btn-label">Đăng xuất</span>
                <ChevronRight size={16} className="btn-chevron" />
              </button>
            </div>

            <div className="mobile-user-sheet-footer" />
          </div>
        </div>
      )}

      <NotificationDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
