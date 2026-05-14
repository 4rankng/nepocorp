/* eslint-disable */
// Trips — 03.1 Trip log, 03.3 New trip form (modal), 03.4 Trip detail.

// ── 03.1 Trip log — big table of all trips across 4 trucks ──
function TripLog({ onOpenTrip, onNew }) {
  const [tab, setTab]   = React.useState('all');
  const [truck, setTruck] = React.useState('all');
  const [q, setQ]       = React.useState('');

  const rows = TRIPS;

  const filtered = rows
    .filter(r => tab === 'all'
      || (tab === 'running' && r.status === 'running')
      || (tab === 'done'    && r.status === 'done')
      || (tab === 'warn'    && r.warning))
    .filter(r => truck === 'all' || r.plate === truck)
    .filter(r => {
      if (!q) return true;
      const blob = (r.id + ' ' + r.driver + ' ' + r.route.join(' ') + ' ' + r.customer + ' ' + r.containerNo).toLowerCase();
      return blob.includes(q.toLowerCase());
    });

  // Compute totals from filtered
  const totals = filtered.reduce((s, r) => ({
    km:  s.km  + r.km,
    fuel: s.fuel + r.fuel,
    rev:  s.rev + r.revenue,
    cost: s.cost + r.cost,
  }), { km: 0, fuel: 0, rev: 0, cost: 0 });
  const profit = totals.rev - totals.cost;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Sổ chuyến đi</h1>
          <p>Toàn bộ chuyến của 4 xe · Tháng 4, 2026 · {filtered.length} chuyến</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Filter size={14} /> Bộ lọc nâng cao</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất Excel</button>
          <button className="btn btn-primary" onClick={onNew}><Icon.Plus size={14} /> Ghi chuyến mới</button>
        </div>
      </div>

      {/* Summary band */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
        <div className="metric-panel">
          <div className="lab">Tổng km</div>
          <div className="val" style={{ fontSize: 24 }}>{formatNumber(totals.km)}<span className="currency"> km</span></div>
        </div>
        <div className="metric-panel">
          <div className="lab">Tổng dầu</div>
          <div className="val" style={{ fontSize: 24 }}>{formatNumber(totals.fuel)}<span className="currency"> L</span></div>
        </div>
        <div className="metric-panel">
          <div className="lab">Doanh thu</div>
          <div className="val" style={{ fontSize: 24 }}>{formatCompact(totals.rev)}<span className="currency"> ₫</span></div>
        </div>
        <div className="metric-panel">
          <div className="lab">LN gộp</div>
          <div className="val" style={{ fontSize: 24, color: profit >= 0 ? 'var(--brand-hover)' : 'var(--danger-text)' }}>{formatCompact(profit)}<span className="currency"> ₫</span></div>
        </div>
      </div>

      <div className="card-shell">
        <div className="toolbar">
          <div className="input-icon" style={{ maxWidth: 280 }}>
            <Icon.Search />
            <input className="input" placeholder="Tìm KH, tài xế, số cont, ID chuyến…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Xe</span>
            <div className="tab-row">
              <button className={truck === 'all' ? 'active' : ''} onClick={() => setTruck('all')}>Tất cả</button>
              {FLEET.map(f => (
                <button key={f.plate} className={truck === f.plate ? 'active' : ''} onClick={() => setTruck(f.plate)}>{f.plate}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="tab-row">
            <button className={tab === 'all' ? 'active' : ''}    onClick={() => setTab('all')}>Tất cả</button>
            <button className={tab === 'running' ? 'active' : ''} onClick={() => setTab('running')}>Đang chạy</button>
            <button className={tab === 'done' ? 'active' : ''}   onClick={() => setTab('done')}>Hoàn thành</button>
            <button className={tab === 'warn' ? 'active' : ''}   onClick={() => setTab('warn')}>Có cảnh báo</button>
          </div>
        </div>

        <table className="tt-table dense">
          <thead>
            <tr>
              <th style={{ width: 92 }}>ID</th>
              <th style={{ width: 64 }}>Ngày</th>
              <th>Xe / Tài xế</th>
              <th>Tuyến · Khách hàng</th>
              <th style={{ textAlign: 'right' }}>Km</th>
              <th style={{ textAlign: 'right' }}>Dầu (L)</th>
              <th style={{ textAlign: 'right' }}>TTBQ</th>
              <th style={{ textAlign: 'right' }}>Doanh thu</th>
              <th style={{ textAlign: 'right' }}>LN gộp</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const ln = r.revenue - r.cost;
              const isOver = r.warning === 'fuel-over';
              return (
                <tr key={r.id} onClick={() => onOpenTrip(r)}>
                  <td><span className="container-no" style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{r.id}</span></td>
                  <td className="date">{r.date}</td>
                  <td>
                    <div className="driver-cell">
                      <span className="av"><Icon.Truck size={13} /></span>
                      <span className="nm">{r.plate}<div style={{ color: 'var(--fg-3)', fontSize: 11, marginTop: 1 }}>{r.driver}</div></span>
                    </div>
                  </td>
                  <td>
                    <div className="route" style={{ fontWeight: 500 }}>{r.route[0]} <span className="arrow">→</span> {r.route[1]}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{r.customer} · {r.cargo}</div>
                  </td>
                  <td className="num">{r.km}</td>
                  <td className="num">{r.fuel}</td>
                  <td className={`num ${isOver ? 'fuel-over' : ''}`}>
                    {isOver ? <span className="warn-cell"><Icon.AlertCircle size={12} />{r.ttbq.toFixed(1)}</span> : r.ttbq.toFixed(1)}
                  </td>
                  <td className="num">{formatNumber(r.revenue)}</td>
                  <td className="num" style={{ color: ln >= 0 ? 'var(--fg-1)' : 'var(--danger-text)' }}>{formatNumber(ln)}</td>
                  <td>
                    {r.warning === 'fuel-over'  ? <span className="badge badge-danger"><span className="dot" />Vượt định mức</span>
                    : r.warning === 'no-receipt' ? <span className="badge badge-warning"><span className="dot" />Thiếu HĐ dầu</span>
                    : r.status === 'running'     ? <span className="badge badge-brand"><span className="dot" />Đang chạy</span>
                    :                              <span className="badge badge-success"><span className="dot" />Hoàn thành</span>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-pad">Không có chuyến nào khớp bộ lọc</div></td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── 03.4 Trip detail ──────────────────────────────────────
function TripDetail({ trip, onBack }) {
  if (!trip) return null;
  const ln = trip.revenue - trip.cost;
  // Decompose costs (proportional approximation)
  const fuelCost = trip.fuelCost;
  const allowance = Math.round(trip.cost * 0.30);
  const salary    = Math.round(trip.cost * 0.18);
  const other     = trip.cost - fuelCost - allowance - salary;
  const otherSafe = other > 0 ? other : 0;

  const truck = FLEET.find(f => f.plate === trip.plate);

  const timeline = [
    { state: 'done', title: 'Tạo lệnh',         sub: 'Kế toán · ' + trip.customer,  time: '07:42' },
    { state: 'done', title: 'Phân xe',          sub: trip.plate + ' · ' + trip.driver,  time: '07:55' },
    { state: 'done', title: 'Xác nhận lệnh',    sub: 'Tài xế xác nhận lịch trình', time: '08:10' },
    { state: trip.status === 'running' ? 'now' : 'done', title: 'Bắt đầu chuyến', sub: 'Tại depot Hải Phòng', time: trip.status === 'running' ? '08:34 · đang chạy' : '08:34' },
    { state: trip.status === 'running' ? 'todo' : 'done', title: 'Hoàn thành',     sub: 'Đến điểm giao hàng', time: trip.status === 'running' ? '— ETA 16:40' : '14:22' },
    { state: trip.status === 'running' ? 'todo' : 'done', title: 'Đóng phiếu',     sub: 'Upload ảnh container · seal', time: trip.status === 'running' ? '—' : '14:48' },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}><Icon.ArrowLeft size={14} /> Sổ chuyến đi</button>
        <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>/</span>
        <span className="container-no" style={{ color: 'var(--fg-2)' }}>{trip.id}</span>
      </div>

      <div className="detail-header">
        <div className="left">
          <h1>{trip.route[0]} <span style={{ color: 'var(--fg-3)' }}>→</span> {trip.route[1]}</h1>
          <div className="sub">
            <span className="id">{trip.id}</span>
            <span>{trip.date} · {trip.cargo}</span>
            <span>·</span>
            <span>{trip.customer}</span>
          </div>
        </div>
        <div className="right">
          {trip.warning === 'fuel-over'   ? <span className="badge badge-danger"><span className="dot" />Vượt định mức dầu</span>
          : trip.warning === 'no-receipt' ? <span className="badge badge-warning"><span className="dot" />Thiếu HĐ dầu</span>
          : trip.status === 'running'     ? <span className="badge badge-brand"><span className="dot" />Đang chạy</span>
          :                                 <span className="badge badge-success"><span className="dot" />Hoàn thành</span>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm"><Icon.Edit size={12} /> Chỉnh sửa</button>
            <button className="btn btn-secondary btn-sm"><Icon.Download size={12} /> Xuất phiếu</button>
          </div>
        </div>
      </div>

      <div className="detail-grid section-gap">
        {/* Left: timeline */}
        <div className="card-shell">
          <div className="card-header">
            <div><h3>Tiến trình chuyến</h3><p>Trạng thái hiện tại · {trip.status === 'running' ? 'Đang chạy' : 'Hoàn thành'}</p></div>
          </div>
          <div className="timeline">
            {timeline.map((t, i) => (
              <div key={i} className={`timeline-row ${t.state}`}>
                <div className="tl-dot">{t.state === 'done' ? <Icon.CheckCircle /> : t.state === 'now' ? <Icon.Clock /> : null}</div>
                <div>
                  <div className="tl-title">{t.title}</div>
                  <div className="tl-sub">{t.sub}</div>
                </div>
                <div className="tl-time">{t.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: vehicle + driver + cargo */}
        <div className="stack">
          <div className="card-shell">
            <div className="card-header"><h3>Xe &amp; tài xế</h3></div>
            <div style={{ padding: '14px 20px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div className="lab" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Biển số</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--fg-1)', marginTop: 4 }}>{trip.plate}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>Rơ-mooc {truck?.type || '40\''}</div>
              </div>
              <div>
                <div className="lab" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Tài xế</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-1)', marginTop: 4 }}>{trip.driver}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{truck?.phone}</div>
              </div>
              <div>
                <div className="lab" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Số container</div>
                <div className="container-no" style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-1)', marginTop: 4 }}>{trip.containerNo}</div>
              </div>
              <div>
                <div className="lab" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Loại hàng</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-1)', marginTop: 4 }}>{trip.cargo}</div>
              </div>
            </div>
          </div>

          <div className="card-shell">
            <div className="card-header"><h3>Vận hành</h3></div>
            <div style={{ padding: '14px 20px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div className="lab" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Số km</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--fg-1)', marginTop: 4 }}>{trip.km} km</div>
              </div>
              <div>
                <div className="lab" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Dầu đổ</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--fg-1)', marginTop: 4 }}>{trip.fuel} L</div>
              </div>
              <div>
                <div className="lab" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>TTBQ thực tế</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, marginTop: 4, color: trip.warning === 'fuel-over' ? 'var(--danger-text)' : 'var(--fg-1)' }}>
                  {trip.ttbq.toFixed(1)} L/100km
                  {trip.warning === 'fuel-over' ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500 }}>(định mức 31)</span> : null}
                </div>
              </div>
              <div>
                <div className="lab" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Định mức</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--fg-1)', marginTop: 4 }}>{trip.route[1] === 'Mộc Châu' || trip.route[1] === 'Sa Pa' || trip.route[1] === 'Sơn La' || trip.route[1] === 'Lai Châu' ? '34 + 3' : '31'} L/100km</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Cost breakdown */}
        <div className="card-shell">
          <div className="card-header"><h3>Chi phí &amp; lợi nhuận</h3></div>
          <table className="cost-table">
            <tbody>
              <tr><td>Cước vận chuyển</td><td style={{ color: 'var(--brand-hover)' }}>+ {formatNumber(trip.revenue)} ₫</td></tr>
              <tr><td>Tiền dầu ({trip.fuel} L × 18.730)</td><td>− {formatNumber(fuelCost)} ₫</td></tr>
              <tr><td>Tiền đi đường lái xe</td><td>− {formatNumber(allowance)} ₫</td></tr>
              <tr><td>Lương lái xe (phân bổ)</td><td>− {formatNumber(salary)} ₫</td></tr>
              <tr><td>Sửa chữa · lốp · dầu máy</td><td>− {formatNumber(otherSafe)} ₫</td></tr>
              <tr className="total"><td>Tổng chi phí</td><td>− {formatNumber(trip.cost)} ₫</td></tr>
              <tr className="profit"><td>LN gộp chuyến</td><td>{formatNumber(ln)} ₫</td></tr>
            </tbody>
          </table>
        </div>

        {/* Photos & docs */}
        <div className="card-shell">
          <div className="card-header">
            <div><h3>Hình ảnh &amp; chứng từ</h3><p>{trip.cargo === 'Chè xuất khẩu' ? 'Bắt buộc ảnh container + seal' : 'Tuỳ chọn'}</p></div>
            <button className="btn btn-secondary btn-sm"><Icon.Plus size={12} /> Tải lên</button>
          </div>
          <div className="photo-strip">
            <div className="photo-tile has-img">
              <Icon.Camera size={22} />
              <div className="ph-tag">CONT 01</div>
            </div>
            <div className="photo-tile has-img" style={{ background: 'linear-gradient(135deg, #052E29 0%, #034E40 50%, #047857 100%)' }}>
              <Icon.Camera size={22} />
              <div className="ph-tag">SEAL</div>
            </div>
            <div className="photo-tile has-img" style={{ background: 'linear-gradient(135deg, #14532D 0%, #166534 50%, #15803D 100%)' }}>
              <Icon.FileText size={22} />
              <div className="ph-tag">HĐ DẦU</div>
            </div>
            <div className="photo-tile">
              <Icon.Plus />
              <div>Thêm ảnh</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 03.3 New trip — modal/full-screen sheet ───────────────
function NewTripSheet({ onClose }) {
  const [plate, setPlate] = React.useState('15C-180.99');
  const [routeId, setRouteId] = React.useState('R03');
  const [km, setKm] = React.useState('96');
  const [fuel, setFuel] = React.useState('33');
  const [cargo, setCargo] = React.useState('Hàng chung');

  const route = ROUTES.find(r => r.id === routeId);
  const fuelCost = (parseInt(fuel) || 0) * 18730;
  const ttbq = parseInt(km) > 0 ? ((parseInt(fuel) || 0) / parseInt(km)) * 100 : 0;
  const quota = FUEL_QUOTA.find(q => q.plate === plate)?.mixHeavy || 34;
  const isOver = ttbq > quota;
  const allowance = route ? route.rate40 : 0;
  const totalCost = fuelCost + allowance;
  const revenue = route ? route.rate40 : 0;
  const profit = revenue - totalCost;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Ghi chuyến mới</h3>
            <p>Nhập 6 trường chính · hệ thống tự tính chi phí và TTBQ</p>
          </div>
          <button className="modal-close" onClick={onClose}><Icon.X size={16} /></button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          <div className="form-shell">
            <div className="form-help-banner">
              <Icon.AlertCircle />
              <span>Nhập <strong>xe · tuyến · km · dầu</strong>; tiền đi đường, chi phí dầu và TTBQ sẽ được tính tự động.</span>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Xe</label>
                <select className="input" value={plate} onChange={e => setPlate(e.target.value)}>
                  {FLEET.map(f => <option key={f.plate} value={f.plate}>{f.plate} · {f.driver}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Ngày</label>
                <input className="input" defaultValue="26/04/2026" />
              </div>
            </div>

            <div className="form-row cols-1">
              <div className="field">
                <label>Tuyến đường</label>
                <select className="input" value={routeId} onChange={e => setRouteId(e.target.value)}>
                  {ROUTES.map(r => <option key={r.id} value={r.id}>{r.from} → {r.to} · {r.km}km · {formatNumber(r.rate40)} ₫</option>)}
                </select>
              </div>
            </div>

            <div className="form-row cols-3">
              <div className="field">
                <label>Số km</label>
                <input className="input" value={km} onChange={e => setKm(e.target.value)} />
              </div>
              <div className="field">
                <label>Số lít dầu</label>
                <input className="input" value={fuel} onChange={e => setFuel(e.target.value)} />
              </div>
              <div className="field">
                <label>Loại rơ-mooc</label>
                <select className="input" defaultValue="40">
                  <option value="40">Rơ-mooc 40'</option>
                  <option value="20">Rơ-mooc 20'</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label>Loại hàng</label>
                <select className="input" value={cargo} onChange={e => setCargo(e.target.value)}>
                  <option>Hàng chung</option>
                  <option>Chè xuất khẩu</option>
                  <option>Vietsun (hãng tàu)</option>
                  <option>Cont rỗng</option>
                </select>
              </div>
              <div className="field">
                <label>Số container</label>
                <input className="input" placeholder="VD: HLBU 4490371" />
              </div>
            </div>

            <div className="form-row cols-1">
              <div className="field">
                <label>Diễn giải (tuỳ chọn)</label>
                <input className="input" placeholder="Ghi chú thêm cho chuyến này…" />
              </div>
            </div>

            <h4 style={{ margin: '14px 0 10px', fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Hệ thống tự tính</h4>
            <div className="form-row cols-3" style={{ marginBottom: 0 }}>
              <div className={`computed-card ${isOver ? 'warn' : 'ok'}`}>
                <div className="cc-label">{isOver ? 'TTBQ vượt định mức' : 'TTBQ trong định mức'}</div>
                <div className="cc-value">{ttbq.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 500 }}>L/100km · ĐM {quota}</span></div>
              </div>
              <div className="computed-card">
                <div className="cc-label">Chi phí dầu</div>
                <div className="cc-value">{formatCompact(fuelCost)} ₫</div>
              </div>
              <div className="computed-card">
                <div className="cc-label">Tiền đi đường</div>
                <div className="cc-value">{formatCompact(allowance)} ₫</div>
              </div>
            </div>
            <div className="form-row cols-2" style={{ marginTop: 12, marginBottom: 0 }}>
              <div className="computed-card">
                <div className="cc-label">Cước vận chuyển (gợi ý)</div>
                <div className="cc-value">{formatCompact(revenue)} ₫</div>
              </div>
              <div className={`computed-card ${profit >= 0 ? 'ok' : 'warn'}`}>
                <div className="cc-label">LN gộp dự kiến</div>
                <div className="cc-value">{profit >= 0 ? '+ ' : '− '}{formatCompact(Math.abs(profit))} ₫</div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-footer">
          <span className="left-note"><Icon.Clock size={11} /> Tự động lưu nháp</span>
          <button className="btn btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary"><Icon.Save size={14} /> Lưu chuyến</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TripLog, TripDetail, NewTripSheet });
