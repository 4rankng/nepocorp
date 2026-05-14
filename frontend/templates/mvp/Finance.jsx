/* eslint-disable */
// Finance — 06.1 P&L, 06.2 Trends, 06.3 Truck compare, 06.4 Top routes/customers.

// ── 06.1 Monthly P&L matrix ───────────────────────────────
function PnLScreen() {
  const pnl = PNL_APRIL;
  // Aggregate columns
  const cols = pnl.map(t => ({
    plate: t.plate,
    revenue: t.revenue,
    fuel: t.fuelCost,
    allow: t.allowance,
    salary: t.salary,
    repair: t.repair,
    tires:  t.tires,
    oil:    t.oilFilter,
    totalCost: t.fuelCost + t.allowance + t.salary + t.repair + t.tires + t.oilFilter,
    get profit() { return this.revenue - this.totalCost; },
    get margin() { return (this.profit / this.revenue) * 100; },
  }));
  const totals = cols.reduce((acc, c) => ({
    revenue: acc.revenue + c.revenue,
    fuel: acc.fuel + c.fuel,
    allow: acc.allow + c.allow,
    salary: acc.salary + c.salary,
    repair: acc.repair + c.repair,
    tires:  acc.tires  + c.tires,
    oil:    acc.oil    + c.oil,
    totalCost: acc.totalCost + c.totalCost,
    profit: acc.profit + c.profit,
  }), { revenue: 0, fuel: 0, allow: 0, salary: 0, repair: 0, tires: 0, oil: 0, totalCost: 0, profit: 0 });

  const fmt = (n) => formatNumber(n);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Báo cáo P&amp;L tháng 4, 2026</h1>
          <p>Doanh thu · chi phí · LN gộp của 4 xe · so sánh với tháng 3</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Calendar size={14} /> Tháng 4, 2026</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất PDF</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất Excel</button>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="kpi-grid">
        <div className="metric-panel">
          <div className="lab">Doanh thu</div>
          <div className="val">{(totals.revenue / 1000000000).toFixed(2)}<span className="currency"> tỷ ₫</span></div>
          <div className="trend up"><Icon.ArrowUp size={11} /> +12.4% so T3</div>
        </div>
        <div className="metric-panel">
          <div className="lab">Tổng chi phí</div>
          <div className="val">{(totals.totalCost / 1000000000).toFixed(2)}<span className="currency"> tỷ ₫</span></div>
          <div className="trend up"><Icon.ArrowUp size={11} /> +9.8% so T3</div>
        </div>
        <div className="metric-panel">
          <div className="lab">LN gộp</div>
          <div className="val" style={{ color: 'var(--brand-hover)' }}>{(totals.profit / 1000000).toFixed(0)}<span className="currency"> tr ₫</span></div>
          <div className="trend up"><Icon.ArrowUp size={11} /> +8.1% so T3</div>
        </div>
        <div className="metric-panel">
          <div className="lab">Biên LN gộp</div>
          <div className="val">{((totals.profit / totals.revenue) * 100).toFixed(1)}<span className="currency"> %</span></div>
          <div className="trend down"><Icon.ArrowDown size={11} /> −0.6 pp so T3</div>
        </div>
      </div>

      {/* P&L matrix */}
      <div className="card-shell section-gap">
        <div className="card-header">
          <div>
            <h3>P&amp;L chi tiết theo xe</h3>
            <p>Đơn vị: VNĐ · Tháng 4, 2026</p>
          </div>
          <span className="badge badge-brand"><Icon.BarChart size={10} /> So sánh 4 xe</span>
        </div>
        <table className="pnl-table">
          <thead>
            <tr>
              <th style={{ minWidth: 240 }}>Khoản mục</th>
              {cols.map(c => <th key={c.plate}>{c.plate}</th>)}
              <th>Tổng</th>
            </tr>
          </thead>
          <tbody>
            <tr className="label-truck"><td>Số chuyến</td>{pnl.map(t => <td key={t.plate}>{t.trips}</td>)}<td>{pnl.reduce((s,t)=>s+t.trips,0)}</td></tr>
            <tr className="label-truck"><td>Số km</td>{pnl.map(t => <td key={t.plate}>{fmt(t.km)}</td>)}<td>{fmt(pnl.reduce((s,t)=>s+t.km,0))}</td></tr>
            <tr className="label-truck"><td>Doanh thu</td>{cols.map(c => <td key={c.plate}>{fmt(c.revenue)}</td>)}<td>{fmt(totals.revenue)}</td></tr>
            <tr><td style={{ paddingLeft: 28 }}>− Tiền dầu</td>{cols.map(c => <td key={c.plate}>{fmt(c.fuel)}</td>)}<td>{fmt(totals.fuel)}</td></tr>
            <tr><td style={{ paddingLeft: 28 }}>− Tiền đi đường</td>{cols.map(c => <td key={c.plate}>{fmt(c.allow)}</td>)}<td>{fmt(totals.allow)}</td></tr>
            <tr><td style={{ paddingLeft: 28 }}>− Lương lái xe</td>{cols.map(c => <td key={c.plate}>{fmt(c.salary)}</td>)}<td>{fmt(totals.salary)}</td></tr>
            <tr><td style={{ paddingLeft: 28 }}>− Sửa chữa</td>{cols.map(c => <td key={c.plate}>{fmt(c.repair)}</td>)}<td>{fmt(totals.repair)}</td></tr>
            <tr><td style={{ paddingLeft: 28 }}>− Lốp</td>{cols.map(c => <td key={c.plate}>{fmt(c.tires)}</td>)}<td>{fmt(totals.tires)}</td></tr>
            <tr><td style={{ paddingLeft: 28 }}>− Dầu máy</td>{cols.map(c => <td key={c.plate}>{fmt(c.oil)}</td>)}<td>{fmt(totals.oil)}</td></tr>
            <tr className="subtotal"><td>Tổng chi phí</td>{cols.map(c => <td key={c.plate}>{fmt(c.totalCost)}</td>)}<td>{fmt(totals.totalCost)}</td></tr>
            <tr className="profit-row"><td>LN gộp</td>{cols.map(c => <td key={c.plate}>{fmt(c.profit)}</td>)}<td>{fmt(totals.profit)}</td></tr>
            <tr className="label-truck"><td>Biên LN gộp</td>{cols.map(c => <td key={c.plate} style={{ color: c.margin > 25 ? 'var(--brand-hover)' : c.margin > 20 ? 'var(--fg-1)' : 'var(--danger-text)' }}>{c.margin.toFixed(1)}%</td>)}<td>{((totals.profit/totals.revenue)*100).toFixed(1)}%</td></tr>
          </tbody>
        </table>
      </div>

      <div className="row-2">
        {/* Profit share */}
        <div className="card-shell">
          <div className="card-header"><h3>Phân chia LN cho đối tác</h3><p>LN ròng = LN gộp − Phí QL 24 tr ₫</p></div>
          <div style={{ padding: '20px 24px' }}>
            <div className="split-bar">
              <div style={{ flex: PARTNERS[0].pct }}>{PARTNERS[0].name} · {PARTNERS[0].pct}%</div>
              <div style={{ flex: PARTNERS[1].pct }}>{PARTNERS[1].name} · {PARTNERS[1].pct}%</div>
            </div>
            <table className="cost-table" style={{ marginTop: 14 }}>
              <tbody>
                <tr><td>LN gộp</td><td>{fmt(totals.profit)} ₫</td></tr>
                <tr><td>− Phí quản lý</td><td>− {fmt(24000000)} ₫</td></tr>
                <tr className="total"><td>LN ròng</td><td>{fmt(totals.profit - 24000000)} ₫</td></tr>
                {PARTNERS.map(p => (
                  <tr key={p.name}><td>{p.name} ({p.pct}%)</td><td style={{ color: 'var(--brand-hover)' }}>{fmt((totals.profit - 24000000) * (p.pct / 100))} ₫</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost structure */}
        <div className="card-shell">
          <div className="card-header"><h3>Cơ cấu chi phí</h3><p>Tỷ trọng từng khoản · tháng 4, 2026</p></div>
          <CostStackedBar totals={totals} />
        </div>
      </div>
    </>
  );
}

function CostStackedBar({ totals }) {
  const segs = [
    { label: 'Dầu',           v: totals.fuel,    color: '#059669' },
    { label: 'Đi đường',      v: totals.allow,   color: '#10B981' },
    { label: 'Lương lái xe',  v: totals.salary,  color: '#6EE7B7' },
    { label: 'Sửa chữa · lốp · dầu máy', v: totals.repair + totals.tires + totals.oil, color: '#D1D5DB' },
  ];
  const total = segs.reduce((s, x) => s + x.v, 0);
  return (
    <div style={{ padding: '20px 24px 22px' }}>
      <div style={{ display: 'flex', height: 38, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {segs.map((s, i) => {
          const pct = (s.v / total) * 100;
          return <div key={i} style={{ width: pct + '%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i < 3 ? '#fff' : '#1F2937', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{pct.toFixed(0)}%</div>;
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            <span style={{ flex: 1, color: 'var(--fg-2)' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fg-1)' }}>{formatCompact(s.v)} ₫</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 06.2 Trends 6-12 months ───────────────────────────────
function TrendsScreen() {
  const data = MONTHLY_TREND;
  const maxVal = Math.max(...data.map(d => d.rev));
  const W = 880, H = 240, P = { l: 50, r: 12, t: 10, b: 30 };
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const xFor = (i) => P.l + (i / (data.length - 1)) * innerW;
  const yFor = (v) => P.t + (1 - v / maxVal) * innerH;

  const revPath  = data.map((d, i) => `${i ? 'L' : 'M'} ${xFor(i)} ${yFor(d.rev)}`).join(' ');
  const costPath = data.map((d, i) => `${i ? 'L' : 'M'} ${xFor(i)} ${yFor(d.cost)}`).join(' ');
  const profPath = data.map((d, i) => `${i ? 'L' : 'M'} ${xFor(i)} ${yFor(d.profit)}`).join(' ');

  // Best/worst month
  const bestMonth = data.reduce((a, b) => b.profit > a.profit ? b : a);
  const worstMonth = data.reduce((a, b) => b.profit < a.profit ? b : a);

  // Gridlines
  const ticks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Xu hướng 12 tháng</h1>
          <p>Doanh thu · Chi phí · LN gộp · từ tháng 5/2025 → tháng 4/2026</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Calendar size={14} /> 12 tháng gần nhất</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất PDF</button>
        </div>
      </div>

      <div className="kpi-grid cols-3">
        <div className="metric-panel">
          <div className="lab">Tổng doanh thu 12 tháng</div>
          <div className="val">{(data.reduce((s,x)=>s+x.rev,0) / 1000).toFixed(2)}<span className="currency"> tỷ ₫</span></div>
          <div className="trend up"><Icon.ArrowUp size={11} /> +18.2% so 12 tháng trước</div>
        </div>
        <div className="metric-panel">
          <div className="lab">Tháng tốt nhất</div>
          <div className="val" style={{ color: 'var(--brand-hover)' }}>{bestMonth.m}</div>
          <div className="trend up"><Icon.ArrowUp size={11} /> LN gộp {bestMonth.profit} tr ₫</div>
        </div>
        <div className="metric-panel">
          <div className="lab">Tháng kém nhất</div>
          <div className="val" style={{ color: 'var(--danger-text)' }}>{worstMonth.m}</div>
          <div className="trend down"><Icon.ArrowDown size={11} /> LN gộp {worstMonth.profit} tr ₫</div>
        </div>
      </div>

      <div className="card-shell section-gap">
        <div className="card-header">
          <div><h3>Doanh thu · Chi phí · LN gộp</h3><p>Đơn vị: tr ₫</p></div>
        </div>
        <div className="line-chart">
          <div className="legend">
            <span className="lk"><span className="sw" style={{ background: '#059669' }} /> Doanh thu</span>
            <span className="lk"><span className="sw" style={{ background: '#A1A1AA' }} /> Chi phí</span>
            <span className="lk"><span className="sw" style={{ background: '#34D399' }} /> LN gộp</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`}>
            {/* Gridlines */}
            {ticks.map((t, i) => {
              const y = P.t + t * innerH;
              return <line key={i} x1={P.l} x2={W - P.r} y1={y} y2={y} className="grid-line" />;
            })}
            {ticks.map((t, i) => (
              <text key={i} x={P.l - 8} y={P.t + t * innerH + 4} className="axis-label" textAnchor="end">{Math.round(maxVal * (1 - t))}</text>
            ))}
            {/* Cost area (subtle) */}
            <path d={`${costPath} L ${xFor(data.length-1)} ${H - P.b} L ${P.l} ${H - P.b} Z`} fill="rgba(161,161,170,0.12)" />
            {/* Lines */}
            <path d={revPath}  fill="none" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={costPath} fill="none" stroke="#A1A1AA" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" />
            <path d={profPath} fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Points */}
            {data.map((d, i) => (
              <g key={i}>
                <circle cx={xFor(i)} cy={yFor(d.rev)} r="3" fill="#fff" stroke="#059669" strokeWidth="2" />
                <circle cx={xFor(i)} cy={yFor(d.profit)} r="3" fill="#fff" stroke="#34D399" strokeWidth="2" />
              </g>
            ))}
            {/* X axis labels */}
            {data.map((d, i) => (
              <text key={i} x={xFor(i)} y={H - 10} className="axis-label" textAnchor="middle">{d.m}</text>
            ))}
            {/* Best month highlight */}
            {(() => {
              const i = data.findIndex(d => d.m === bestMonth.m);
              return (
                <g>
                  <circle cx={xFor(i)} cy={yFor(bestMonth.profit)} r="6" fill="none" stroke="#34D399" strokeWidth="1.5" opacity="0.5" />
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Trend table */}
      <div className="card-shell">
        <div className="card-header"><h3>Số liệu theo tháng</h3></div>
        <table className="pnl-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>Tháng</th>
              <th>Doanh thu</th>
              <th>Chi phí</th>
              <th>LN gộp</th>
              <th>Biên LN</th>
              <th>So tháng trước</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const margin = (d.profit / d.rev) * 100;
              const prev = i > 0 ? data[i-1].profit : null;
              const delta = prev ? ((d.profit - prev) / prev) * 100 : null;
              return (
                <tr key={d.m} className={d.m === bestMonth.m ? 'profit-row' : ''}>
                  <td>{d.m}</td>
                  <td>{formatNumber(d.rev * 1000000)} ₫</td>
                  <td>{formatNumber(d.cost * 1000000)} ₫</td>
                  <td>{formatNumber(d.profit * 1000000)} ₫</td>
                  <td>{margin.toFixed(1)}%</td>
                  <td style={{ color: delta == null ? 'var(--fg-3)' : delta >= 0 ? 'var(--brand-hover)' : 'var(--danger-text)' }}>
                    {delta == null ? '—' : (delta >= 0 ? '+ ' : '− ') + Math.abs(delta).toFixed(1) + '%'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── 06.3 Truck comparison ─────────────────────────────────
function CompareScreen() {
  const pnl = PNL_APRIL.map(t => ({
    ...t,
    totalCost: t.fuelCost + t.allowance + t.salary + t.repair + t.tires + t.oilFilter,
  }));
  pnl.forEach(t => {
    t.profit = t.revenue - t.totalCost;
    t.margin = (t.profit / t.revenue) * 100;
    t.kmCost = t.totalCost / t.km;
    // Average TTBQ from sample trips on this plate
    const sample = TRIPS.filter(x => x.plate === t.plate);
    t.ttbq = sample.length ? sample.reduce((s, x) => s + x.ttbq, 0) / sample.length : 35;
    t.idleDays = Math.round((30 - t.trips / 1.4) / 2);
  });

  const fields = [
    { key: 'trips',    label: 'Số chuyến',    fmt: v => v },
    { key: 'km',       label: 'Km chạy',      fmt: v => formatNumber(v) + ' km' },
    { key: 'ttbq',     label: 'TTBQ trung bình', fmt: v => v.toFixed(1) + ' L/100km' },
    { key: 'revenue',  label: 'Doanh thu',    fmt: v => formatCompact(v) + ' ₫' },
    { key: 'totalCost',label: 'Tổng chi phí', fmt: v => formatCompact(v) + ' ₫' },
    { key: 'profit',   label: 'LN gộp',       fmt: v => formatCompact(v) + ' ₫', highlight: true },
    { key: 'margin',   label: 'Biên LN gộp',  fmt: v => v.toFixed(1) + '%' },
    { key: 'kmCost',   label: 'Chi phí / km', fmt: v => formatNumber(v) + ' ₫' },
    { key: 'idleDays', label: 'Ngày rỗi',     fmt: v => v + ' ngày' },
  ];

  // For each field find best/worst plate
  const bestPerField = {};
  fields.forEach(f => {
    const sorted = [...pnl].sort((a, b) => (f.key === 'totalCost' || f.key === 'idleDays' || f.key === 'kmCost' || f.key === 'ttbq') ? a[f.key] - b[f.key] : b[f.key] - a[f.key]);
    bestPerField[f.key] = sorted[0].plate;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>So sánh hiệu quả xe</h1>
          <p>4 xe đầu kéo · tháng 4, 2026 · sắp xếp theo từng tiêu chí</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Calendar size={14} /> Tháng 4, 2026</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất Excel</button>
        </div>
      </div>

      {/* Truck cards row */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        {pnl.map((t, idx) => {
          const fleet = FLEET.find(f => f.plate === t.plate);
          return (
            <div key={t.plate} className="card-shell" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="stat-icon brand" style={{ width: 32, height: 32, background: 'var(--brand-soft)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon.Truck size={16} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{t.plate}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fleet?.driver}</div>
                </div>
              </div>
              <div>
                <div className="lab" style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>LN gộp</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--brand-hover)', letterSpacing: '-0.02em', marginTop: 2 }}>{formatCompact(t.profit)} ₫</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>Biên {t.margin.toFixed(1)}% · {t.trips} chuyến · {formatNumber(t.km)} km</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="card-shell">
        <div className="card-header">
          <div><h3>Bảng so sánh chi tiết</h3><p>● Ô có viền xanh = giá trị tốt nhất cho hàng tương ứng</p></div>
        </div>
        <table className="pnl-table">
          <thead>
            <tr>
              <th>Tiêu chí</th>
              {pnl.map(t => <th key={t.plate}>{t.plate}</th>)}
            </tr>
          </thead>
          <tbody>
            {fields.map(f => (
              <tr key={f.key} className={f.highlight ? 'profit-row' : ''}>
                <td>{f.label}</td>
                {pnl.map(t => {
                  const isBest = bestPerField[f.key] === t.plate;
                  return (
                    <td key={t.plate} style={isBest ? { color: 'var(--brand-hover)', fontWeight: 700, position: 'relative' } : null}>
                      {isBest ? <span style={{ marginRight: 4, color: 'var(--brand)' }}>●</span> : null}
                      {f.fmt(t[f.key])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── 06.4 Top routes & customers ───────────────────────────
function TopRoutesScreen() {
  const topRoutes = [
    { rank: 1, route: 'HP → Lai Châu',  trips: 8,  rev: 55680000, profit: 13360000, margin: 24 },
    { rank: 2, route: 'HP → Sa Pa',     trips: 11, rev: 65560000, profit: 14420000, margin: 22 },
    { rank: 3, route: 'HP → Mộc Châu',  trips: 18, rev: 52560000, profit:  9460000, margin: 18 },
    { rank: 4, route: 'HP → Hà Nội',    trips: 42, rev: 48300000, profit:  7730000, margin: 16 },
    { rank: 5, route: 'HP → Hà Nam',    trips: 12, rev: 17760000, profit:  3020000, margin: 17 },
    { rank: 6, route: 'HP → Bắc Giang', trips: 16, rev: 12640000, profit:  1900000, margin: 15 },
    { rank: 7, route: 'HP → Hưng Yên',  trips: 24, rev: 27600000, profit:  4140000, margin: 15 },
    { rank: 8, route: 'HP → Bắc Ninh',  trips: 31, rev: 24490000, profit:  3430000, margin: 14 },
    { rank: 9, route: 'HP → Thái Bình', trips: 14, rev: 10080000, profit:  1310000, margin: 13 },
    { rank:10, route: 'HP → Hải Dương', trips: 18, rev: 10440000, profit:  1250000, margin: 12 },
  ];

  const topCustomers = CUSTOMERS
    .slice()
    .sort((a, b) => b.ytdRevenue - a.ytdRevenue)
    .slice(0, 10)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  const cargoMix = [
    { label: 'Hàng chung',           rev: 1080, color: '#059669' },
    { label: 'Chè xuất khẩu',        rev: 320,  color: '#10B981' },
    { label: 'Vietsun (hãng tàu)',   rev: 280,  color: '#6EE7B7' },
    { label: 'Cont rỗng',            rev: 180,  color: '#D1D5DB' },
  ];
  const cargoTotal = cargoMix.reduce((s, x) => s + x.rev, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Top tuyến &amp; khách hàng</h1>
          <p>Xếp hạng theo doanh thu · tháng 4, 2026 · 44+ khách hàng</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Calendar size={14} /> Tháng 4, 2026</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất Excel</button>
        </div>
      </div>

      <div className="row-2">
        <div className="card-shell">
          <div className="card-header">
            <div><h3>Top 10 tuyến sinh lời nhất</h3><p>Theo LN gộp · biên LN</p></div>
          </div>
          {topRoutes.map(r => (
            <div key={r.rank} className={`rank-row ${r.rank <= 3 ? 'top' : ''}`}>
              <div className="rank-num">{r.rank.toString().padStart(2, '0')}</div>
              <div className="rank-body">
                <div className="nm">{r.route}</div>
                <div className="sub">{r.trips} chuyến · biên LN {r.margin}% · DT {formatCompact(r.rev)} ₫</div>
              </div>
              <div className="rank-tail">
                <div className="vl">{formatCompact(r.profit)}</div>
                <div className="vl-sub">LN gộp ₫</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card-shell">
          <div className="card-header">
            <div><h3>Top 10 khách hàng</h3><p>Doanh thu YTD · 44+ KH</p></div>
          </div>
          {topCustomers.map(c => (
            <div key={c.id} className={`rank-row ${c.rank <= 3 ? 'top' : ''}`}>
              <div className="rank-num">{c.rank.toString().padStart(2, '0')}</div>
              <div className="rank-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="partner-cell" style={{ flex: 1 }}>
                    <div className="logo" style={{ width: 24, height: 24, fontSize: 10 }}>{c.monogram}</div>
                    <div className="meta">
                      <div className="name" style={{ fontSize: 13 }}>{c.name}</div>
                      <div className="sub">{c.tripsYTD} chuyến · {c.industry}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rank-tail">
                <div className="vl">{formatCompact(c.ytdRevenue)}</div>
                <div className="vl-sub">DT YTD ₫</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-shell">
        <div className="card-header">
          <div><h3>Phân bố doanh thu theo loại hàng</h3><p>Tổng {formatCompact(cargoTotal * 1000000)} ₫ · tháng 4, 2026</p></div>
        </div>
        <div style={{ padding: '20px 24px 22px' }}>
          <div style={{ display: 'flex', height: 44, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {cargoMix.map((c, i) => {
              const pct = (c.rev / cargoTotal) * 100;
              return <div key={i} style={{ width: pct + '%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i < 3 ? '#fff' : '#1F2937', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{pct.toFixed(0)}%</div>;
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
            {cargoMix.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '12px 14px', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--fg-2)', fontSize: 11 }}>{c.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fg-1)', marginTop: 2 }}>{formatCompact(c.rev * 1000000)} ₫</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PnLScreen, TrendsScreen, CompareScreen, TopRoutesScreen });
