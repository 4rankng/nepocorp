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
  LogOut,
  User,
  UserCog,
  KeyRound,
  ChevronRight,
  ChevronUp,
  Compass,
  Layers,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useClickOutside } from '../hooks/useClickOutside';
import { api } from '../lib/api';
import { Modal, FormGroup } from './UI';
import { useBadgeCounts } from '../hooks/useQueries';
import type { Role } from '@nepocorp/shared';

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  section?: 'operations' | 'financials' | 'admin';
  count?: number;
}

function getNavItems(role: Role, dispatchCount?: number, penaltiesCount?: number): NavItem[] {
  switch (role) {
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
        { key: 'profit', label: 'Lợi nhuận & phân chia', path: '/profit', icon: DollarSign, section: 'financials' },
        { key: 'debt', label: 'Công nợ phải thu', path: '/debt', icon: Receipt, section: 'financials' },
        
        { key: 'customers', label: 'Khách hàng', path: '/customers', icon: Users, section: 'admin' },
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
        { key: 'my-penalties', label: 'Phạt', path: '/my-penalties', icon: AlertTriangle, section: 'operations' },
      ];
    default:
      return [];
  }
}

function getRoleLabel(role: Role): string {
  switch (role) {
    case 'MANAGER': return 'Quản lý';
    case 'ACCOUNTANT': return 'Kế toán';
    case 'ADMIN': return 'Quản trị';
    case 'DRIVER': return 'Tài xế';
    default: return role;
  }
}

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Tổng quan';
  if (pathname.startsWith('/dispatch')) return 'Điều vận & Phân xe';
  if (pathname.startsWith('/fleet')) return 'Đội xe';
  if (pathname.startsWith('/trips')) return 'Lệnh vận chuyển';
  if (pathname === '/finance') return 'Báo cáo lãi lỗ';
  if (pathname.startsWith('/profit')) return 'Lợi nhuận & Phân chia';
  if (pathname.startsWith('/debt')) return 'Công nợ phải thu';
  if (pathname === '/penalties' || pathname === '/my-penalties') return 'Kỷ luật';
  if (pathname.startsWith('/customers')) return 'Khách hàng';
  if (pathname.startsWith('/routes')) return 'Tuyến đường';
  if (pathname === '/config') return 'Cấu hình hệ thống';
  if (pathname.startsWith('/config')) return 'Cấu hình';
  if (pathname === '/users') return 'Người dùng';
  if (pathname === '/audit-logs') return 'Nhật ký người dùng';
  if (pathname.startsWith('/my-trips')) return 'Lệnh của tôi';
  if (pathname.startsWith('/my-earnings')) return 'Thu nhập';
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close user menu when sidebar collapses to avoid invisible open state
  useEffect(() => {
    if (!sidebarOpen) setUserMenuOpen(false);
  }, [sidebarOpen]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', phone: '', username: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const toggleUserMenu = useCallback(() => setUserMenuOpen(v => !v), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);

  useClickOutside(userMenuRef, closeUserMenu, { escapeKey: true, enabled: userMenuOpen });

  const openProfileModal = () => {
    if (!user) return;
    setProfileForm({ email: user.email || '', phone: user.phone || '', username: user.username || '' });
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
      const updated = await api.patch<{ email: string; phone: string; username: string }>('/auth/me', profileForm);
      updateUser({ email: updated.email, phone: updated.phone, username: updated.username });
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: badgeData } = useBadgeCounts();
  const dispatchCount = badgeData?.dispatchCount;
  const penaltiesCount = badgeData?.penaltiesCount;

  if (!user) return null;

  const navItems = getNavItems(user.role, dispatchCount, penaltiesCount);
  const activeKey = navItems
    .filter(item => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.key || '';
    
  const pageTitle = getPageTitle(location.pathname);

  const handleNavigate = (path: string) => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
    navigate(path);
  };

  const renderNavSection = (label: string, sectionName: 'operations' | 'financials' | 'admin') => {
    const items = navItems.filter(i => i.section === sectionName);
    if (items.length === 0) return null;

    return (
      <div key={sectionName}>
        <div className="sidebar-section-label">{label}</div>
        {items.map(item => {
          const IconC = item.icon;
          const isActive = item.key === activeKey;
          const isDanger = item.key === 'penalties';
          return (
            <button
              key={item.key}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavigate(item.path)}
              title={item.label}
            >
              <IconC size={16} />
              <span className="sidebar-item-label">{item.label}</span>

              {item.count !== undefined && (
                <span
                  className={`nav-item__badge${isDanger ? ' nav-item__badge--danger' : ''}`}
                  style={{ marginLeft: 'auto' }}
                >
                  {item.count}
                </span>
              )}
              {isActive && item.count === undefined && (
                <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`app ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
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
        </div>

        <nav className="sidebar-nav">
          {renderNavSection('Vận hành', 'operations')}
          {renderNavSection('Tài chính', 'financials')}
          {renderNavSection('Danh mục', 'admin')}
        </nav>

        <div className="sidebar-footer" ref={userMenuRef}>
          <button className="sidebar-user" onClick={toggleUserMenu}>
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="meta">
              <div className="name">{user.name || getRoleLabel(user.role)}</div>
              <div className="role">{user.email || user.username || getRoleLabel(user.role)}</div>
            </div>
            <ChevronUp size={14} className="sidebar-user-chevron" />
          </button>
          {userMenuOpen && (
            <div className="sidebar-user-dropdown">
              <div className="sidebar-user-dropdown-header">
                <div className="name">{user.name || getRoleLabel(user.role)}</div>
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
              {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
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
              {passwordSaving ? 'Đang lưu...' : 'Đổi mật khẩu'}
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

      <div className="app-main">
        <header className="topbar">
          <button
            className="topbar__toggle"
            aria-label="Ẩn / hiện menu"
            title="Ẩn / hiện menu (⌘B)"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          <nav className="topbar__breadcrumb" aria-label="Breadcrumb">
            <span>NEPO</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            <strong>{pageTitle}</strong>
          </nav>

          <div className="topbar__search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Tìm chuyến đi, khách hàng, xe..." />
            <kbd>⌘ K</kbd>
          </div>

          <div className="topbar__actions">
            <div className="date-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Tháng {new Date().getMonth() + 1} · <strong>{new Date().toLocaleDateString('vi-VN')}</strong></span>
            </div>
            <button className="icon-btn" aria-label="Trợ giúp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </button>
            <button className="icon-btn" aria-label="Thông báo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span className="badge">5</span>
            </button>
          </div>
        </header>

        <div className="app-body">
          {children}
        </div>
      </div>
    </div>
  );
}
