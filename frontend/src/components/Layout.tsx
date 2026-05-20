import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Compass,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
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
        { key: 'trips', label: 'Sổ chuyến đi', path: '/trips', icon: Truck, section: 'operations' },
        { key: 'penalties', label: 'Kỷ luật', path: '/penalties', icon: AlertTriangle, section: 'operations', count: penaltiesCount },
        
        { key: 'finance', label: 'Báo cáo lãi lỗ', path: '/finance', icon: Wallet, section: 'financials' },
        { key: 'profit', label: 'Lợi nhuận & phân chia', path: '/profit', icon: DollarSign, section: 'financials' },
        { key: 'debt', label: 'Công nợ phải thu', path: '/debt', icon: Receipt, section: 'financials' },
        
        { key: 'customers', label: 'Khách hàng', path: '/customers', icon: Users, section: 'admin' },
        { key: 'routes', label: 'Tuyến đường', path: '/routes', icon: Route, section: 'admin' },
        { key: 'config', label: 'Cấu hình', path: '/config', icon: Settings, section: 'admin' },
        ...(role === 'ADMIN' || role === 'MANAGER' ? [
          { key: 'users', label: 'Người dùng', path: '/users', icon: Users, section: 'admin' as const },
          { key: 'audit-logs', label: 'Nhật ký hệ thống', path: '/audit-logs', icon: ScrollText, section: 'admin' as const },
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
  if (pathname.startsWith('/trips')) return 'Lệnh vận chuyển';
  if (pathname === '/finance') return 'Báo cáo lãi lỗ';
  if (pathname.startsWith('/profit')) return 'Lợi nhuận & Phân chia';
  if (pathname.startsWith('/debt')) return 'Công nợ phải thu';
  if (pathname === '/penalties' || pathname === '/my-penalties') return 'Kỷ luật';
  if (pathname.startsWith('/customers')) return 'Khách hàng';
  if (pathname.startsWith('/routes')) return 'Tuyến đường';
  if (pathname.startsWith('/config')) return 'Cấu hình hệ thống';
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

  // Live badge counts
  const [dispatchCount, setDispatchCount] = useState<number | undefined>(undefined);
  const [penaltiesCount, setPenaltiesCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!user || user.role === 'DRIVER') return;

    // Load unassigned/pending trips count
    api.get<{ total: number }>('/trips?status=CREATED&limit=1')
      .then(res => {
        setDispatchCount(res.total > 0 ? res.total : undefined);
      })
      .catch(() => {});

    // Load active penalties count for current month
    api.get<any[]>('/penalties')
      .then(res => {
        const now = new Date();
        const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const count = res.filter((p: any) => p.date && p.date.startsWith(thisMonthStr)).length;
        setPenaltiesCount(count > 0 ? count : undefined);
      })
      .catch(() => {});
  }, [user, location.pathname]); // Reload counts on page changes or user login

  if (!user) return null;

  const navItems = getNavItems(user.role, dispatchCount, penaltiesCount);
  // Match active item by closest path match
  const activeKey = navItems
    .filter(item => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.key || '';
    
  const pageTitle = getPageTitle(location.pathname);

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
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
    <div className="app">
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
