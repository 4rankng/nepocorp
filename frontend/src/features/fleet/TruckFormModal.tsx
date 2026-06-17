import { useState, useEffect } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { Modal } from '../../components/UI';
import { TrailerType, TRAILER_TYPE_LABELS, computeVehicleAlerts } from '@tingting/shared';
import type { Truck as TruckType, VehicleAlert } from '@tingting/shared';
import { TRUCK_STATUS } from './constants';

/**
 * TruckForm rendered inside a Modal — the previous tr-based inline edit row
 * was visually cramped and easy to miss when toggled. Modal gives the form
 * proper breathing room, focused labels, and an obvious save/cancel footer.
 *
 * N5 / A12: includes three user-keyed compliance/service date fields
 * (inspection / insurance / oil). Each shows a live alert badge derived from
 * computeVehicleAlerts — red (overdue) or amber (due within 30 days).
 */
export function TruckFormModal({ saving, item, trailers, onsave, oncancel, isOpen }: {
  saving: boolean;
  item?: TruckType;
  trailers: Array<{ id: number; licensePlate: string; type: string }>;
  onsave: (d: Record<string, unknown>) => void;
  oncancel: () => void;
  isOpen: boolean;
}) {
  const [plate, setPlate] = useState(item?.licensePlate || '');
  const [currentTrailerId, setCurrentTrailerId] = useState<number | null>(item?.currentTrailerId ?? null);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');
  // N5: date fields kept as '' when empty so <input type="date"> is controlled.
  const [nextInspectionDate, setNextInspectionDate] = useState(item?.nextInspectionDate ?? '');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState(item?.insuranceExpiryDate ?? '');
  const [lastOilServiceDate, setLastOilServiceDate] = useState(item?.lastOilServiceDate ?? '');
  useEffect(() => {
    if (isOpen) {
      setPlate(item?.licensePlate || '');
      setCurrentTrailerId(item?.currentTrailerId ?? null);
      setStatus(item?.status || 'ACTIVE');
      setNextInspectionDate(item?.nextInspectionDate ?? '');
      setInsuranceExpiryDate(item?.insuranceExpiryDate ?? '');
      setLastOilServiceDate(item?.lastOilServiceDate ?? '');
    }
    // Reset form fields only when the modal opens or switches item; field-level
    // deps intentionally omitted to avoid clobbering in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id]);

  // Live alert badges for the in-form values (fall back to the persisted item
  // when the field hasn't been touched yet, so opening the modal still shows
  // the current alert state).
  const alerts = computeVehicleAlerts({
    nextInspectionDate: (nextInspectionDate || item?.nextInspectionDate) ?? null,
    insuranceExpiryDate: (insuranceExpiryDate || item?.insuranceExpiryDate) ?? null,
    lastOilServiceDate: (lastOilServiceDate || item?.lastOilServiceDate) ?? null,
  });
  const alertFor = (field: 'nextInspectionDate' | 'insuranceExpiryDate' | 'lastOilServiceDate') =>
    alerts.find(a => a.field === field);

  const handleSave = () => {
    if (!plate.trim()) return;
    onsave({
      licensePlate: plate.trim(),
      currentTrailerId,
      status,
      // Empty string → null so the backend stores NULL (clears the date)
      // rather than failing the YYYY-MM-DD regex.
      nextInspectionDate: nextInspectionDate || null,
      insuranceExpiryDate: insuranceExpiryDate || null,
      lastOilServiceDate: lastOilServiceDate || null,
    });
  };
  return (
    <Modal
      isOpen={isOpen}
      title={item ? `Sửa xe ${item.licensePlate}` : 'Thêm xe đầu kéo'}
      onClose={oncancel}
      onConfirm={handleSave}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={oncancel}>
            <X size={14} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" disabled={saving || !plate.trim()} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {item ? 'Cập nhật' : 'Thêm xe'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label htmlFor="truck-plate" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Biển số xe đầu kéo <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="truck-plate"
            className="input"
            value={plate}
            onChange={e => setPlate(e.target.value)}
            placeholder="VD: 60C-12345"
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="trailer-select" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Rơ-moóc hiện tại
          </label>
          <select
            id="trailer-select"
            className="input"
            value={currentTrailerId ?? ''}
            onChange={e => setCurrentTrailerId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Không có —</option>
            {trailers.map(t => (
              <option key={t.id} value={t.id}>{t.licensePlate} ({TRAILER_TYPE_LABELS[t.type as TrailerType] || t.type})</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="truck-status" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Trạng thái
          </label>
          <select id="truck-status" className="input" value={status} onChange={e => setStatus(e.target.value)}>
            {Object.entries(TRUCK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* N5 / A12: compliance & service date reminders. type=date gives a native
            picker; the badge surfaces overdue/due state next to each field. */}
        <div className="truck-alert-fields">
          <TruckDateField
            id="truck-inspection"
            label="Hạn đăng kiểm"
            value={nextInspectionDate}
            onChange={setNextInspectionDate}
            alert={alertFor('nextInspectionDate')}
          />
          <TruckDateField
            id="truck-insurance"
            label="Hạn bảo hiểm"
            value={insuranceExpiryDate}
            onChange={setInsuranceExpiryDate}
            alert={alertFor('insuranceExpiryDate')}
          />
          <TruckDateField
            id="truck-oil"
            label="Thay dầu kế tiếp"
            value={lastOilServiceDate}
            onChange={setLastOilServiceDate}
            alert={alertFor('lastOilServiceDate')}
          />
        </div>
      </div>
    </Modal>
  );
}

/** One labelled date input with an optional overdue/due badge. */
function TruckDateField({ id, label, value, onChange, alert }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  // computeVehicleAlerts only returns non-'ok' entries, so this is always
  // overdue/due — typed as the full VehicleAlert for simplicity.
  alert?: VehicleAlert;
}) {
  const badgeText = alert
    ? alert.daysUntil < 0
      ? `Quá hạn ${Math.abs(alert.daysUntil)} ngày`
      : `Còn ${alert.daysUntil} ngày`
    : null;
  return (
    <div className="field truck-alert-field">
      <label htmlFor={id} className="truck-alert-field__label">
        {label}
        {badgeText && (
          <span className={`truck-alert-badge truck-alert-badge--${alert!.status}`}>
            {badgeText}
          </span>
        )}
      </label>
      <input
        id={id}
        type="date"
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
