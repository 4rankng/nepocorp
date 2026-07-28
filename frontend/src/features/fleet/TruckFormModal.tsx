import { useState, useEffect } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { Modal } from '../../components/UI';
import { TrailerType, TRAILER_TYPE_LABELS } from '@tingting/shared';
import type { Truck as TruckType } from '@tingting/shared';
import { TRUCK_STATUS } from './constants';

/**
 * TruckForm rendered inside a Modal — the previous tr-based inline edit row
 * was visually cramped and easy to miss when toggled. Modal gives the form
 * proper breathing room, focused labels, and an obvious save/cancel footer.
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
  useEffect(() => {
    if (isOpen) {
      setPlate(item?.licensePlate || '');
      setCurrentTrailerId(item?.currentTrailerId ?? null);
      setStatus(item?.status || 'ACTIVE');
    }
    // Reset form fields only when the modal opens or switches item; field-level
    // deps intentionally omitted to avoid clobbering in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id]);

  const handleSave = () => {
    if (!plate.trim()) return;
    onsave({
      licensePlate: plate.trim(),
      currentTrailerId,
      status,
    });
  };
  return (
    <Modal
      isOpen={isOpen}
      title={item ? `Sửa xe ${item.licensePlate}` : 'Thêm xe đầu kéo'}
      onClose={oncancel}
      onConfirm={handleSave}
      maxWidth={680}
      footer={
        <div className="fleet-form-actions">
          <button className="btn btn--ghost btn--sm" onClick={oncancel}>
            <X size={14} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" disabled={saving || !plate.trim()} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {item ? 'Cập nhật' : 'Thêm xe'}
          </button>
        </div>
      }
    >
      <div className="fleet-form">
        <section className="fleet-form__section fleet-form__section--identity">
          <div className="fleet-form__section-head">
            <div>
              <h4>Thông tin xe</h4>
              <p>Biển số, rơ-moóc đang ghép và trạng thái vận hành.</p>
            </div>
          </div>
          <div className="fleet-form__grid fleet-form__grid--truck">
            <div className="field fleet-form__field fleet-form__field--wide">
              <label htmlFor="truck-plate">
                Biển số xe đầu kéo <span>*</span>
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
            <div className="field fleet-form__field">
              <label htmlFor="trailer-select">Rơ-moóc hiện tại</label>
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
            <div className="field fleet-form__field">
              <label htmlFor="truck-status">Trạng thái</label>
              <select id="truck-status" className="input" value={status} onChange={e => setStatus(e.target.value)}>
                {Object.entries(TRUCK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </section>

      </div>
    </Modal>
  );
}
