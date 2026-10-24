import type { MoneyParts } from '../../lib/format';
import { AGING_BUCKET_LABELS, type PayablesAgingTotals } from './payableListUtils';

/* ─── Zone 1: Summary band (NEPO-19) ──────────────────────────────────────── */

/**
 * ONE ≤96px band replaces the 104px hero (with its 86px watermark) + the two
 * mini cards + the four aging cards. It is the single source of the totals:
 * the PageHeader repeats neither the amount nor the supplier count (NEPO-19),
 * so no figure appears twice on the page.
 */
export function PayableSummaryBand({
  totals,
  heroMoney,
  bucketMoney,
}: {
  totals: PayablesAgingTotals;
  heroMoney: MoneyParts;
  /** Full-VND money parts for the four buckets, in AGING_BUCKET_LABELS order. */
  bucketMoney: [MoneyParts, MoneyParts, MoneyParts, MoneyParts];
}) {
  const agingTotal = totals.current + totals.d30 + totals.d60 + totals.over90 || 1;
  const segments = [
    { amount: totals.current, pct: (totals.current / agingTotal) * 100, tone: 'var(--accent, #00B14F)' },
    { amount: totals.d30, pct: (totals.d30 / agingTotal) * 100, tone: 'var(--warning)' },
    { amount: totals.d60, pct: (totals.d60 / agingTotal) * 100, tone: 'var(--warning-deep, #DD5A1F)' },
    { amount: totals.over90, pct: (totals.over90 / agingTotal) * 100, tone: 'var(--danger, #E32434)' },
  ];

  return (
    <div className="payables-band">
      <div className="payables-band__total">
        <span className="payables-band__label">Tổng nợ phải trả (gồm VAT)</span>
        <span className="payables-band__amount">
          <span>{heroMoney.num}</span>
          <span className="payables-band__unit">{' '}{heroMoney.unit}</span>
        </span>
      </div>
      <span className="payables-band__chip">
        <span className="payables-band__chip-value">{totals.supplierCount}</span>
        {' NCC'}
      </span>
      <span className="payables-band__chip payables-band__chip--danger">
        <span className="payables-band__chip-value">{totals.overdueCount}</span>
        {' quá hạn'}
      </span>
      <div className="payables-band__aging" aria-label="Phân bổ tuổi nợ">
        <div className="payables-band__bar" aria-hidden="true">
          {segments.map((seg, i) => (
            <span
              key={i}
              className="payables-band__bar-seg"
              style={{ width: `${seg.pct}%`, background: seg.tone }}
            />
          ))}
        </div>
        <div className="payables-band__buckets">
          {AGING_BUCKET_LABELS.map((label, i) => {
            const money = bucketMoney[i];
            const count = [totals.currentCount, totals.d30Count, totals.d60Count, totals.over90Count][i];
            return (
              <span key={label} className="payables-band__bucket">
                <span className="payables-band__dot" style={{ background: segments[i].tone }} />
                <span className="payables-band__bucket-label">{label}</span>
                <span className="payables-band__bucket-amount">
                  {money.num}
                  <span className="payables-band__bucket-unit">{' '}{money.unit}</span>
                </span>
                <span className="payables-band__bucket-count">{count} NCC</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
