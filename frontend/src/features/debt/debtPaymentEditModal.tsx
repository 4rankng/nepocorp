import { Loader2, Save, X } from 'lucide-react';
import { Modal } from '../../components/UI';

interface DebtPaymentEditModalProps {
  isOpen: boolean;
  customerName: string;
  /** Prefilled from the ledger row being edited. */
  amount: string;
  receiptId: string;
  /** "Ngày nhận" (YYYY-MM-DD) prefilled from the row's timestamp. */
  receivedDate: string;
  error: string;
  submitting: boolean;
  onAmountChange: (value: string) => void;
  onReceiptChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Edit form for a recorded receivable payment entry — amount, "Ngày nhận"
 * and receipt code (the editable trio; the FIFO allocation itself stays).
 * Submitting asks for confirmation in the parent before the PUT goes out.
 */
export function DebtPaymentEditModal({
  isOpen,
  customerName,
  amount,
  receiptId,
  receivedDate,
  error,
  submitting,
  onAmountChange,
  onReceiptChange,
  onDateChange,
  onSubmit,
  onClose,
}: DebtPaymentEditModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Modal
      isOpen={isOpen}
      title={`Sửa bản ghi thanh toán — ${customerName}`}
      onClose={onClose}
      onConfirm={onSubmit}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            <X size={14} /> Hủy
          </button>
          <button
            className="btn btn--primary btn--sm"
            disabled={submitting || !amount.trim() || !receiptId.trim() || !receivedDate}
            onClick={onSubmit}
            aria-busy={submitting}
          >
            {submitting ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ padding: '10px 12px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8, fontSize: 'var(--fs-body)' }}>
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="edit-pay-amount" style={{ display: 'block', fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Số tiền nhận (₫) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="edit-pay-amount"
            className="input"
            type="number"
            value={amount}
            onChange={e => onAmountChange(e.target.value)}
            placeholder="VD: 5000000"
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="edit-pay-date" style={{ display: 'block', fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Ngày nhận <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="edit-pay-date"
            className="input"
            type="date"
            value={receivedDate}
            max={today}
            onChange={e => onDateChange(e.target.value)}
          />
          <p style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--fg-3)', marginTop: 4 }}>
            Sửa lại ngày tiền thực nhận; không nhận ngày tương lai.
          </p>
        </div>
        <div className="field">
          <label htmlFor="edit-pay-receipt" style={{ display: 'block', fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Mã biên lai / phiếu thu <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="edit-pay-receipt"
            className="input"
            value={receiptId}
            onChange={e => onReceiptChange(e.target.value)}
            placeholder="VD: PT-20260601-01"
          />
        </div>
      </div>
    </Modal>
  );
}
