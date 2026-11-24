import { ArrowLeft, Building2, Download, Lock, LockOpen, Phone, Plus, Truck } from 'lucide-react';
import type { CustomerStatement } from '@tingting/shared';
import AssetIcon from '../../components/AssetIcon';
import { Tooltip } from '../../components/shared/Tooltip';

interface DebtDetailHeaderProps {
  customer: CustomerStatement['customer'];
  hasDebt: boolean;
  /** True when any bucket past the current 0–30 one carries a balance. */
  isOverdue: boolean;
  /** NEPO-63 Chốt công nợ — the book is frozen through this day (yyyy-mm-dd). */
  debtClosedUntil?: string | null;
  /** Financial roles only (server enforces the same set). */
  canManageDebt: boolean;
  onBack: () => void;
  onRecordPayment: () => void;
  onExport: () => void;
  onCloseDebt: () => void;
  onReopenDebt: () => void;
}

/** "dd/mm/yyyy" for the badge; the raw value is an ISO date or null. */
function formatClosedDay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function DebtDetailHeader({
  customer,
  hasDebt,
  isOverdue,
  debtClosedUntil,
  canManageDebt,
  onBack,
  onRecordPayment,
  onExport,
  onCloseDebt,
  onReopenDebt,
}: DebtDetailHeaderProps) {
  return (
    <div className="dd-header">
      <Tooltip label="Quay lại" side="right">
        <button className="dd-back" aria-label="Quay lại" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
      </Tooltip>
      <div className="dd-avatar">
        <AssetIcon
          name="customer"
          size={28}
          alt="Biểu tượng khách hàng"
          className="dd-avatar__icon"
        />
      </div>
      <div className="dd-meta">
        <div className="dd-name-row" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h1>{customer.name}</h1>
          {customer.isCarrier && (
            <span style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 4, padding: '3px 7px', letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Truck size={12} aria-hidden="true" /> Xe ngoài
            </span>
          )}
          {debtClosedUntil && (
            <span title={`Công nợ đã chốt đến ${formatClosedDay(debtClosedUntil)} — không thể ghi/sửa/xóa chứng từ trước ngày chốt`} style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 4, padding: '3px 7px', letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Lock size={12} aria-hidden="true" /> Đã chốt đến {formatClosedDay(debtClosedUntil)}
            </span>
          )}
        </div>
        <div className="dd-sub">
          {customer.contactInfo && (
            <span>
              <Phone size={15} />
              <span className="dd-mono">{customer.contactInfo}</span>
            </span>
          )}
          <span>
            <Building2 size={15} />
            Khách hàng doanh nghiệp
          </span>
          {hasDebt ? (
            // The badge used to read "Còn nợ trong hạn" for every customer with
            // a balance, so a customer the list marked "Nợ quá hạn" said the
            // opposite here (kanban 101026203130). Same palette as before — the
            // words are what were wrong.
            <span className="dd-tag dd-tag--warn dd-tag--dot">
              {isOverdue ? 'Nợ quá hạn' : 'Còn nợ trong hạn'}
            </span>
          ) : (
            <span className="dd-tag dd-tag--ok dd-tag--dot">Đã thanh toán đủ</span>
          )}
        </div>
      </div>
      <div className="dd-actions">
        {hasDebt && (
          <button
            className="btn btn--primary"
            data-tour-id="debt-record-payment"
            onClick={onRecordPayment}
          >
            <Plus size={14} />
            Ghi nhận thanh toán
          </button>
        )}
        <button
          className="btn btn--secondary"
          onClick={onExport}
        >
          <Download size={14} />
          Xuất sao kê
        </button>
        {canManageDebt && (
          debtClosedUntil ? (
            <button className="btn btn--secondary" onClick={onReopenDebt}>
              <LockOpen size={14} />
              Mở chốt
            </button>
          ) : (
            <button className="btn btn--secondary" onClick={onCloseDebt}>
              <Lock size={14} />
              Chốt công nợ
            </button>
          )
        )}
      </div>
    </div>
  );
}
