import { formatCurrency } from '../lib/format';

/**
 * Small, purely presentational blocks of the settlement print sheet, lifted out
 * of SettlementPrintPage.tsx to keep the page inside the file-size budget. They
 * take plain props and own no state, so the page keeps every handler.
 */

export interface SettlementInfo {
  code: string;
  createdAt: string;
  forwarderName?: string | null;
}

/** Số phiếu / ngày lập / nhân viên — the sheet's identity block. */
export function SettlementInfoGrid({ settlement }: { settlement: SettlementInfo }) {
  return (
    <div className="settlement-detail__section">
      <div className="settlement-detail__info">
        <div className="settlement-detail__info-item">
          <span className="settlement-detail__info-label">Số phiếu</span>
          <span className="settlement-detail__info-value">{settlement.code}</span>
        </div>
        <div className="settlement-detail__info-item">
          <span className="settlement-detail__info-label">Ngày lập</span>
          <span className="settlement-detail__info-value">{vietnamDate(settlement.createdAt)}</span>
        </div>
        <div className="settlement-detail__info-item">
          <span className="settlement-detail__info-label">Nhân viên</span>
          <span className="settlement-detail__info-value">{settlement.forwarderName || '—'}</span>
        </div>
      </div>
    </div>
  );
}

export interface SettlementAdvanceRow {
  id: number;
  amount: string | number;
  reason: string;
  createdAt: string;
}

/** Tạm ứng đã nhận — the advances this sheet consumes, with their total. */
export function SettlementAdvancesSection({
  requests,
  totalAdvance,
}: {
  requests: SettlementAdvanceRow[];
  totalAdvance: number;
}) {
  if (requests.length === 0) return null;

  return (
    <div className="settlement-detail__section">
      <h2 className="settlement-detail__section-title">Tạm ứng đã nhận</h2>
      <div className="settlement-detail__advances">
        {requests.map(r => (
          <div key={r.id} className="settlement-detail__advance-row">
            <span className="settlement-detail__advance-amount">{formatCurrency(Number(r.amount))}</span>
            <span className="settlement-detail__advance-reason">{r.reason}</span>
            <span className="settlement-detail__advance-date">{vietnamDate(r.createdAt)}</span>
          </div>
        ))}
        <div className="settlement-detail__advance-total">
          <span>Tổng tạm ứng:</span>
          <strong>{formatCurrency(totalAdvance)}</strong>
        </div>
      </div>
    </div>
  );
}

/** Business-day formatting for the sheet: Vietnam midnight boundary, not UTC. */
function vietnamDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}
