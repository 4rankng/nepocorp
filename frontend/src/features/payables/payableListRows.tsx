import type { PayableSummary } from '@tingting/shared';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { ClickableCard } from '../../components/shared/ClickableCard';
import { SubLine } from '../../design-system';
import { resolveEmptyIllustration } from '../../lib/emptyIllustrations';
import { payableDetailHref, AGING_BUCKET_LABELS } from './payableListUtils';

/* ─── Mobile card list (<=640px) ──────────────────────────────────────────── */

export function PayableMobileCardList({ payables }: { payables: PayableSummary[] }) {
  return (
    <div className="mobile-only mobile-table-wrap">
      <div className="m-card-list">
        {payables.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <img src={resolveEmptyIllustration('empty-payables')} alt="" aria-hidden="true" style={{ width: 140, height: 116, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            Không tìm thấy dữ liệu.
          </div>
        ) : (
          payables.map(d => {
            const totalAging = d.aging.current + d.aging.d30 + d.aging.d60 + d.aging.over90;
            const pctCur = totalAging > 0 ? (d.aging.current / totalAging) * 100 : 100;
            const pct30 = totalAging > 0 ? (d.aging.d30 / totalAging) * 100 : 0;
            const pct60 = totalAging > 0 ? (d.aging.d60 / totalAging) * 100 : 0;
            const pct90 = totalAging > 0 ? (d.aging.over90 / totalAging) * 100 : 0;
            return (
              <ClickableCard key={`${d.kind ?? 'vendor'}-${d.supplier.id}`} to={payableDetailHref(d)} className="m-card">
                <div className="m-card__top">
                  {/* Both rows below are flex, so these explicit spaces are not
                      rendered — they exist so the DOM reads "…AN KHÁNH 308.490.000 ₫"
                      and "Tuổi nợ lớn nhất 58 ngày" instead of gluing the two
                      children when the card is copied or measured, the way the
                      table cells and the aging cards read (kanban 101026102020). */}
                  <span className="m-card__title">{d.supplier.name}</span>{' '}
                  <span className={`m-card__row-value${d.totalOutstanding > 0 ? '--danger' : '--success'} m-card__row-value`} style={{ fontSize: 'var(--fs-body)' }}>
                    {formatCurrency(d.totalOutstanding)}
                  </span>
                </div>
                {d.supplier.phone && (
                  <div className="m-card__meta">{d.supplier.phone}</div>
                )}
                {d.totalOutstanding > 0 && (
                  <>
                    <div className="aging-bar" style={{ height: 5, borderRadius: 3, overflow: 'hidden', display: 'flex', marginTop: 8, marginBottom: 4 }}>
                      <div className="aging-bar__seg aging-bar__seg--ok" style={{ width: `${pctCur}%` }} />
                      <div className="aging-bar__seg aging-bar__seg--t1" style={{ width: `${pct30}%` }} />
                      <div className="aging-bar__seg aging-bar__seg--t2" style={{ width: `${pct60}%` }} />
                      <div className="aging-bar__seg aging-bar__seg--t4" style={{ width: `${pct90}%` }} />
                    </div>
                    {d.maxOverdueDays > 0 && (
                      <div className="m-card__row">
                        <span className="m-card__row-label">Tuổi nợ lớn nhất</span>{' '}
                        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: d.maxOverdueDays > 60 ? 'var(--danger)' : d.maxOverdueDays > 30 ? 'var(--warning)' : 'var(--ink-2)' }}>
                          {d.maxOverdueDays} ngày
                        </span>
                      </div>
                    )}
                  </>
                )}
              </ClickableCard>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Desktop table (>640px) ──────────────────────────────────────────────── */

/**
 * One aging bucket cell. A zero balance renders an EMPTY cell — the old "—"
 * turned every current-only supplier's row into three dashes pretending to be
 * data (NEPO-19). No amount, no dash, no wrapper.
 */
function PayableAgingCell({ amount, tone }: { amount: number; tone: string }) {
  if (amount <= 0) return <td className="num" />;
  return (
    <td className="num" style={{ fontSize: 'var(--fs-body)', color: tone }}>
      {formatCurrency(amount)}
    </td>
  );
}

export function PayableDesktopTable({ payables }: { payables: PayableSummary[] }) {
  return (
    <div className="desktop-only table-wrap">
      <div className="table-scroll">
        <table className="payables-table">
          <thead>
            <tr>
              <th>Nhà cung cấp</th>
              <th className="num">Tổng nợ (gồm VAT)</th>
              {AGING_BUCKET_LABELS.map(label => (
                <th key={label}>{label}</th>
              ))}
              <th style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {payables.map(d => (
              <ClickableCard
                as="tr"
                key={`${d.kind ?? 'vendor'}-${d.supplier.id}`}
                to={payableDetailHref(d)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--fg-1)' }}>
                    {d.supplier.name}
                  </div>
                  {/* NEPO-16/19: no phone → no line at all. The old
                      `{phone || '—'}` fallback read as a stray '_' under 4 of
                      5 supplier names (audit 24/10). */}
                  <SubLine value={d.supplier.phone} />
                </td>
                <td className="num typo-mono" style={{
                  fontWeight: 700,
                  color: d.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)'
                }}>
                  {formatCurrency(d.totalOutstanding)}
                </td>
                <PayableAgingCell amount={d.aging.current} tone="var(--fg-1)" />
                <PayableAgingCell amount={d.aging.d30} tone="var(--warning)" />
                <PayableAgingCell amount={d.aging.d60} tone="#D97706" />
                <PayableAgingCell amount={d.aging.over90} tone="var(--danger)" />
                <td style={{ textAlign: 'right' }}>
                  <ChevronRight size={14} style={{ color: 'var(--fg-3)' }} />
                </td>
              </ClickableCard>
            ))}

            {payables.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px 40px', color: 'var(--fg-3)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <img src={resolveEmptyIllustration('empty-payables')} alt="" aria-hidden="true" style={{ width: 130, height: 108, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    Không tìm thấy dữ liệu công nợ phải trả.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
