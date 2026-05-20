import React, { useState } from 'react';
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
  Menu,
  X,
  LogOut,
  User,
  ChevronRight,
  Bell,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '@nepocorp/shared';

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  section?: 'main' | 'admin';
  count?: number;
}

function getNavItems(role: Role): NavItem[] {
  switch (role) {
    case 'MANAGER':
    case 'ACCOUNTANT':
      return [
        { key: 'dashboard', label: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard, section: 'main' },
        { key: 'trips', label: 'Lệnh vận chuyển', path: '/trips', icon: Truck, section: 'main' },
        { key: 'finance', label: 'Tài chính', path: '/finance', icon: Wallet, section: 'main' },
        { key: 'debt', label: 'Công nợ', path: '/debt', icon: Receipt, section: 'main' },
        { key: 'penalties', label: 'Phạt', path: '/penalties', icon: AlertTriangle, section: 'main' },
        { key: 'config', label: 'Cấu hình', path: '/config', icon: Settings, section: 'admin' },
      ];
    case 'ADMIN':
      return [
        { key: 'dashboard', label: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard, section: 'main' },
        { key: 'users', label: 'Người dùng', path: '/users', icon: Users, section: 'main' },
        { key: 'config', label: 'Cấu hình', path: '/config', icon: Settings, section: 'admin' },
        { key: 'audit-logs', label: 'Nhật ký', path: '/audit-logs', icon: ScrollText, section: 'admin' },
      ];
    case 'DRIVER':
      return [
        { key: 'my-trips', label: 'Lệnh của tôi', path: '/my-trips', icon: Route, section: 'main' },
        { key: 'my-earnings', label: 'Thu nhập', path: '/my-earnings', icon: DollarSign, section: 'main' },
        { key: 'my-penalties', label: 'Phạt', path: '/my-penalties', icon: AlertTriangle, section: 'main' },
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
  if (pathname.startsWith('/trips')) return 'Lệnh vận chuyển';
  if (pathname === '/finance') return 'Tài chính';
  if (pathname.startsWith('/debt')) return 'Công nợ';
  if (pathname === '/penalties' || pathname === '/my-penalties') return 'Phat';
  if (pathname.startsWith('/config')) return 'Cấu hình';
  if (pathname === '/users') return 'Người dùng';
  if (pathname === '/audit-logs') return 'Nhật ký hệ thống';
  if (pathname === '/my-trips') return 'Lệnh của tôi';
  if (pathname === '/my-earnings') return 'Thu nhập';
  return 'NEPO';
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const navItems = getNavItems(user.role);
  const activeKey = navItems.find(item => location.pathname.startsWith(item.path))?.key || '';
  const pageTitle = getPageTitle(location.pathname);

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="app">
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <img src="/assets/logo.avif" alt="NEPOCORP" />
          </div>
          <div className="sidebar-brand-meta">
            <strong>NEPOCORP</strong>
            <span>LOGISTICS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Điều hành</div>
          {navItems.filter(i => i.section !== 'admin').map(item => {
            const IconC = item.icon;
            const isActive = item.key === activeKey;
            return (
              <button
                key={item.key}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                <IconC size={16} />
                <span className="sidebar-item-label">{item.label}</span>
                {isActive && <ChevronRight size={12} />}
                {!isActive && item.count != null && (
                  <span className="sidebar-item-trail">{item.count}</span>
                )}
              </button>
            );
          })}

          {navItems.some(i => i.section === 'admin') && (
            <>
              <div className="sidebar-section-label" style={{ paddingTop: 22 }}>Thiết lập</div>
              {navItems.filter(i => i.section === 'admin').map(item => {
                const IconC = item.icon;
                const isActive = item.key === activeKey;
                return (
                  <button
                    key={item.key}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <IconC size={16} />
                    <span className="sidebar-item-label">{item.label}</span>
                    {isActive && <ChevronRight size={12} />}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-user" onClick={logout}>
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="meta">
              <div className="name">{user.name || getRoleLabel(user.role)}</div>
              <div className="role">{user.email}</div>
            </div>
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn"
              aria-label="Menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: undefined }}
            >
              <Menu size={16} />
            </button>
            <h2 className="topbar-title">{pageTitle}</h2>
          </div>

          <div className="topbar-actions">
            <div className="topbar-search">
              <Search size={13} />
              <input type="text" placeholder="Tìm khách hàng, lệnh, container..." />
              <span className="kbd">Cmd+K</span>
            </div>

            <div className="topbar-divider" />

            <button className="icon-btn" aria-label="Thông báo">
              <Bell size={16} />
            </button>

            <button className="user-btn">
              <span className="user-avatar"><User size={16} /></span>
              <span className="role">{getRoleLabel(user.role)}</span>
              <ChevronDown size={12} style={{ color: 'var(--fg-3)' }} />
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
