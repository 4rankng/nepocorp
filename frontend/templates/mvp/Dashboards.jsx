/* eslint-disable */
// Dashboards — 01.1 Director, 01.2 Accountant, 01.3 Alert center.

// ── 01.1 Director dashboard ───────────────────────────────
function DashboardDirector({ onNav }) {
  const monthLabel = 'Tháng 4, 2026';

  // April totals computed from PNL_APRIL
  const totalRev = PNL_APRIL.reduce((s, x) => s + x.revenue, 0);
  const totalCost = PNL_APRIL.reduce((s, x) => s + x.fuelCost + x.allowance + x.salary + x.repair + x.tires + x.oilFilter, 0);
  const totalProfit = totalRev - totalCost;
  const totalTrips = PNL_APRIL.reduce((s, x) => s + x.trips, 0);
  const totalKm = PNL_APRIL.reduce((s, x) => s + x.km, 0);
  const totalDebt = CUSTOMERS.reduce((s, c) => s + c.debt, 0);

  const stats = [
    { label: 'Doanh thu tháng', value: (totalRev / 1000000000).toFixed(2), currency: 'tỷ ₫', trend: '+12.4%', trendDir: 'up',   tone: 'brand', icon: <Icon.Dollar size={16} />, sparkColor: '#10B981', sparkPath: '0,18 10,17 20,16 30,14 40,12 50,11 60,9 70,8 80,5 90,4 100,3' },
    { label: 'LN gộp tháng',    value: (totalProfit / 1000000).toFixed(0), currency: 'tr ₫', trend: '+8.1%',  trendDir: 'up',   tone: 'success', icon: <Icon.TrendingUp size={16} />, sparkColor: '#10B981', sparkPath: '0,17 10,16 20,15 30,13 40,11 50,10 60,8 70,7 80,5 90,4 100,3' },
    { label: 'Tổng chuyến',     value: String(totalTrips),                  trend: '+6.3%',  trendDir: 'up',   tone: 'info',  icon: <Icon.Truck size={16} />, sparkColor: '#2563EB', sparkPath: '0,15 10,16 20,12 30,14 40,11 50,12 60,9 70,11 80,7 90,8 100,5' },
    { label: 'Công nợ hiện tại',value: (totalDebt / 1000000000).toFixed(2), currency: 'tỷ ₫', trend: '+3.8%', trendDir: 'up',   tone: 'warning', icon: <Icon.Wallet size={16} />, sparkColor: '#D97706', sparkPath: '0,12 10,11 20,12 30,10 40,11 50,9 60,10 70,8 80,7 90,6 100,5' },
  ];

  // Monthly chart - last 12 months
  const trend = MONTHLY_TREND;
  const maxRev = Math.max(...trend.map(x => x.rev));

  // Top routes (computed from trips)
  const topRoutes = [
    { rank: 1, route: 'HP → Lai Châu',  trips: 8,  rev: 55680000, margin: 24 },
    { rank: 2, route: 'HP → Sa Pa',     trips: 11, rev: 65560000, margin: 22 },
    { rank: 3, route: 'HP → Mộc Châu',  trips: 18, rev: 52560000, margin: 18 },
    { rank: 4, route: 'HP → Hà Nội',    trips: 42, rev: 48300000, margin: 16 },
    { rank: 5, route: 'HP → Hà Nam',    trips: 12, rev: 17760000, margin: 17 },
  ];

  const audit = [
    { actor: 'Trần Đình Sơn (LX)', verb: 'hoàn thành chuyến', target: 'HP → Hà Nam · 15C-139.82', t: 'Vừa xong' },
    { actor: 'Kế toán',  verb: 'ghi chuyến',  target: 'T2604-018 cho Nitoda',  t: '15 phút trước' },
    { actor: 'Quản lý',  verb: 'phân xe',     target: '15C-070.63 cho Tân Việt Hưng', t: '38 phút trước' },
    { actor: 'Hệ thống', verb: 'cảnh báo',    target: 'TTBQ vượt định mức · 15C-070.63', t: '1 giờ trước' },
    { actor: 'Kế toán',  verb: 'gửi đôn đốc', target: 'Trà Thu Đan (240 tr quá hạn 92 ngày)', t: '2 giờ trước' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tổng quan</h1>
          <p>NEPO Vận tải · {monthLabel} · cập nhật lúc 14:32</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-3)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          <button className="btn btn-ghost btn-icon" style={{ height: 28, width: 28 }}><Icon.ChevronLeft size={14} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', fontSize: 13, fontWeight: 600 }}>
            <Icon.Calendar size={13} /><span>{monthLabel}</span>
          </div>
          <button className="btn btn-ghost btn-icon" style={{ height: 28, width: 28 }}><Icon.ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="kpi-grid">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="main-grid">
        {/* Bar chart */}
        <div className="card-shell">
          <div className="card-header">
            <div>
              <h3>Doanh thu 12 tháng</h3>
              <p>{(trend.reduce((s,x)=>s+x.rev,0)/1000).toFixed(1)} tỷ ₫ · LN gộp {(trend.reduce((s,x)=>s+x.profit,0)/1000).toFixed(2)} tỷ ₫</p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--brand)' }} onClick={() => onNav('trends')}>
              Xem chi tiết <Icon.ArrowUpRight size={12} />
            </button>
          </div>
          <div className="chart-shell" style={{ paddingTop: 20 }}>
            <div className="chart-bars" style={{ height: 180 }}>
              {trend.map((t, i) => {
                const h = Math.max(8, (t.rev / maxRev) * 168);
                return (
                  <div key={i} className="bar" style={{ flex: 1, height: h }} title={`${t.m}: ${t.rev}tr`} />
                );
              })}
            </div>
            <div className="chart-x" style={{ paddingTop: 10 }}>
              {trend.map(t => <span key={t.m}>{t.m}</span>)}
            </div>
          </div>
        </div>

        {/* Right column — top routes */}
        <div className="card-shell">
          <div className="card-header">
            <div>
              <h3>Top tuyến sinh lời</h3>
              <p>{monthLabel}</p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--brand)' }} onClick={() => onNav('top')}>
              Xem tất cả <Icon.ArrowUpRight size={12} />
            </button>
          </div>
          {topRoutes.map(r => (
            <div key={r.rank} className={`rank-row ${r.rank === 1 ? 'top' : ''}`}>
              <div className="rank-num">{r.rank.toString().padStart(2, '0')}</div>
              <div className="rank-body">
                <div className="nm">{r.route}</div>
                <div className="sub">{r.trips} chuyến · biên LN {r.margin}%</div>
              </div>
              <div className="rank-tail">
                <div className="vl">{formatCompact(r.rev)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row-2">
        {/* Profit-share */}
        <div className="card-shell">
          <div className="card-header">
            <div>
              <h3>Phân chia lợi nhuận</h3>
              <p>LN ròng {formatCompact(totalProfit - 24000000)} ₫ · trừ phí QL 24 tr ₫</p>
            </div>
          </div>
          <div style={{ padding: '20px 20px 18px' }}>
            <div className="split-bar">
              <div style={{ flex: PARTNERS[0].pct }}>{PARTNERS[0].name} · {PARTNERS[0].pct}%</div>
              <div style={{ flex: PARTNERS[1].pct }}>{PARTNERS[1].name} · {PARTNERS[1].pct}%</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
              {PARTNERS.map(p => {
                const ln = (totalProfit - 24000000) * (p.pct / 100);
                return (
                  <div key={p.name} className="metric-panel" style={{ padding: '14px 16px' }}>
                    <div className="lab">{p.name}</div>
                    <div className="val" style={{ fontSize: 22 }}>{formatCompact(ln)}<span className="currency">₫</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="card-shell">
          <div className="card-header">
            <div>
              <h3>Cơ cấu chi phí</h3>
              <p>{formatCompact(totalCost)} ₫ · {monthLabel}</p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--brand)' }} onClick={() => onNav('pnl')}>
              Báo cáo P&L <Icon.ArrowUpRight size={12} />
            </button>
          </div>
          <CostDonut pnl={PNL_APRIL} />
        </div>
      </div>

      <div className="card-shell">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.Activity size={14} /><h3 style={{ margin: 0 }}>Hoạt động gần đây</h3>
          </div>
        </div>
        <div>
          {audit.map((a, i) => (
            <div key={i} className="activity-row">
              <div className="ar-icon"><Icon.User size={14} /></div>
              <div className="ar-text">
                <span className="ar-actor">{a.actor}</span> đã {a.verb} <span style={{ color: 'var(--fg-2)' }}>{a.target}</span>
              </div>
              <div className="ar-time">{a.t}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Reusable StatCard — compact layout: icon+label inline top, trend top-right, big value, slim sparkline
function StatCard({ label, value, currency, trend, trendDir, icon, tone = 'brand', sparkPath, sparkColor }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">
          <span className={`stat-icon ${tone}`}>{icon}</span>
          {label}
        </span>
        {trend ? (
          <span className={`stat-trend ${trendDir}`}>
            {trendDir === 'up' ? <Icon.ArrowUp size={10} /> : <Icon.ArrowDown size={10} />}
            {trend}
          </span>
        ) : null}
      </div>
      <div className="stat-value">{value}{currency ? <span className="currency">{currency}</span> : null}</div>
      <div className="spark">
        <svg viewBox="0 0 100 22" preserveAspectRatio="none">
          <polyline fill="none" stroke={sparkColor} strokeWidth="1.4" points={sparkPath} />
        </svg>
      </div>
    </div>
  );
}

// Cost donut — uses PNL_APRIL aggregated
function CostDonut({ pnl }) {
  const fuel      = pnl.reduce((s,x)=>s+x.fuelCost, 0);
  const allowance = pnl.reduce((s,x)=>s+x.allowance, 0);
  const salary    = pnl.reduce((s,x)=>s+x.salary, 0);
  const other     = pnl.reduce((s,x)=>s+x.repair+x.tires+x.oilFilter, 0);
  const total = fuel + allowance + salary + other;
  const segments = [
    { key: 'fuel',      label: 'Dầu',           v: fuel,      color: '#059669' },
    { key: 'allowance', label: 'Đi đường',      v: allowance, color: '#10B981' },
    { key: 'salary',    label: 'Lương lái xe',  v: salary,    color: '#6EE7B7' },
    { key: 'other',     label: 'Sửa chữa · lốp · dầu máy', v: other, color: '#D1D5DB' },
  ];

  // Build donut paths
  const cx = 70, cy = 70, r = 55, rInner = 38;
  let acc = 0;
  const arcs = segments.map(s => {
    const a0 = (acc / total) * 2 * Math.PI;
    acc += s.v;
    const a1 = (acc / total) * 2 * Math.PI;
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0 - Math.PI/2), y0 = cy + r * Math.sin(a0 - Math.PI/2);
    const x1 = cx + r * Math.cos(a1 - Math.PI/2), y1 = cy + r * Math.sin(a1 - Math.PI/2);
    const ix1 = cx + rInner * Math.cos(a1 - Math.PI/2), iy1 = cy + rInner * Math.sin(a1 - Math.PI/2);
    const ix0 = cx + rInner * Math.cos(a0 - Math.PI/2), iy0 = cy + rInner * Math.sin(a0 - Math.PI/2);
    const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${rInner} ${rInner} 0 ${large} 0 ${ix0} ${iy0} Z`;
    return <path key={s.key} d={d} fill={s.color} />;
  });

  return (
    <div className="donut-shell">
      <svg viewBox="0 0 140 140">
        {arcs}
        <text className="donut-center" x="70" y="69">{(total/1000000).toFixed(0)} tr</text>
        <text className="donut-sub" x="70" y="85">CHI PHÍ</text>
      </svg>
      <div className="donut-legend">
        {segments.map(s => {
          const pc = total ? Math.round((s.v / total) * 100) : 0;
          return (
            <div className="leg-row" key={s.key}>
              <span className="sw" style={{ background: s.color }} />
              <span className="nm">{s.label}</span>
              <span className="vl">{formatCompact(s.v)}</span>
              <span className="pc">{pc}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 01.2 Accountant dashboard ─────────────────────────────
function DashboardAccountant({ onNav }) {
  const alerts = [
    { tone: 'danger',  count: 3,  label: 'Chuyến thiếu hoá đơn dầu',     hint: 'Phạt 100k/chuyến · 4 lái xe vi phạm', icon: <Icon.AlertCircle /> },
    { tone: 'warning', count: 2,  label: 'TTBQ vượt định mức',           hint: 'Cần giải trình trong 24h',           icon: <Icon.Droplet /> },
    { tone: 'info',    count: 7,  label: 'Phiếu chuyến chờ ghép',        hint: 'Tài xế đã nộp · cần khớp lệnh',      icon: <Icon.Layers /> },
    { tone: 'danger',  count: 4,  label: 'KH công nợ quá 60 ngày',       hint: 'Tổng 1.094 tr ₫ · cần đôn đốc',      icon: <Icon.Wallet /> },
    { tone: 'warning', count: 1,  label: 'Chuyến chè thiếu ảnh container',hint: 'Trà Thu Đan · 23/04',                icon: <Icon.Camera /> },
    { tone: 'success', count: 18, label: 'Chuyến đã ghép hôm nay',       hint: 'Hoàn tất phiếu — sẵn sàng xuất HĐ',   icon: <Icon.CheckCircle /> },
  ];

  const todos = [
    { done: false, title: 'Đối soát tuần này — Pan Pacific Logistics',  sub: '12 chuyến · 56.4 tr ₫ · cần xác nhận',  tag: { label: 'Hôm nay', kind: 'danger' } },
    { done: false, title: 'Xuất hoá đơn cước tháng 4 — Nitoda',          sub: '24 chuyến · 412 tr ₫',                  tag: { label: 'Trong tuần', kind: 'warning' } },
    { done: false, title: 'Gửi báo cáo công nợ T4 cho Vietsun',          sub: 'Còn 175 tr ₫ · quá hạn 22 ngày',         tag: { label: 'Trong tuần', kind: 'warning' } },
    { done: true,  title: 'Cập nhật giá cước HP → Mộc Châu',             sub: 'Áp dụng từ 01/05',                       tag: { label: 'Đã xong', kind: 'success' } },
    { done: false, title: 'Đối chiếu hoá đơn dầu — 15C-070.63',          sub: '3 chuyến thiếu · 24/04 → 26/04',         tag: { label: 'Hôm nay', kind: 'danger' } },
    { done: true,  title: 'Đóng sổ tuần T16/2026',                       sub: 'Đã chốt 168 chuyến',                     tag: { label: 'Đã xong', kind: 'success' } },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tổng quan</h1>
          <p>Kế toán · Tháng 4, 2026 · việc cần xử lý hôm nay</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => onNav('trips')}><Icon.Layers size={14} /> Sổ chuyến đi</button>
          <button className="btn btn-primary" onClick={() => onNav('debt-list')}><Icon.Wallet size={14} /> Công nợ</button>
        </div>
      </div>

      <div className="page-header" style={{ marginBottom: 12, alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Cảnh báo &amp; hành động</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {alerts.map((a, i) => (
          <button key={i} className={`alert-tile tone-${a.tone}`} onClick={() => onNav('alerts')}>
            <div className="at-icon">{a.icon}</div>
            <div className="at-body">
              <div className="at-headline">
                <strong>{a.label}</strong>
                <span className="at-count">{a.count}</span>
              </div>
              <div className="at-meta">{a.hint}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="row-3">
        <div className="card-shell">
          <div className="card-header">
            <div>
              <h3>Việc cần xử lý</h3>
              <p>4 mục mở · 2 hoàn tất hôm nay</p>
            </div>
            <button className="btn btn-secondary btn-sm"><Icon.Plus size={12} /> Thêm việc</button>
          </div>
          {todos.map((t, i) => (
            <div className="todo-row" key={i}>
              <span className={`tr-check ${t.done ? 'done' : ''}`}>
                {t.done ? <Icon.CheckCircle size={11} /> : null}
              </span>
              <div className="tr-body">
                <div className={`tr-title ${t.done ? 'done' : ''}`}>{t.title}</div>
                <div className="tr-sub">{t.sub}</div>
              </div>
              <span className={`tr-tag badge badge-${t.tag.kind} badge-sm`}>{t.tag.label}</span>
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="metric-panel">
            <div className="lab">Cần xuất hoá đơn</div>
            <div className="val">3.42<span className="currency"> tỷ ₫</span></div>
            <div className="trend up"><Icon.ArrowUp size={11} /> 8 KH · 168 chuyến</div>
          </div>
          <div className="metric-panel">
            <div className="lab">Nhập chuyến hôm nay</div>
            <div className="val">22<span className="currency"> /25</span></div>
            <div className="trend down"><Icon.AlertCircle size={11} /> 3 phiếu chưa ghép</div>
          </div>
          <div className="metric-panel">
            <div className="lab">Sai sót phát hiện</div>
            <div className="val">5</div>
            <div className="trend down"><Icon.ArrowDown size={11} /> Giảm 40% so T3</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 01.3 Alert center ─────────────────────────────────────
function AlertCenter() {
  const [tab, setTab] = React.useState('all');

  const allAlerts = [
    { tone: 'danger',  sev: 'high', icon: <Icon.Droplet />,    title: 'TTBQ vượt định mức · 15C-070.63', sub: 'Chuyến T2604-016 · 37.3 L/100km (định mức 31) · Lê Minh Quân', time: '14:18 · 26/04' },
    { tone: 'danger',  sev: 'high', icon: <Icon.MapPin />,     title: 'GPS tắt > 1 giờ · 15C-136.31',   sub: 'Tuyến HP → Mộc Châu · vị trí cuối Km 218 · 13:02 đến 14:18', time: '14:18 · 26/04' },
    { tone: 'danger',  sev: 'high', icon: <Icon.FileText />,   title: 'Thiếu hoá đơn dầu · T2404-010',  sub: '15C-180.99 · Phạm Quốc Bảo · phạt 100.000 ₫', time: '11:22 · 26/04' },
    { tone: 'warning', sev: 'med',  icon: <Icon.Wallet />,     title: 'KH Trà Thu Đan quá hạn 92 ngày', sub: '240 tr ₫ · liên hệ cuối 18/04', time: '09:30 · 26/04' },
    { tone: 'warning', sev: 'med',  icon: <Icon.Camera />,     title: 'Chuyến chè thiếu ảnh container', sub: 'Trà Thu Đan · MSCU 9907412 · cần upload trong 24h', time: '08:18 · 26/04' },
    { tone: 'warning', sev: 'med',  icon: <Icon.Clock />,      title: 'Lái xe vượt 4h liên tục',         sub: 'Trần Đình Sơn · 4h12 không đổi ca · vi phạm lần 2', time: '22:40 · 25/04' },
    { tone: 'info',    sev: 'low',  icon: <Icon.Layers />,     title: '7 phiếu chuyến mới chờ ghép',     sub: 'Tài xế nộp · cần kế toán khớp lệnh', time: '08:00 · 26/04' },
    { tone: 'info',    sev: 'low',  icon: <Icon.Wallet />,     title: 'KH Nitoda đến hạn cuối tuần',     sub: '678 tr ₫ · đáo hạn 30/04 · còn 4 ngày', time: '07:00 · 26/04' },
    { tone: 'success', sev: 'low',  icon: <Icon.CheckCircle />,title: 'Hoàn tất 18 chuyến hôm qua',      sub: 'Tất cả khớp phiếu · sẵn sàng xuất HĐ', time: '23:58 · 25/04' },
  ];

  const filtered = tab === 'all' ? allAlerts : allAlerts.filter(a => a.sev === tab);

  const counts = {
    all:  allAlerts.length,
    high: allAlerts.filter(a => a.sev === 'high').length,
    med:  allAlerts.filter(a => a.sev === 'med').length,
    low:  allAlerts.filter(a => a.sev === 'low').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Trung tâm cảnh báo</h1>
          <p>{counts.all} cảnh báo trong 24 giờ qua · {counts.high} mức cao</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Filter size={14} /> Bộ lọc</button>
          <button className="btn btn-secondary"><Icon.CheckCircle size={14} /> Đánh dấu đã đọc</button>
        </div>
      </div>

      <div className="card-shell">
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--fg-2)', fontWeight: 500 }}>
            <Icon.Bell size={14} /> Mức độ
          </div>
          <div style={{ flex: 1 }} />
          <div className="tab-row">
            <button className={tab === 'all' ? 'active' : ''}  onClick={() => setTab('all')}>Tất cả · {counts.all}</button>
            <button className={tab === 'high' ? 'active' : ''} onClick={() => setTab('high')}>Cao · {counts.high}</button>
            <button className={tab === 'med' ? 'active' : ''}  onClick={() => setTab('med')}>Trung bình · {counts.med}</button>
            <button className={tab === 'low' ? 'active' : ''}  onClick={() => setTab('low')}>Thấp · {counts.low}</button>
          </div>
        </div>

        {filtered.map((a, i) => (
          <div key={i} className={`alert-row tone-${a.tone}`}>
            <div className="ar-mark">{a.icon}</div>
            <div className="ar-text">
              <strong>{a.title}</strong>
              <div className="ar-sub">{a.sub}</div>
            </div>
            <div className="ar-meta">
              <span className={`sev-pill ${a.sev}`}><span className="dot" />{a.sev === 'high' ? 'Cao' : a.sev === 'med' ? 'TB' : 'Thấp'}</span>
              <div className="ar-time" style={{ marginTop: 4 }}>{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

Object.assign(window, { DashboardDirector, DashboardAccountant, AlertCenter, StatCard });
