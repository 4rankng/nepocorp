import { TxnType } from '@tingting/shared';
import type { LedgerEntry } from '@tingting/shared';
import { formatDate } from '../../lib/format';
import { money } from './debtUtils';

export function DualEntityLookupError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="dd-ledger dd-ledger--standalone" style={{ marginBottom: 16 }}>
      <div className="dd-table-empty" role="alert">
        Không thể kiểm tra công nợ phải trả liên kết.{' '}
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    </section>
  );
}

const PAYABLE_TXN_META: Record<string, { label: string; pill: string }> = {
  [TxnType.VENDOR_EXPENSE]: { label: 'Ghi nhận chi phí', pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.VENDOR_PAYMENT]: { label: 'Thanh toán công nợ', pill: 'dd-txn-pill dd-txn-pill--pay' },
  [TxnType.ADJUSTMENT]: { label: 'Điều chỉnh', pill: 'dd-txn-pill dd-txn-pill--adj' },
  [TxnType.FUEL_EXPENSE]: { label: 'Chi phí nhiên liệu', pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.COMMISSION]: { label: 'Hoa hồng', pill: 'dd-txn-pill dd-txn-pill--pen' },
  [TxnType.UNLOCK_REVERSAL]: { label: 'Hoàn tác', pill: 'dd-txn-pill dd-txn-pill--adj' },
};
const DEFAULT_PAYABLE_TXN_META = {
  label: 'Khác',
  pill: 'dd-txn-pill dd-txn-pill--other',
};

function payableRowDetails(row: LedgerEntry) {
  const meta = PAYABLE_TXN_META[row.txnType] ?? DEFAULT_PAYABLE_TXN_META;
  const reference = row.receiptId
    || (row.txnType === TxnType.FUEL_EXPENSE ? row.tripCode || 'Chuyến chưa có mã' : null)
    || row.note
    || meta.label;

  return {
    meta,
    reference,
    payable: parseFloat(row.credit) || 0,
    paid: parseFloat(row.debit) || 0,
    balance: parseFloat(row.balance) || 0,
  };
}

function LinkedSupplierPayableRow({ row }: { row: LedgerEntry }) {
  const { meta, reference, payable, paid, balance } = payableRowDetails(row);

  return (
    <tr>
      <td className="dd-td-date">{formatDate(row.timestamp)}</td>
      <td className="dd-reference"><strong>{reference}</strong></td>
      <td><span className={meta.pill}>{meta.label}</span></td>
      <td className={`dd-num ${payable > 0 ? 'dd-num--debit' : 'dd-num--dash'}`}>
        {payable > 0 ? money(payable) : '–'}
      </td>
      <td className={`dd-num ${paid > 0 ? 'dd-num--credit' : 'dd-num--dash'}`}>
        {paid > 0 ? money(paid) : '–'}
      </td>
      <td className={`dd-num ${balance > 0 ? 'dd-num--bal' : balance < 0 ? 'dd-num--credit' : ''}`}>
        {balance < 0 ? '-' : ''}{money(Math.abs(balance))}
      </td>
      <td className="dd-td-note">{row.note || '–'}</td>
    </tr>
  );
}

function LinkedSupplierPayableCard({ row }: { row: LedgerEntry }) {
  const { meta, reference, payable, paid, balance } = payableRowDetails(row);

  return (
    <li className="dd-ledger-mobile-card d-card d-card-border bg-base-100">
      <div className="dd-ledger-mobile-card__head">
        <time dateTime={row.timestamp}>{formatDate(row.timestamp)}</time>
        <span className={meta.pill}>{meta.label}</span>
      </div>
      <div className="dd-ledger-mobile-card__body">
        <strong>{reference}</strong>
        <p>{row.note || 'Không có ghi chú'}</p>
      </div>
      <dl className="dd-ledger-mobile-card__amounts">
        <div>
          <dt>Phải trả</dt>
          <dd>{payable > 0 ? money(payable) : '–'}</dd>
        </div>
        <div>
          <dt>Đã trả</dt>
          <dd className={paid > 0 ? 'text-success' : ''}>{paid > 0 ? money(paid) : '–'}</dd>
        </div>
        <div className="dd-ledger-mobile-card__balance">
          <dt>Số dư</dt>
          <dd className={balance > 0 ? 'text-error' : balance < 0 ? 'text-success' : ''}>
            {balance < 0 ? '-' : ''}{money(Math.abs(balance))}
          </dd>
        </div>
      </dl>
    </li>
  );
}

interface LinkedSupplierPayableLedgerProps {
  supplierId: number;
  supplierName: string;
  rows: LedgerEntry[];
  isCompact: boolean;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  arBalance: number;
  apBalance: number;
}

export function LinkedSupplierPayableLedger({
  supplierId,
  supplierName,
  rows,
  isCompact,
  isLoading,
  isError = false,
  onRetry = () => undefined,
  arBalance,
  apBalance,
}: LinkedSupplierPayableLedgerProps) {
  const emptyMessage = isLoading
    ? 'Đang tải giao dịch công nợ phải trả...'
    : 'Chưa có giao dịch công nợ phải trả';

  return (
    <section
      className="dd-ledger dd-ledger--standalone"
      aria-label={`Chi tiết công nợ phải trả của ${supplierName}`}
      style={{ marginBottom: 16 }}
    >
      <div className="dd-ledger-head">
        <div className="dd-ledger-heading">
          <span className="dd-panel-eyebrow">Nhà cung cấp liên kết</span>
          <h2>Chi tiết công nợ phải trả</h2>
          <p>
            {supplierName} · Còn phải trả {money(apBalance)} · Số ròng {money(arBalance - apBalance)}
          </p>
        </div>
        <span className="dd-cnt">{rows.length} giao dịch</span>
        <a
          className="btn btn--secondary btn--sm"
          href={`/payables/${supplierId}`}
          aria-label="Mở trang công nợ nhà cung cấp"
        >
          Xem đầy đủ
        </a>
      </div>

      {isError ? (
        <div className="dd-table-empty" role="alert">
          Không thể tải chi tiết công nợ phải trả.{' '}
          <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
            Thử lại
          </button>
        </div>
      ) : isCompact ? (
        <ul className="dd-ledger-mobile d-list" aria-label="Danh sách giao dịch công nợ phải trả">
          {rows.map(row => <LinkedSupplierPayableCard key={row.id} row={row} />)}
          {rows.length === 0 && <li className="dd-ledger-mobile-empty">{emptyMessage}</li>}
        </ul>
      ) : (
        <div className="table-scroll">
          <table className="dd-table dd-detail-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Đối chiếu</th>
                <th>Loại giao dịch</th>
                <th className="dd-r">Phải trả</th>
                <th className="dd-r">Đã trả</th>
                <th className="dd-r">Số dư</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => <LinkedSupplierPayableRow key={row.id} row={row} />)}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="dd-table-empty">{emptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
