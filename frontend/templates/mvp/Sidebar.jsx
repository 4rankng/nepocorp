/* eslint-disable */
// Sidebar — NEPO MVP navigation grouped by domain section.

function Sidebar({ items, activeKey, onNavigate, role = 'Quản lý', initial = 'Q' }) {
  const sections = [
    { label: 'Tổng quan',   keys: ['dashboard-d', 'dashboard-a', 'alerts'] },
    { label: 'Vận hành',    keys: ['trips'] },
    { label: 'Tài chính',   keys: ['pnl', 'trends', 'compare', 'top'] },
    { label: 'Công nợ',     keys: ['debt-overview', 'debt-list'] },
  ];

  const itemByKey = Object.fromEntries(items.map(i => [i.key, i]));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <img src="../assets/logo-512.png" alt="TTransport" />
        </div>
        <div className="sidebar-brand-meta">
          <strong>NEPO</strong>
          <span>Vận tải · Hải Phòng</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(sec => (
          <React.Fragment key={sec.label}>
            <div className="sidebar-section-label">{sec.label}</div>
            {sec.keys.map(key => {
              const item = itemByKey[key];
              if (!item) return null;
              const IconC = item.icon;
              const isActive = key === activeKey;
              return (
                <button
                  key={key}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => onNavigate(key)}
                >
                  <IconC />
                  <span className="sidebar-item-label">{item.label}</span>
                  {isActive ? <Icon.ChevronRight size={12} /> : null}
                  {!isActive && item.count != null ? (
                    <span className="sidebar-item-trail">{item.count}</span>
                  ) : null}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-user">
          <div className="avatar">{initial}</div>
          <div className="meta">
            <div className="name">{role}</div>
            <div className="role">NEPO · phucloc</div>
          </div>
          <Icon.LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar });
