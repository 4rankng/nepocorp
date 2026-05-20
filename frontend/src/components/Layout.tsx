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
  Menu,
  LogOut,
  User,
  ChevronRight,
  Bell,
  Search,
  ChevronDown,
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
        { key: 'penalties', label: 'Kỷ luật & GPS', path: '/penalties', icon: AlertTriangle, section: 'operations', count: penaltiesCount },
        
        { key: 'finance', label: 'Báo cáo lãi lỗ', path: '/finance', icon: Wallet, section: 'financials' },
        { key: 'profit', label: 'Lợi nhuận & phân chia', path: '/profit', icon: DollarSign, section: 'financials' },
        { key: 'debt', label: 'Công nợ phải thu', path: '/debt', icon: Receipt, section: 'financials' },
        
        { key: 'customers', label: 'Khách hàng', path: '/customers', icon: Users, section: 'admin' },
        { key: 'routes', label: 'Tuyến đường', path: '/routes', icon: Route, section: 'admin' },
        { key: 'config', label: 'Cấu hình', path: '/config', icon: Settings, section: 'admin' },
        ...(role === 'ADMIN' ? [
          { key: 'users', label: 'Người dùng', path: '/users', icon: Users, section: 'admin' },
          { key: 'audit-logs', label: 'Nhật ký hệ thống', path: '/audit-logs', icon: ScrollText, section: 'admin' },
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
  if (pathname === '/penalties' || pathname === '/my-penalties') return 'Kỷ luật & GPS';
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
        <div className="sidebar-section-label" style={{ padding: '16px 16px 6px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.35)' }}>
          {label}
        </div>
        {items.map(item => {
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
              
              {item.count !== undefined && (
                <span style={{ 
                  marginLeft: 'auto', 
                  marginRight: isActive ? 6 : 0, 
                  background: item.key === 'penalties' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
                  color: item.key === 'penalties' ? '#F87171' : '#34D399', 
                  fontSize: 10, 
                  fontWeight: 700, 
                  padding: '2px 6px', 
                  borderRadius: 99,
                  lineHeight: 1
                }}>
                  {item.count}
                </span>
              )}
              {isActive && item.count === undefined && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
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
