import { useEffect, useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { labelStyle } from '../../utils/formStyles';
import { Modal } from '../../components/UI';
import { CustomerStatus } from '@tingting/shared';
import type { Customer, Supplier } from '@tingting/shared';
import { STATUS_LABELS } from './customerUtils';

// ─── Modal-based Form ────────────────────────────────────────────────────────
//
// Was an inline <tr> form that swapped in for the row. The row-replacement
// looked cramped (5 fields squeezed into one table cell) and made it easy to
// miss that edit mode had even opened. Modal gives proper breathing room.

export function CustomerFormModal({ item, saving, onsave, oncancel, isOpen, suppliers, error }: {
  item?: Customer; saving: boolean; onsave: (d: Record<string, unknown>) => void; oncancel: () => void; isOpen: boolean; suppliers: Supplier[]; error?: string | null;
}) {
  const [name, setName] = useState(item?.name || '');
  const [taxCode, setTaxCode] = useState(item?.taxCode || '');
  const [contactPerson, setContactPerson] = useState(item?.contactPerson || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [creditLimit, setCreditLimit] = useState(item?.creditLimit || '');
  const [status, setStatus] = useState<string>(item?.status || CustomerStatus.ACTIVE);
  const [isCarrier, setIsCarrier] = useState(item?.isCarrier ?? false);
  const [debitNoteMode, setDebitNoteMode] = useState<string>(item?.debitNoteMode ?? 'MONTHLY');
  const [linkedSupplierId, setLinkedSupplierId] = useState<number | null>(item?.linkedSupplierId ?? null);

  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setTaxCode(item?.taxCode || '');
      setContactPerson(item?.contactPerson || '');
      setPhone(item?.phone || '');
      setCreditLimit(item?.creditLimit || '');
      setStatus(item?.status || CustomerStatus.ACTIVE);
      setIsCarrier(item?.isCarrier ?? false);
      setDebitNoteMode(item?.debitNoteMode ?? 'MONTHLY');
      setLinkedSupplierId(item?.linkedSupplierId ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-sync only when the target customer ID changes, not on every prop update
  }, [isOpen, item?.id]);

  const handleSave = () => {
    if (!name.trim()) return;
    onsave({
      name: name.trim(),
      taxCode: taxCode.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      creditLimit: creditLimit ? Number(creditLimit) : undefined,
      status,
      isCarrier,
      debitNoteMode,
      linkedSupplierId: linkedSupplierId ?? null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      title={item ? `Sửa khách hàng — ${item.name}` : 'Thêm khách hàng'}
      onClose={oncancel}
      onConfirm={handleSave}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={oncancel}>
            <X size={14} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {item ? 'Cập nhật' : 'Thêm khách hàng'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <p role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}
        <div className="field">
          <label htmlFor="cust-name" style={labelStyle}>
            Tên khách hàng <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input id="cust-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Tên công ty hoặc cá nhân" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="cust-tax" style={labelStyle}>Mã số thuế</label>
            <input id="cust-tax" className="input" value={taxCode} onChange={e => setTaxCode(e.target.value)} placeholder="0312…" />
          </div>
          <div className="field">
            <label htmlFor="cust-status" style={labelStyle}>Trạng thái</label>
            <select id="cust-status" className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="cust-contact" style={labelStyle}>Người liên hệ</label>
            <input id="cust-contact" className="input" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Anh Tuấn · Kế toán" />
          </div>
          <div className="field">
            <label htmlFor="cust-phone" style={labelStyle}>Điện thoại</label>
            <input id="cust-phone" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912…" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cust-credit" style={labelStyle}>Hạn mức tín dụng (đ)</label>
          <input id="cust-credit" className="input" type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="0" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="cust-debit-mode" style={labelStyle}>Giấy báo nợ</label>
            <select id="cust-debit-mode" className="input" value={debitNoteMode} onChange={e => setDebitNoteMode(e.target.value)}>
              <option value="MONTHLY">Theo tháng</option>
              <option value="PER_BATCH">Theo lô</option>
            </select>
          </div>
          <div className="field" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isCarrier}
                onChange={e => setIsCarrier(e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              <span style={{ fontSize: 'var(--fs-body)', fontWeight: 600, color: 'var(--ink-2)' }}>Đối tác vận tải (xe ngoài)</span>
            </label>
          </div>
        </div>
        <div className="field">
          <label htmlFor="cust-linked-supplier" style={labelStyle}>Nhà cung cấp liên quan</label>
          <select
            id="cust-linked-supplier"
            className="input"
            value={linkedSupplierId ?? ''}
            onChange={e => setLinkedSupplierId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- Không liên kết --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
