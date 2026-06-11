import React from 'react';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  User,
  UserCog,
  KeyRound,
  X,
} from 'lucide-react';
import { ROLE_LABELS } from '@tingting/shared';
import type { Role } from '@tingting/shared';
import type { SidebarProps, NavItem, SectionName } from './types';

function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role] || role;
}

function Sidebar({
  user,
  navItems,
  activeKey,
  sidebarOpen,
  userMenuOpen,
  collapsed,
  onNavigate,
  onToggleSidebar,
  onToggleUserMenu,
  onCloseUserMenu,
  onOpenProfileModal,
  onOpenPasswordModal,
  onLogout,
  navRef,
  activeSection,
  toggleSection,
}: SidebarProps) {
  const renderUngroupedItems = () => {
    const items = navItems.filter(i => !i.section);
    if (items.length === 0) return null;

    return items.map(item => {
      const IconC = item.icon;
      const isActive = item.key === activeKey;
      const isDanger = item.key === 'penalties';
      return (
        <button
          key={item.key}
          className={`sidebar-item ${isActive ? 'active' : ''}`}
          onClick={() => onNavigate(item.path)}
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
    });
  };

  const renderNavSection = (label: string, sectionName: SectionName) => {
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
              onClick={() => onNavigate(item.path)}
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
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => onToggleSidebar()} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <img src="/assets/logo.avif" alt="TingTing" />
          </div>
          <div className="sidebar-brand-meta">
            <strong>TingTing</strong>
            <span>Hệ thống Quản lý Vận tải</span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Đóng menu"
            onClick={() => onToggleSidebar()}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" ref={navRef as React.RefObject<HTMLElement>}>
          {renderUngroupedItems()}
          {renderNavSection('Vận hành', 'operations')}
          {renderNavSection('Nhân sự', 'hr')}
          {renderNavSection('Tài chính', 'financials')}
          {renderNavSection('Danh mục', 'master-data')}
          {renderNavSection('Hệ thống', 'system')}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-user" onClick={onToggleUserMenu} aria-expanded={userMenuOpen} aria-label="Menu người dùng">
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
                onClick={onOpenProfileModal}
              >
                <UserCog size={16} />
                Thông tin cá nhân
              </button>
              <button
                className="sidebar-user-dropdown-item sidebar-user-dropdown-item--neutral"
                onClick={onOpenPasswordModal}
              >
                <KeyRound size={16} />
                Đổi mật khẩu
              </button>
              <div className="sidebar-user-dropdown-divider" />
              <button
                className="sidebar-user-dropdown-item"
                onClick={() => {
                  onCloseUserMenu();
                  onLogout();
                }}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export { Sidebar };
