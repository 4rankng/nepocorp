import { AlertTriangle } from 'lucide-react';
import type { LedgerEntry } from '@tingting/shared';
import { formatCurrency, formatDate } from '../../lib/format';
import { money } from './debtUtils';

export const AGING_RANGES = [
  { label: '0–30 NGÀY',  dotColor: 'var(--accent)',  index: 0 },
  { label: '31–60 NGÀY', dotColor: 'var(--warning)', index: 1 },
  { label: '61–90 NGÀY', dotColor: '#D97706',        index: 2 },
  { label: 'TRÊN 90 NGÀY', dotColor: 'var(--danger)', index: 3 },
] as const;

interface DebtAccountStripProps {
  hasDebt: boolean;
  totalOutstanding: number;
  unpaidTripCount: number;
  oldestUnpaidTripDate: string | null;
  lastPayment: LedgerEntry | null;
  activeAgingIdx: number;
  activeAgingAmount: number;
}

export function DebtAccountStrip({
  hasDebt,
  totalOutstanding,
  unpaidTripCount,
  oldestUnpaidTripDate,
  lastPayment,
  activeAgingIdx,
  activeAgingAmount,
}: DebtAccountStripProps) {
  const activeAgingRange = activeAgingIdx >= 0 ? AGING_RANGES[activeAgingIdx] : null;

  return (
    <section className="dd-account-strip" aria-label="Tóm tắt công nợ">
      <article className={`dd-account-card${hasDebt ? ' dd-account-card--debt' : ' dd-account-card--clear'}`}>
        <span>Dư nợ hiện tại</span>
        <strong>{money(totalOutstanding)}</strong>
        <small>{hasDebt ? 'Cần theo dõi thu hồi' : 'Đã tất toán'}</small>
      </article>
      <article className="dd-account-card">
        <span>Chuyến chưa thu</span>
        <strong>{unpaidTripCount}</strong>
        <small>{oldestUnpaidTripDate ? `Cũ nhất ${formatDate(oldestUnpaidTripDate)}` : 'Không phát sinh'}</small>
      </article>
      <article className="dd-account-card">
        <span>Phiếu thu gần nhất</span>
        <strong>{lastPayment ? money(parseFloat(lastPayment.credit) || 0) : '-'}</strong>
        <small>{lastPayment ? formatDate(lastPayment.timestamp) : 'Chưa có phiếu thu'}</small>
      </article>
      <article className="dd-account-card">
        <span>Nhóm tuổi nợ nổi bật</span>
        <strong>{activeAgingRange ? activeAgingRange.label : 'Không nợ'}</strong>
        <small>{activeAgingRange ? money(activeAgingAmount) : 'Không có số dư'}</small>
      </article>
    </section>
  );
}

interface DebtAgingSummaryProps {
  hasDebt: boolean;
  activeAgingIdx: number;
  agingAmounts: number[];
  ledgerRowCount: number;
}

export function DebtAgingSummary({
  hasDebt,
  activeAgingIdx,
  agingAmounts,
  ledgerRowCount,
}: DebtAgingSummaryProps) {
  const agingTotal = agingAmounts.reduce((s, a) => s + a, 0) || 1; // avoid /0

  return (
    <section className="dd-summary dd-summary--aging">
      <div className="dd-sum-top">
        <div>
          <div className="dd-sum-label">PHÂN BỔ TUỔI NỢ</div>
          <p className="dd-sum-copy">
            {hasDebt
              ? 'Theo dõi phần công nợ nào đang tiến gần hạn hoặc đã quá hạn.'
              : 'Khách hàng không còn công nợ đang mở.'}
          </p>
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
          <b>{new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</b>
          {ledgerRowCount} giao dịch trong kỳ
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
  );
}
