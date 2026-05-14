/* eslint-disable */
// Debt — 07.1 Overview, 07.2 List, 07.3 Customer detail (+modals), 07.5 Export.

// ── 07.1 Debt overview ────────────────────────────────────
function DebtOverview({ onOpenCustomer, onNav }) {
  const totalDebt = CUSTOMERS.reduce((s, c) => s + c.debt, 0);

  // Aging buckets — VND aggregated
  const byBucket = {
    'T1': CUSTOMERS.filter(c => c.agingBucket === 'T1').reduce((s,c)=>s+c.debt,0),
    'T2': CUSTOMERS.filter(c => c.agingBucket === 'T2').reduce((s,c)=>s+c.debt,0),
    'T3': CUSTOMERS.filter(c => c.agingBucket === 'T3').reduce((s,c)=>s+c.debt,0),
    'T4': CUSTOMERS.filter(c => c.agingBucket === 'T4').reduce((s,c)=>s+c.debt,0),
  };

  const customerCount = CUSTOMERS.filter(c => c.debt > 0).length;
  const overdueCount  = CUSTOMERS.filter(c => c.debt > 0 && (c.agingBucket === 'T3' || c.agingBucket === 'T4')).length;

  // Top 4 — they make up 71%
  const top4 = CUSTOMERS.slice().sort((a, b) => b.debt - a.debt).slice(0, 4);
  const top4Sum = top4.reduce((s, c) => s + c.debt, 0);
  const concentration = (top4Sum / totalDebt) * 100;

  // 6-month trend (rough mock)
  const monthlyDebt = [
    { m: 'T11/25', v: 1620 },
    { m: 'T12/25', v: 1710 },
    { m: 'T1/26',  v: 1755 },
    { m: 'T2/26',  v: 1780 },
    { m: 'T3/26',  v: 1820 },
    { m: 'T4/26',  v: Math.round(totalDebt / 1000000) },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tổng quan công nợ</h1>
          <p>{customerCount} KH còn nợ · {overdueCount} KH quá hạn &gt;60 ngày · cập nhật 26/04, 14:32</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => onNav('debt-list')}><Icon.Users size={14} /> Danh sách công nợ</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất báo cáo</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="metric-panel">
          <div className="lab">Tổng dư nợ</div>
          <div className="val">{(totalDebt / 1000000000).toFixed(2)}<span className="currency"> tỷ ₫</span></div>
          <div className="trend down"><Icon.ArrowUp size={11} /> +3.8% so T3</div>
        </div>
        <div className="metric-panel">
          <div className="lab">Quá hạn &gt; 60 ngày</div>
          <div className="val" style={{ color: 'var(--danger-text)' }}>{((byBucket.T3 + byBucket.T4) / 1000000).toFixed(0)}<span className="currency"> tr ₫</span></div>
          <div className="trend down"><Icon.AlertCircle size={11} /> {overdueCount} KH cần đôn đốc</div>
        </div>
        <div className="metric-panel">
          <div className="lab">Tập trung top 4 KH</div>
          <div className="val">{concentration.toFixed(0)}<span className="currency"> %</span></div>
          <div className="trend down"><Icon.AlertCircle size={11} /> Rủi ro cao · cần đa dạng hoá</div>
        </div>
        <div className="metric-panel">
          <div className="lab">Số KH có nợ</div>
          <div className="val">{customerCount}<span className="currency"> /44</span></div>
          <div className="trend up"><Icon.CheckCircle size={11} /> 6 KH thanh toán hết</div>
        </div>
      </div>

      <div className="card-shell section-gap">
        <div className="card-header">
          <div><h3>Cơ cấu tuổi nợ</h3><p>Phân loại theo tháng quá hạn</p></div>
          <span className="badge badge-outline">T1 = hiện tại · T4 = &gt; 90 ngày</span>
        </div>
        <div className="aging-stack">
          <div className="aging-bar">
            {[['t1', byBucket.T1], ['t2', byBucket.T2], ['t3', byBucket.T3], ['t4', byBucket.T4]].map(([k, v]) => {
              const pct = (v / totalDebt) * 100;
              return (
                <div key={k} className={`seg-${k}`} style={{ width: pct + '%' }}>
                  {pct >= 6 ? `${pct.toFixed(0)}%` : ''}
                </div>
              );
            })}
          </div>
          <div className="aging-legend">
            <div className="ag">
              <div className="ag-label"><span className="ag-dot" style={{ background: '#059669' }} />T1 · Hiện tại</div>
              <div className="ag-value">{formatCompact(byBucket.T1)} ₫<span className="ag-pc">{((byBucket.T1/totalDebt)*100).toFixed(0)}%</span></div>
            </div>
            <div className="ag">
              <div className="ag-label"><span className="ag-dot" style={{ background: '#D97706' }} />T2 · 30 ngày</div>
              <div className="ag-value">{formatCompact(byBucket.T2)} ₫<span className="ag-pc">{((byBucket.T2/totalDebt)*100).toFixed(0)}%</span></div>
            </div>
            <div className="ag">
              <div className="ag-label"><span className="ag-dot" style={{ background: '#EA580C' }} />T3 · 60 ngày</div>
              <div className="ag-value">{formatCompact(byBucket.T3)} ₫<span className="ag-pc">{((byBucket.T3/totalDebt)*100).toFixed(0)}%</span></div>
            </div>
            <div className="ag">
              <div className="ag-label"><span className="ag-dot" style={{ background: '#DC2626' }} />T4 · &gt;90 ngày</div>
              <div className="ag-value">{formatCompact(byBucket.T4)} ₫<span className="ag-pc">{((byBucket.T4/totalDebt)*100).toFixed(0)}%</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="row-2">
        {/* Top 4 — concentration risk */}
        <div className="card-shell">
          <div className="card-header">
            <div><h3>Top 4 KH chiếm {concentration.toFixed(0)}% dư nợ</h3><p>Rủi ro tập trung cần theo dõi sát</p></div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNav('debt-list')} style={{ color: 'var(--brand)' }}>
              Xem tất cả <Icon.ArrowUpRight size={12} />
            </button>
          </div>
          {top4.map((c, i) => (
            <button key={c.id} className="tt-list-row" onClick={() => onOpenCustomer(c)}>
              <div className="row-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand-hover)', fontSize: 12, fontWeight: 700 }}>{c.monogram}</div>
              <div className="row-content">
                <div className="row-headline">
                  <strong>{c.name}</strong>
                  <span className="age-cell">
                    <span className={`age-dot ${c.agingBucket.toLowerCase()}`} />
                    <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{c.agingBucket}</span>
                  </span>
                </div>
                <div className="row-meta">{c.industry} · {c.tripsYTD} chuyến YTD</div>
              </div>
              <div className="row-tail">
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--danger-text)' }}>{formatCompact(c.debt)} ₫</div>
                <div className="tail-tag" style={{ marginTop: 4 }}>{((c.debt/totalDebt)*100).toFixed(0)}% TỔNG</div>
              </div>
            </button>
          ))}
        </div>

        {/* Debt trend */}
        <div className="card-shell">
          <div className="card-header">
            <div><h3>Xu hướng dư nợ 6 tháng</h3><p>Đơn vị: tr ₫</p></div>
          </div>
          <DebtTrendChart data={monthlyDebt} />
        </div>
      </div>
    </>
  );
}

function DebtTrendChart({ data }) {
  const maxV = Math.max(...data.map(d => d.v));
  const minV = Math.min(...data.map(d => d.v));
  const W = 420, H = 200, P = { l: 50, r: 20, t: 16, b: 30 };
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const xFor = (i) => P.l + (i / (data.length - 1)) * innerW;
  const yFor = (v) => P.t + (1 - (v - minV * 0.95) / (maxV - minV * 0.95)) * innerH;
  const path = data.map((d, i) => `${i ? 'L' : 'M'} ${xFor(i)} ${yFor(d.v)}`).join(' ');
  const areaPath = path + ` L ${xFor(data.length-1)} ${H-P.b} L ${P.l} ${H-P.b} Z`;
  return (
    <div className="line-chart" style={{ padding: '12px 16px 4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`}>
        {[0, 0.5, 1].map((t, i) => {
          const y = P.t + t * innerH;
          return <line key={i} x1={P.l} x2={W - P.r} y1={y} y2={y} className="grid-line" />;
        })}
        {[0, 0.5, 1].map((t, i) => (
          <text key={i} x={P.l - 8} y={P.t + t * innerH + 4} className="axis-label" textAnchor="end">{Math.round(maxV - (maxV - minV * 0.95) * t)}</text>
        ))}
        <path d={areaPath} fill="rgba(220,38,38,0.08)" />
        <path d={path} fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xFor(i)} cy={yFor(d.v)} r="3.5" fill="#fff" stroke="#DC2626" strokeWidth="2" />
            <text x={xFor(i)} y={H - 10} className="axis-label" textAnchor="middle">{d.m}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── 07.2 Debt list ────────────────────────────────────────
function DebtList({ onOpenCustomer }) {
  const [tab, setTab] = React.useState('all');
  const [q, setQ] = React.useState('');

  const customers = CUSTOMERS
    .filter(c => c.debt > 0)
    .filter(c => {
      if (tab === 'all') return true;
      if (tab === 't1') return c.agingBucket === 'T1';
      if (tab === 't2') return c.agingBucket === 'T2';
      if (tab === 't3') return c.agingBucket === 'T3' || c.agingBucket === 'T4';
      return true;
    })
    .filter(c => !q || (c.name + ' ' + c.industry).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.debt - a.debt);

  const counts = {
    all: CUSTOMERS.filter(c => c.debt > 0).length,
    t1:  CUSTOMERS.filter(c => c.agingBucket === 'T1').length,
    t2:  CUSTOMERS.filter(c => c.agingBucket === 'T2').length,
    t3:  CUSTOMERS.filter(c => c.agingBucket === 'T3' || c.agingBucket === 'T4').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Danh sách công nợ</h1>
          <p>{customers.length} KH · sắp xếp theo dư nợ giảm dần</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Filter size={14} /> Bộ lọc</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất Excel</button>
          <button className="btn btn-primary"><Icon.Mail size={14} /> Gửi đôn đốc hàng loạt</button>
        </div>
      </div>

      <div className="card-shell">
        <div className="toolbar">
          <div className="input-icon" style={{ maxWidth: 320 }}>
            <Icon.Search />
            <input className="input" placeholder="Tìm khách hàng…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          <div className="tab-row">
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>Tất cả · {counts.all}</button>
            <button className={tab === 't1' ? 'active' : ''}  onClick={() => setTab('t1')}>Hiện tại · {counts.t1}</button>
            <button className={tab === 't2' ? 'active' : ''}  onClick={() => setTab('t2')}>30 ngày · {counts.t2}</button>
            <button className={tab === 't3' ? 'active' : ''}  onClick={() => setTab('t3')}>Quá 60 · {counts.t3}</button>
          </div>
        </div>

        <table className="tt-table">
          <thead>
            <tr>
              <th style={{ width: '32%' }}>Khách hàng</th>
              <th>Tuổi nợ</th>
              <th>Đôn đốc cuối</th>
              <th>Chuyến YTD</th>
              <th style={{ textAlign: 'right' }}>Dư nợ</th>
              <th style={{ textAlign: 'right' }}>DT YTD</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} onClick={() => onOpenCustomer(c)}>
                <td>
                  <div className="partner-cell">
                    <div className="logo">{c.monogram}</div>
                    <div className="meta">
                      <div className="name">{c.name}</div>
                      <div className="sub">{c.industry}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="age-cell">
                    <span className={`age-dot ${c.agingBucket.toLowerCase()}`} />
                    <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{c.agingBucket === 'T1' ? 'Hiện tại' : c.agingBucket === 'T2' ? '30+ ngày' : c.agingBucket === 'T3' ? '60+ ngày' : '90+ ngày'}</span>
                  </span>
                </td>
                <td className="date">{c.debt > 100000000 ? '18/04 · gọi điện' : c.debt > 30000000 ? '14/04 · email' : c.debt > 10000000 ? '02/04 · gọi điện' : '—'}</td>
                <td className="num muted">{c.tripsYTD}</td>
                <td className="num" style={{ color: 'var(--danger-text)', fontSize: 14 }}>{formatNumber(c.debt)} ₫</td>
                <td className="num muted">{formatCompact(c.ytdRevenue)} ₫</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); onOpenCustomer(c); }}>
                    <Icon.Mail size={11} /> Đôn đốc
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-pad">Không có KH nào khớp</div></td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── 07.3 Customer detail (with 07.4 dunning + 07.5 export modals) ──
function CustomerDetail({ customer, onBack }) {
  const [showDunning, setShowDunning] = React.useState(false);
  const [showExport,  setShowExport]  = React.useState(false);

  if (!customer) return null;

  // Build a ledger — mock transactions
  const ledger = [
    { date: '01/01/26', desc: 'Số dư đầu năm',                  ref: '—',          debit: 0,         credit: 0,        balance: 480000000 },
    { date: '08/01/26', desc: 'HĐ cước · 12 chuyến T1',         ref: 'HD/01-088',  debit: 168000000, credit: 0,        balance: 648000000 },
    { date: '22/01/26', desc: 'Thanh toán đợt 1',               ref: 'BC/01-201',  debit: 0,         credit: 100000000, balance: 548000000 },
    { date: '07/02/26', desc: 'HĐ cước · 14 chuyến T2',         ref: 'HD/02-110',  debit: 192000000, credit: 0,        balance: 740000000 },
    { date: '28/02/26', desc: 'Thanh toán đợt 2',               ref: 'BC/02-318',  debit: 0,         credit: 80000000,  balance: 660000000 },
    { date: '10/03/26', desc: 'HĐ cước · 16 chuyến T3',         ref: 'HD/03-142',  debit: 220000000, credit: 0,        balance: 880000000 },
    { date: '28/03/26', desc: 'Thanh toán đợt 3',               ref: 'BC/03-410',  debit: 0,         credit: 130000000, balance: 750000000 },
    { date: '08/04/26', desc: 'HĐ cước · 18 chuyến T4',         ref: 'HD/04-178',  debit: 248000000, credit: 0,        balance: 998000000 },
    { date: '22/04/26', desc: 'Thanh toán đợt 4 (một phần)',    ref: 'BC/04-552',  debit: 0,         credit: 320000000, balance: 678000000 },
  ];
  const ytdInvoiced = ledger.reduce((s, l) => s + l.debit, 0);
  const ytdPaid     = ledger.reduce((s, l) => s + l.credit, 0);

  const dunning = [
    { kind: 'call', title: 'Gọi điện Mr. Hùng',     sub: 'Hứa thanh toán 50% trong tuần sau · ghi chú: lý do dòng tiền T4',  time: '14:18 · 18/04' },
    { kind: 'mail', title: 'Email báo cáo công nợ T3', sub: 'Gửi cho hung@nitoda.vn · Chị Hoa CC',  time: '09:30 · 11/04' },
    { kind: 'call', title: 'Gọi điện nhắc lịch trả', sub: 'Không bắt máy · để lại tin nhắn Zalo', time: '15:42 · 04/04' },
    { kind: 'doc',  title: 'Gửi công văn nhắc nợ chính thức', sub: 'Số 24/CV-NEPO · ký bởi Ô. Phụng',  time: '10:00 · 28/03' },
    { kind: 'mail', title: 'Email báo cáo công nợ T2', sub: 'Đã đọc · không phản hồi',           time: '09:30 · 09/03' },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon.ArrowLeft size={14} /> Danh sách công nợ</button>
        <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>/</span>
        <span style={{ color: 'var(--fg-2)', fontSize: 12 }}>{customer.name}</span>
      </div>

      <div className="customer-card">
        <div className="logo">{customer.monogram}</div>
        <div className="info">
          <h1>{customer.name}</h1>
          <div className="meta">
            <span><strong>Ngành:</strong> {customer.industry}</span>
            <span><strong>Liên hệ:</strong> {customer.contact}</span>
            <span><strong>Chuyến YTD:</strong> {customer.tripsYTD}</span>
          </div>
        </div>
        <div className="debt">
          <div className="lab">Dư nợ hiện tại</div>
          <div className="val">{formatNumber(customer.debt)} ₫</div>
          <div style={{ marginTop: 6 }}>
            <span className="age-cell">
              <span className={`age-dot ${customer.agingBucket.toLowerCase()}`} />
              <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Tuổi nợ {customer.agingBucket}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="kpi-grid cols-3">
        <div className="metric-panel">
          <div className="lab">Tổng xuất hoá đơn YTD</div>
          <div className="val" style={{ fontSize: 22 }}>{formatCompact(ytdInvoiced)}<span className="currency"> ₫</span></div>
        </div>
        <div className="metric-panel">
          <div className="lab">Tổng đã thu YTD</div>
          <div className="val" style={{ fontSize: 22, color: 'var(--brand-hover)' }}>{formatCompact(ytdPaid)}<span className="currency"> ₫</span></div>
        </div>
        <div className="metric-panel">
          <div className="lab">Doanh thu YTD</div>
          <div className="val" style={{ fontSize: 22 }}>{formatCompact(customer.ytdRevenue)}<span className="currency"> ₫</span></div>
        </div>
      </div>

      <div className="row-3" style={{ gridTemplateColumns: '1.7fr 1fr' }}>
        {/* Ledger */}
        <div className="card-shell">
          <div className="card-header">
            <div><h3>Sổ chi tiết nợ/có</h3><p>{ledger.length} giao dịch từ đầu năm</p></div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowExport(true)}>
              <Icon.Download size={11} /> Xuất báo cáo nợ
            </button>
          </div>
          <table className="tt-table">
            <thead>
              <tr>
                <th style={{ width: 92 }}>Ngày</th>
                <th>Diễn giải</th>
                <th>Chứng từ</th>
                <th style={{ textAlign: 'right' }}>Nợ (₫)</th>
                <th style={{ textAlign: 'right' }}>Có (₫)</th>
                <th style={{ textAlign: 'right' }}>Số dư</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((l, i) => (
                <tr key={i} className="ledger-row" style={{ cursor: 'default' }}>
                  <td className="date">{l.date}</td>
                  <td style={{ color: 'var(--fg-1)', fontSize: 13 }}>{l.desc}</td>
                  <td><span className="container-no">{l.ref}</span></td>
                  <td className="debit">{l.debit > 0 ? formatNumber(l.debit) : '—'}</td>
                  <td className="credit">{l.credit > 0 ? formatNumber(l.credit) : '—'}</td>
                  <td className="balance">{formatNumber(l.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dunning history */}
        <div className="card-shell">
          <div className="card-header">
            <div><h3>Lịch sử đôn đốc</h3><p>{dunning.length} lần · lần cuối {dunning[0].time}</p></div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowDunning(true)}>
              <Icon.Plus size={11} /> Ghi nhận
            </button>
          </div>
          <div className="dunning-list">
            {dunning.map((d, i) => (
              <div key={i} className={`dunning-item kind-${d.kind}`}>
                <div className="dn-icon">
                  {d.kind === 'call' ? <Icon.Phone /> : d.kind === 'mail' ? <Icon.Mail /> : <Icon.FileText />}
                </div>
                <div className="dn-text">
                  <div style={{ fontWeight: 600 }}>{d.title}</div>
                  <div className="sub">{d.sub}</div>
                </div>
                <div className="dn-time">{d.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDunning ? <DunningModal customer={customer} onClose={() => setShowDunning(false)} /> : null}
      {showExport  ? <ExportDebtModal customer={customer} onClose={() => setShowExport(false)} /> : null}
    </>
  );
}

// ── 07.4 Dunning modal ────────────────────────────────────
function DunningModal({ customer, onClose }) {
  const [kind, setKind] = React.useState('call');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Ghi nhận đôn đốc</h3>
            <p>{customer.name} · {formatNumber(customer.debt)} ₫ · tuổi nợ {customer.agingBucket}</p>
          </div>
          <button className="modal-close" onClick={onClose}><Icon.X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row cols-1">
            <div className="field">
              <label>Loại đôn đốc</label>
              <div className="tab-row" style={{ marginTop: 0 }}>
                <button className={kind === 'call' ? 'active' : ''} onClick={() => setKind('call')}><Icon.Phone size={11} style={{ marginRight: 4 }} />Gọi điện</button>
                <button className={kind === 'mail' ? 'active' : ''} onClick={() => setKind('mail')}><Icon.Mail size={11} style={{ marginRight: 4 }} />Email</button>
                <button className={kind === 'sms'  ? 'active' : ''} onClick={() => setKind('sms')}><Icon.MessageSquare size={11} style={{ marginRight: 4 }} />Zalo / SMS</button>
                <button className={kind === 'doc'  ? 'active' : ''} onClick={() => setKind('doc')}><Icon.FileText size={11} style={{ marginRight: 4 }} />Công văn</button>
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Người liên hệ</label>
              <input className="input" defaultValue={customer.contact.split(' — ')[0]} />
            </div>
            <div className="field">
              <label>Số điện thoại / Email</label>
              <input className="input" defaultValue={customer.contact.split(' — ')[1] || ''} />
            </div>
          </div>
          <div className="form-row cols-1">
            <div className="field">
              <label>Kết quả &amp; ghi chú</label>
              <textarea className="input" style={{ height: 90, padding: 12, lineHeight: 1.5 }} placeholder="VD: Đã trao đổi với Mr. Hùng, KH hứa thanh toán 50% trong tuần sau. Lý do: dòng tiền T4 chậm…" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Ngày hẹn thanh toán</label>
              <input className="input" placeholder="dd/mm/yyyy" />
            </div>
            <div className="field">
              <label>Số tiền hẹn (₫)</label>
              <input className="input" placeholder="0" />
            </div>
          </div>
          <div className="form-row cols-1">
            <div className="field">
              <label>File đính kèm (tuỳ chọn)</label>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', height: 38, justifyContent: 'flex-start' }}>
                <Icon.Plus size={12} /> Tải lên file công văn, email, biên bản…
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <span className="left-note">Lịch sử sẽ được ghi nhận và đồng bộ cho Giám đốc</span>
          <button className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary"><Icon.Save size={14} /> Lưu đôn đốc</button>
        </div>
      </div>
    </div>
  );
}

// ── 07.5 Export debt report modal ─────────────────────────
function ExportDebtModal({ customer, onClose }) {
  const [format, setFormat] = React.useState('pdf');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Xuất báo cáo công nợ</h3>
            <p>{customer.name} · dư nợ {formatNumber(customer.debt)} ₫</p>
          </div>
          <button className="modal-close" onClick={onClose}><Icon.X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row cols-1">
            <div className="field">
              <label>Định dạng</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button className="alert-tile tone-info" style={{ cursor: 'pointer', borderColor: format === 'pdf' ? 'var(--brand)' : null }} onClick={() => setFormat('pdf')}>
                  <div className="at-icon"><Icon.FileText /></div>
                  <div className="at-body">
                    <div className="at-headline"><strong>PDF (gửi KH)</strong></div>
                    <div className="at-meta">In ấn · đính kèm email</div>
                  </div>
                </button>
                <button className="alert-tile tone-success" style={{ cursor: 'pointer', borderColor: format === 'xlsx' ? 'var(--brand)' : null }} onClick={() => setFormat('xlsx')}>
                  <div className="at-icon"><Icon.BarChart /></div>
                  <div className="at-body">
                    <div className="at-headline"><strong>Excel (nội bộ)</strong></div>
                    <div className="at-meta">Tiện đối soát · sao chép số liệu</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Từ ngày</label>
              <input className="input" defaultValue="01/01/2026" />
            </div>
            <div className="field">
              <label>Đến ngày</label>
              <input className="input" defaultValue="26/04/2026" />
            </div>
          </div>
          <div className="form-row cols-1">
            <div className="field">
              <label>Nội dung kèm theo</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                {['Bảng giao dịch chi tiết (nợ/có)', 'Tổng kết theo tháng', 'Lịch sử đôn đốc', 'Bảng kê hoá đơn cước', 'Ghi chú từ kế toán'].map((opt, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked={i < 3} style={{ accentColor: 'var(--brand)' }} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-help-banner" style={{ marginTop: 4, marginBottom: 0 }}>
            <Icon.AlertCircle />
            <span>Báo cáo có logo NEPO + thông tin đối tác (ký bởi Ô. Phụng) · phù hợp gửi KH.</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary"><Icon.Download size={14} /> Tạo &amp; tải xuống</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DebtOverview, DebtList, CustomerDetail, DunningModal, ExportDebtModal });
