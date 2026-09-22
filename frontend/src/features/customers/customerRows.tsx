import { MoreHorizontal, Pencil, Trash2, Loader2, Truck } from 'lucide-react';
import { StatusPill } from '../../components/UI';
import { ClickableCard } from '../../components/shared/ClickableCard';
import { StatusStrip } from '../../components/shared/StatusStrip';
import { Money } from '../../components/shared/Money';
import { formatCurrency } from '../../lib/format';
import { CustomerStatus } from '@tingting/shared';
import type { Customer } from '@tingting/shared';
import { STATUS_LABELS, riskDot } from './customerUtils';

/** Mobile card (≤820px) for one customer. */
export function CustomerCard({ customer, debt, onOpen, onEdit }: {
  customer: Customer; debt: number; onOpen: () => void; onEdit: () => void;
}) {
  return (
    <ClickableCard className="m-card" style={{ position: 'relative' }} onClick={onOpen}>
      <StatusStrip status={customer.status} />
      <div className="m-card__top">
        <span className="m-card__title">
          <span className={`risk-dot risk-dot--${riskDot(debt, Number(customer.creditLimit || 0))}`} />
          {customer.name}
          {customer.linkedSupplierId && (
            <span style={{ marginLeft: 6, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', verticalAlign: 'middle' }}>
              2 chiều
            </span>
          )}
          {/* TODO: extract a shared <Badge> component for "2 chiều" / "Xe ngoài" */}
          {customer.isCarrier && (
            <span style={{ marginLeft: 6, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Truck size={11} aria-hidden="true" /> Xe ngoài
            </span>
          )}
        </span>
        <StatusPill variant={customer.status === CustomerStatus.ACTIVE ? 'success' : 'danger'}>
          {STATUS_LABELS[customer.status] || customer.status}
        </StatusPill>
      </div>
      {customer.taxCode && (
        <div className="m-card__meta" style={{ fontFamily: 'var(--font-mono)' }}>
          MST {customer.taxCode}
        </div>
      )}
      {(customer.contactPerson || customer.phone) && (
        <div className="m-card__meta">
          {customer.contactPerson}
          {customer.phone && <><span className="m-card__meta-sep">·</span>{customer.phone}</>}
        </div>
      )}
      {customer.creditLimit && (
        <div className="m-card__row">
          <span className="m-card__row-label">Hạn mức tín dụng</span>
          <span className="m-card__row-value">{formatCurrency(customer.creditLimit)}</span>
        </div>
      )}
      <div className="m-card__row">
        <span className="m-card__row-label">Công nợ</span>
        <span className="m-card__row-value" style={debt ? { color: 'var(--danger)' } : undefined}>
          <Money value={debt} />
        </span>
      </div>
      <div className="m-card-edit-row">
        <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          Sửa
        </button>
      </div>
    </ClickableCard>
  );
}

/** Desktop table row (>640px) for one customer, including its action menu. */
export function CustomerRow({ customer, index, debt, visibleCount, menuOpen, deleting, onOpen, onEdit, onDelete, onToggleMenu }: {
  customer: Customer; index: number; debt: number; visibleCount: number;
  menuOpen: boolean; deleting: boolean;
  onOpen: () => void; onEdit: () => void; onDelete: () => void; onToggleMenu: () => void;
}) {
  return (
    <tr role="button" tabIndex={0}
      style={{ cursor: 'pointer', transition: 'background 0.12s ease' }}
      onClick={onOpen}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    >
      <td style={{ padding: 12, borderBottom: '1px solid var(--line)', position: 'relative', verticalAlign: 'middle' }}>
        <StatusStrip status={customer.status} />
        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 6, width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ wordBreak: 'break-word', whiteSpace: 'normal', minWidth: 0 }}>
            {customer.name}
          </span>
          {customer.linkedSupplierId && (
            <span style={{ flexShrink: 0, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', marginTop: 1 }}>
              2 chiều
            </span>
          )}
          {customer.isCarrier && (
            <span style={{ flexShrink: 0, fontSize: 'var(--fs-body)', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em', marginTop: 1, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Truck size={11} aria-hidden="true" /> Xe ngoài
            </span>
          )}
        </div>
        {customer.taxCode && <div style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>MST {customer.taxCode}</div>}
      </td>
      <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'normal', wordBreak: 'break-word' }}>
        {customer.contactPerson && <div style={{ fontWeight: 600 }}>{customer.contactPerson}</div>}
        {(customer.phone || customer.contactInfo) && (
          <div style={{ fontSize: 'var(--fs-body)', lineHeight: 1.35, color: 'var(--ink-3)', marginTop: 2, fontFamily: customer.phone ? 'var(--font-mono)' : 'var(--font-body)' }}>
            {customer.phone || customer.contactInfo}
          </div>
        )}
        {!customer.contactPerson && !customer.phone && !customer.contactInfo && <span style={{ color: 'var(--ink-3)' }}>—</span>}
      </td>
      <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {customer.creditLimit ? formatCurrency(customer.creditLimit) : '—'}
      </td>
      <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={debt ? { color: 'var(--danger)', fontFamily: 'var(--font-mono)' } : { color: 'var(--ink-3)' }}>
          <Money value={debt} />
        </span>
      </td>
      <td style={{ padding: 12, borderBottom: '1px solid var(--line)', verticalAlign: 'middle', position: 'relative' }}>
        <div className="row-actions">
          <button className="row-action" aria-label={`Mở thao tác cho ${customer.name}`} onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}>
            <MoreHorizontal size={14} />
          </button>
        </div>
        {menuOpen && (
          <div style={{
            position: 'absolute', right: 12, zIndex: 20,
            background: '#fff', border: '1px solid var(--line)', borderRadius: 8,
            boxShadow: '0 4px 14px rgba(10,10,10,0.06)', overflow: 'hidden', minWidth: 140,
            ...(index >= visibleCount - 2 && visibleCount > 2
              ? { bottom: '100%', marginBottom: 4 }
              : { top: '100%' }),
          }} onClick={(e) => e.stopPropagation()}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 'var(--fs-control)', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--ink)' }}
              onClick={onEdit}>
              <Pencil size={13} /> Sửa
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', fontSize: 'var(--fs-control)', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}
              disabled={deleting}
              onClick={onDelete}>
              {deleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} Xoá
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
