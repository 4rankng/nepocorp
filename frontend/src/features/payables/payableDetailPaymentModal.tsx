import { Modal } from '../../components/UI';

interface PayablePaymentModalProps {
  isOpen: boolean;
  submitting: boolean;
  amount: string;
  date: string;
  receiptId: string;
  onAmountChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onReceiptIdChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function PayablePaymentModal({
  isOpen,
  submitting,
  amount,
  date,
  receiptId,
  onAmountChange,
  onDateChange,
  onReceiptIdChange,
  onClose,
  onConfirm,
}: PayablePaymentModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Ghi thanh toán"
      onClose={onClose}
      onConfirm={onConfirm}
      maxWidth={440}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            className="btn btn--primary"
            onClick={onConfirm}
            disabled={submitting || !amount || !date || !receiptId.trim()}
          >
            {submitting ? 'Đang ghi…' : 'Xác nhận'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="payment-amount">Số tiền (đ) *</label>
        <input
          id="payment-amount"
          type="number"
          className="input"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          placeholder="Nhập số tiền"
        />
      </div>
      <div className="field">
        <label htmlFor="payment-date">Ngày *</label>
        <input
          id="payment-date"
          type="date"
          className="input"
          value={date}
          onChange={e => onDateChange(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="payment-receipt-id">Mã biên lai *</label>
        <input
          id="payment-receipt-id"
          type="text"
          className="input"
          value={receiptId}
          onChange={e => onReceiptIdChange(e.target.value)}
          placeholder="VD: PT-20260531-01"
        />
        <p style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--fg-3)', marginTop: 4 }}>
          Bắt buộc để đối chiếu sao kê ngân hàng / phiếu chi.
        </p>
      </div>
    </Modal>
  );
}
