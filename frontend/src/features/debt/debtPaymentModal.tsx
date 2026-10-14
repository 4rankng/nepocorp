import { Loader2, Save, X } from 'lucide-react';
import { Modal } from '../../components/UI';
import { formatCurrency } from '../../lib/format';

interface DebtPaymentModalProps {
  isOpen: boolean;
  customerName: string;
  totalOutstanding: number;
  unpaidTripCount: number;
  payAmount: string;
  payReceipt: string;
  /** "Ngày nhận" (YYYY-MM-DD) — defaults to today, back-dating allowed. */
  payDate: string;
  payError: string;
  paySubmitting: boolean;
  onAmountChange: (value: string) => void;
  onReceiptChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function DebtPaymentModal({
  isOpen,
  customerName,
  totalOutstanding,
  unpaidTripCount,
  payAmount,
  payReceipt,
  payDate,
  payError,
  paySubmitting,
  onAmountChange,
  onReceiptChange,
  onDateChange,
  onSubmit,
  onClose,
}: DebtPaymentModalProps) {
  // The picker must not offer future dates — back-dating for retro entries is
  // fine, post-dating is not (the backend re-validates).
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Modal
      isOpen={isOpen}
      title={`Ghi nhận thanh toán — ${customerName}`}
      onClose={onClose}
      onConfirm={onSubmit}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            <X size={14} /> Hủy
          </button>
          <button
            className="btn btn--primary btn--sm"
            data-tour-id="debt-payment-submit"
            disabled={paySubmitting || !payAmount.trim() || !payReceipt.trim() || !payDate}
            onClick={onSubmit}
            aria-busy={paySubmitting}
          >
            {paySubmitting ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {paySubmitting ? 'Đang ghi nhận…' : 'Ghi nhận'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {payError && (
          <div style={{ padding: '10px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, fontSize: 'var(--fs-body)' }}>
            {payError}
          </div>
        )}
        <div style={{
          padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8,
          fontSize: 'var(--fs-body)', color: 'var(--fg-2)',
        }}>
          Còn nợ: <strong style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(totalOutstanding)}
          </strong> ({unpaidTripCount} chuyến chưa thu)
        </div>
        <div className="field">
          <label htmlFor="pay-amount" style={{ display: 'block', fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Số tiền nhận (₫) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="pay-amount"
            className="input"
            type="number"
            value={payAmount}
            onChange={e => onAmountChange(e.target.value)}
            placeholder="VD: 5000000"
            autoFocus
          />
          <p style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--fg-3)', marginTop: 4 }}>
            Sẽ phân bổ FIFO vào {unpaidTripCount} chuyến chưa thu, bắt đầu từ chuyến cũ nhất.
          </p>
        </div>
        <div className="field">
          <label htmlFor="pay-date" style={{ display: 'block', fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Ngày nhận <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="pay-date"
            className="input"
            type="date"
            value={payDate}
            max={today}
            onChange={e => onDateChange(e.target.value)}
          />
          <p style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--fg-3)', marginTop: 4 }}>
            Mặc định là hôm nay. Cho phép chọn ngày trước đó để ghi nhận bổ sung; không nhận ngày tương lai.
          </p>
        </div>
        <div className="field">
          <label htmlFor="pay-receipt" style={{ display: 'block', fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Mã biên lai / phiếu thu <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="pay-receipt"
            className="input"
            value={payReceipt}
            onChange={e => onReceiptChange(e.target.value)}
            placeholder="VD: PT-20260601-01"
          />
          <p style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--fg-3)', marginTop: 4 }}>
            Bắt buộc để đối chiếu với sao kê ngân hàng / sổ quỹ.
          </p>
        </div>
      </div>
    </Modal>
  );
}
