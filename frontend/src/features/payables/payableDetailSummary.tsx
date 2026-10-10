import { AlertTriangle } from 'lucide-react';
import { formatCurrency, moneyParts } from '../../lib/format';
import { AGING_RANGES } from './payableDetailUtils';

interface PayableSummarySectionProps {
  totalOutstanding: number;
  effectiveAging: number[];
  agingTotal: number;
  activeAgingIdx: number;
  hasDebt: boolean;
  hasCredit: boolean;
  overpaymentAmount: number;
  ledgerCount: number;
}

export function PayableSummarySection({
  totalOutstanding,
  effectiveAging,
  agingTotal,
  activeAgingIdx,
  hasDebt,
  hasCredit,
  overpaymentAmount,
  ledgerCount,
}: PayableSummarySectionProps) {
  return (
    <section className="dd-summary">
      <div className="dd-sum-top">
        <div>
          <div className="dd-sum-label">TỔNG CỘNG NỢ</div>
          <div className={`dd-sum-total ${hasDebt ? '' : ' dd-sum-total--clear'}`}>
            {/* `moneyParts` splits the amount and its unit so the unit can be
                set smaller. The old inline `.replace(' ₫', '')` + `<span>₫</span>`
                ran the two together with no space and swapped the ₫ sign for a
                plain "đ", so this card read "331.451.555đ" while every table
                read "331.451.555 ₫" (kanban 091026235520). */}
            {(() => {
              const { num, unit } = moneyParts(hasDebt ? totalOutstanding : 0, false);
              return <>{num}<span className="dd-cur"> {unit}</span></>;
            })()}
          </div>
          {hasDebt && (
            <div className="dd-sum-note">
              <AlertTriangle size={17} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              {activeAgingIdx <= 0
                ? 'Toàn bộ công nợ đang trong hạn 30 ngày.'
                : `Có công nợ quá hạn ${AGING_RANGES[activeAgingIdx].label.toLowerCase()} — cần ưu tiên thanh toán.`
              }
            </div>
          )}
          {hasCredit && (
            <div className="dd-sum-note" style={{ marginTop: 4 }}>
              <AlertTriangle size={17} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              Đã trả thừa {formatCurrency(overpaymentAmount)} — nhà cung cấp đang nợ lại công ty
            </div>
          )}
        </div>
        <div className="dd-sum-update">
          Cập nhật lần cuối
          <b>{new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</b>
          {ledgerCount} giao dịch trong kỳ
        </div>
      </div>

      {/* Aging bar */}
      <div className="dd-aging-bar">
        {effectiveAging.map((amt, i) => {
          const pct = agingTotal > 0 ? (amt / agingTotal) * 100 : 0;
          return pct > 0
            ? <i key={i} className={`dd-seg-${i}`} style={{ width: `${pct}%` }} />
            : null;
        })}
      </div>

      {/* Aging grid */}
      <div className="dd-aging-grid">
        {AGING_RANGES.map((range, i) => {
          const amt = effectiveAging[i];
          const isActive = i === activeAgingIdx;
          const pct = agingTotal > 0 ? Math.round((amt / agingTotal) * 100) : 0;
          return (
            <div key={i} className={`dd-aging-cell${isActive ? ' dd-aging-cell--active' : ''}`}>
              <div className="dd-ac-head">
                <span className="dd-ac-dot" style={{ background: range.dotColor }} />
                {range.label}
              </div>
              <div className={`dd-ac-val${amt === 0 ? ' dd-ac-val--zero' : ''}`}>
                {formatCurrency(amt)}
              </div>
              <div className="dd-ac-share">
                {amt > 0 ? `${pct}% tổng công nợ` : 'Không phát sinh'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
