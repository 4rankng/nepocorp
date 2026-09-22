import type { PayableSummary } from '@tingting/shared';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { ClickableCard } from '../../components/shared/ClickableCard';
import { resolveEmptyIllustration } from '../../lib/emptyIllustrations';
import { payableDetailHref } from './payableListUtils';

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
                  <span className="m-card__title">{d.supplier.name}</span>
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
                        <span className="m-card__row-label">Tuổi nợ lớn nhất</span>
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

export function PayableDesktopTable({ payables }: { payables: PayableSummary[] }) {
  return (
    <div className="desktop-only table-wrap">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nhà cung cấp</th>
              <th className="num">Tổng nợ</th>
              <th>0-30 ngày</th>
              <th>31-60 ngày</th>
              <th>61-90 ngày</th>
              <th>&gt;90 ngày</th>
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
                  <div style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--fg-3)' }}>
                    {d.supplier.phone || '—'}
                  </div>
                </td>
                <td className="num typo-mono" style={{
                  fontWeight: 700,
                  color: d.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)'
                }}>
                  {formatCurrency(d.totalOutstanding)}
                </td>
                <td className="num" style={{ fontSize: 'var(--fs-body)', color: d.aging.current > 0 ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                  {d.aging.current > 0 ? formatCurrency(d.aging.current) : '—'}
                </td>
                <td className="num" style={{ fontSize: 'var(--fs-body)', color: d.aging.d30 > 0 ? 'var(--warning)' : 'var(--fg-3)' }}>
                  {d.aging.d30 > 0 ? formatCurrency(d.aging.d30) : '—'}
                </td>
                <td className="num" style={{ fontSize: 'var(--fs-body)', color: d.aging.d60 > 0 ? '#D97706' : 'var(--fg-3)' }}>
                  {d.aging.d60 > 0 ? formatCurrency(d.aging.d60) : '—'}
                </td>
                <td className="num" style={{ fontSize: 'var(--fs-body)', color: d.aging.over90 > 0 ? 'var(--danger)' : 'var(--fg-3)' }}>
                  {d.aging.over90 > 0 ? formatCurrency(d.aging.over90) : '—'}
                </td>
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
