import { ArrowLeft, Building2, Download, Phone, Plus, Truck } from 'lucide-react';
import type { CustomerStatement } from '@tingting/shared';
import AssetIcon from '../../components/AssetIcon';
import { Tooltip } from '../../components/shared/Tooltip';

interface DebtDetailHeaderProps {
  customer: CustomerStatement['customer'];
  hasDebt: boolean;
  onBack: () => void;
  onRecordPayment: () => void;
  onExport: () => void;
}

export function DebtDetailHeader({
  customer,
  hasDebt,
  onBack,
  onRecordPayment,
  onExport,
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
            <span className="dd-tag dd-tag--warn dd-tag--dot">Còn nợ trong hạn</span>
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
      </div>
    </div>
  );
}
