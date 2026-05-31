import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../lib/format';
import { TxnType } from '@nepocorp/shared';
import type { CustomerStatement, LedgerEntry, AgingBucket } from '@nepocorp/shared';
import { AlertTriangle, Download, FileSpreadsheet, FileText, Phone, Building2, ArrowLeft } from 'lucide-react';
import { useCustomerStatement } from '../hooks/useQueries';
import { getInitials } from '../lib/avatar';

// ── Txn type label + pill variant ──────────────────────────────────────────

const TXN_META: Record<string, { label: string; pill: string }> = {
  [TxnType.TRIP_REVENUE]:      { label: 'DOANH THU CHUYẾN', pill: 'dd-txn-pill dd-txn-pill--rev' },
  [TxnType.PAYMENT_RECEIVED]:  { label: 'THU TIỀN',         pill: 'dd-txn-pill dd-txn-pill--pay' },
  [TxnType.PENALTY]:           { label: 'PHẠT',             pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.MANAGEMENT_FEE]:    { label: 'PHÍ QUẢN LÝ',     pill: 'dd-txn-pill dd-txn-pill--other' },
  [TxnType.ADJUSTMENT]:        { label: 'ĐIỀU CHỈNH',      pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.DRIVER_SALARY]:     { label: 'LƯƠNG TÀI XẾ',    pill: 'dd-txn-pill dd-txn-pill--other' },
};
const DEFAULT_META = { label: 'KHÁC', pill: 'dd-txn-pill dd-txn-pill--other' };

// ── Aging constants ────────────────────────────────────────────────────────

const AGING_RANGES = [
  { label: '0–30 NGÀY',  dotColor: 'var(--accent)',  index: 0 },
  { label: '31–60 NGÀY', dotColor: 'var(--warning)', index: 1 },
  { label: '61–90 NGÀY', dotColor: '#D97706',        index: 2 },
  { label: 'TRÊN 90 NGÀY', dotColor: 'var(--danger)', index: 3 },
] as const;

// ── Ledger filter type ─────────────────────────────────────────────────────

type LedgerFilter = 'all' | typeof TxnType.PAYMENT_RECEIVED | typeof TxnType.ADJUSTMENT | typeof TxnType.TRIP_REVENUE;

const FILTER_OPTIONS: { key: LedgerFilter; label: string }[] = [
  { key: 'all',              label: 'Tất cả' },
  { key: TxnType.PAYMENT_RECEIVED, label: 'Thu tiền' },
  { key: TxnType.ADJUSTMENT,       label: 'Điều chỉnh' },
  { key: TxnType.TRIP_REVENUE,     label: 'Doanh thu' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

// Map backend agingBuckets (ordered 0→90+) to fixed 4-slot array
function normalizeAging(buckets: AgingBucket[]): number[] {
  const amounts = [0, 0, 0, 0];
  buckets.forEach((b, i) => {
    if (i < 4) amounts[i] = b.amount;
  });
  return amounts;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: statement, isLoading: loading, error: queryError, refetch } = useCustomerStatement(id);
  const error = queryError ? (queryError as Error).message : null;

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── Derived data ────────────────────────────────────────────────────────

  const agingAmounts = useMemo(() =>
    normalizeAging(statement?.agingBuckets ?? []),
    [statement?.agingBuckets]
  );

  const filteredRows = useMemo(() => {
    if (!statement) return [];
    if (ledgerFilter === 'all') return statement.ledgerRows;
    return statement.ledgerRows.filter(r => r.txn_type === ledgerFilter);
  }, [statement, ledgerFilter]);

  const activeAgingIdx = useMemo(() => {
    let max = -1, idx = 0;
    agingAmounts.forEach((a, i) => { if (a > max) { max = a; idx = i; } });
    return max > 0 ? idx : -1;
  }, [agingAmounts]);

  const totalOutstanding = statement?.totalOutstanding ?? 0;

  // ── Loading / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div>
        <div className="dd-header">
          <button className="dd-back" onClick={() => navigate('/debt')}>
            <ArrowLeft size={20} />
          </button>
          <div className="dd-meta">
            <h1>Sổ kế toán</h1>
          </div>
        </div>
        <div className="dd-summary">
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error || 'Không tìm thấy dữ liệu'}</p>
        </div>
      </div>
    );
  }

  const { customer, ledgerRows } = statement;
  const initials = getInitials(customer.name);
  const hasDebt = totalOutstanding > 0;
  const agingTotal = agingAmounts.reduce((s, a) => s + a, 0) || 1; // avoid /0

  return (
    <div>
      {/* ── Customer Header ─────────────────────────────────────────────── */}
      <div className="dd-header">
        <button className="dd-back" onClick={() => navigate('/debt')}>
          <ArrowLeft size={20} />
        </button>
        <div className="dd-avatar">{initials}</div>
        <div className="dd-meta">
          <h1>{customer.name}</h1>
          <div className="dd-sub">
            {customer.contact_info && (
              <span>
                <Phone size={15} />
                <span className="dd-mono">{customer.contact_info}</span>
              </span>
            )}
            <span>
              <Building2 size={15} />
              Khách hàng doanh nghiệp
            </span>
            {hasDebt ? (
              <span className="dd-tag dd-tag--warn dd-tag--dot">Còn nợ trong hạn</span>
            ) : (
              <span className="dd-tag dd-tag--ok dd-tag--dot">Đã thanh toán đủ</span>
            )}
          </div>
        </div>
        <div className="dd-actions">
          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn--secondary"
              onClick={() => setShowExportMenu(v => !v)}
            >
              <Download size={14} />
              Xuất sao kê
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 8, boxShadow: 'var(--sh-lg)',
                zIndex: 50, minWidth: 180, overflow: 'hidden',
              }}>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--fg-1)' }}
                  onClick={() => { setShowExportMenu(false); window.open(`/api/ledger/customers/${id}/statement/export?format=xlsx`, '_blank'); }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileSpreadsheet size={14} style={{ color: '#16a34a' }} />
                  Excel (.xlsx)
                </button>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--fg-1)' }}
                  onClick={() => { setShowExportMenu(false); window.open(`/api/ledger/customers/${id}/statement/export?format=pdf`, '_blank'); }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileText size={14} style={{ color: '#dc2626' }} />
                  PDF (In)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Card ────────────────────────────────────────────────── */}
      <section className="dd-summary">
        <div className="dd-sum-top">
          <div>
            <div className="dd-sum-label">TỔNG CỘNG NỢ</div>
            <div className={`dd-sum-total ${hasDebt ? '' : ' dd-sum-total--clear'}`}>
              {hasDebt
                ? <>{formatCurrency(totalOutstanding).replace(' ₫', '')}<span className="dd-cur">đ</span></>
                : <>0<span className="dd-cur">đ</span></>
              }
            </div>
            {hasDebt && (
              <div className="dd-sum-note">
                <AlertTriangle size={17} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                {activeAgingIdx <= 0
                  ? 'Toàn bộ công nợ đang trong hạn 30 ngày — cần theo dõi thu hồi.'
                  : `Có công nợ quá hạn ${AGING_RANGES[activeAgingIdx].label.toLowerCase()} — cần ưu tiên thu hồi.`
                }
              </div>
            )}
          </div>
          <div className="dd-sum-update">
            Cập nhật lần cuối
            <b>{new Date().toLocaleDateString('vi-VN')}</b>
            {ledgerRows.length} giao dịch trong kỳ
          </div>
        </div>

        {/* Aging bar */}
        <div className="dd-aging-bar">
          {agingAmounts.map((amt, i) => {
            const pct = agingTotal > 0 ? (amt / agingTotal) * 100 : 0;
            return pct > 0
              ? <i key={i} className={`dd-seg-${i}`} style={{ width: `${pct}%` }} />
              : null;
          })}
        </div>

        {/* Aging grid */}
        <div className="dd-aging-grid">
          {AGING_RANGES.map((range, i) => {
            const amt = agingAmounts[i];
            const isActive = i === activeAgingIdx;
            const pct = agingTotal > 0 ? Math.round((amt / agingTotal) * 100) : 0;
            return (
              <div key={i} className={`dd-aging-cell${isActive ? ' dd-aging-cell--active' : ''}`}>
                <div className="dd-ac-head">
                  <span className="dd-ac-dot" style={{ background: range.dotColor }} />
                  {range.label}
                </div>
                <div className={`dd-ac-val${amt === 0 ? ' dd-ac-val--zero' : ''}`}>
                  {formatCurrency(amt).replace(' ₫', '')}đ
                </div>
                <div className="dd-ac-share">
                  {amt > 0 ? `${pct}% tổng công nợ` : 'Không phát sinh'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Ledger Card ─────────────────────────────────────────────────── */}
      <section className="dd-ledger">
        <div className="dd-ledger-head">
          <h2>Sổ kế toán</h2>
          <span className="dd-cnt">{filteredRows.length} giao dịch</span>
          <div className="dd-filters">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.key}
                className={`dd-filter-chip${ledgerFilter === f.key ? ' dd-filter-chip--on' : ''}`}
                onClick={() => setLedgerFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table className="dd-table">
            <thead>
              <tr>
                <th>NGÀY</th>
                <th>LOẠI GIAO DỊCH</th>
                <th className="dd-r">NỢ</th>
                <th className="dd-r">CÓ</th>
                <th className="dd-r">SỐ DƯ</th>
                <th>GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <LedgerRow key={row.id} row={row} />
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                    Không có giao dịch
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LedgerRow({ row }: { row: LedgerEntry }) {
  const debit = parseFloat(row.debit) || 0;
  const credit = parseFloat(row.credit) || 0;
  const balance = parseFloat(row.balance) || 0;
  const meta = TXN_META[row.txn_type] ?? DEFAULT_META;

  return (
    <tr>
      <td className="dd-td-date">{formatDate(row.timestamp)}</td>
      <td><span className={meta.pill}>{meta.label}</span></td>
      <td className={`dd-num ${debit > 0 ? 'dd-num--debit' : 'dd-num--dash'}`}>
        {debit > 0 ? formatCurrency(debit).replace(' ₫', '') + 'đ' : '–'}
      </td>
      <td className={`dd-num ${credit > 0 ? 'dd-num--credit' : 'dd-num--dash'}`}>
        {credit > 0 ? formatCurrency(credit).replace(' ₫', '') + 'đ' : '–'}
      </td>
      <td className={`dd-num ${balance > 0 ? 'dd-num--bal' : ''}`}>
        {formatCurrency(balance).replace(' ₫', '')}đ
      </td>
      <td className="dd-td-note">{row.note || ''}</td>
    </tr>
  );
}
