// Totals rows + empty state for the ancillary-fees card (was
// `ancillary-fees-card-utils.tsx`). Exports only components; the pure helpers
// and form constants live in ./ancillary-fees-card-utils (React Fast Refresh).

import { formatNumber } from '../../lib/format';

export function AncillaryTableTotals({ buy, sell }: { buy: number; sell: number }) {
  return <tfoot><tr><td colSpan={1}>Tổng</td><td className="num">{formatNumber(buy)}</td>
    <td className="num">{formatNumber(sell)}</td><td className="num" style={{ color: 'var(--success)' }}>{formatNumber(sell)}</td>
    <td colSpan={2}></td></tr></tfoot>;
}

export function AncillaryMobileTotals({ buy, sell }: { buy: number; sell: number }) {
  return <div className="ancillary-fees__mobile-totals"><span className="ancillary-fees__mobile-totals-label">Tổng</span>
    <div className="ancillary-fees__mobile-totals-nums">
      <div><span className="ancillary-fee-card__label">Gốc</span><span className="mono">{formatNumber(buy)}</span></div>
      <div><span className="ancillary-fee-card__label">Báo khách</span><span className="mono">{formatNumber(sell)}</span></div>
      <div><span className="ancillary-fee-card__label">Báo nợ</span><span className="mono" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatNumber(sell)}</span></div>
    </div>
  </div>;
}

export function AncillaryEmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px', gap: 12, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="5" y="3" width="18" height="22" rx="2.5" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="9" y1="10" x2="19" y2="10" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="9" y1="15" x2="19" y2="15" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="9" y1="20" x2="15" y2="20" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="22" cy="23" r="6" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
          <line x1="22" y1="20" x2="22" y2="26" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="19" y1="23" x2="25" y2="23" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontSize: 'var(--fs-section)', fontWeight: 600, color: '#14532d' }}>Chưa có dịch vụ đi kèm</div>
      <div style={{ fontSize: 'var(--fs-body)', color: '#4b7a5a', maxWidth: 320, lineHeight: 1.5 }}>
        Thêm phí nâng/hạ, hải quan, cân hàng… để lên giấy báo nợ và theo dõi công nợ phải thu.
      </div>
    </div>
  );
}

export interface AncillaryFeesCardProps {
  tripId: number;
  readOnly?: boolean;
  hideAddButton?: boolean;
}
