import { X, Check } from 'lucide-react';
import type { ReassignState, Truck, Driver } from '../utils';

interface ReassignDialogProps {
  reassignState: ReassignState;
  setReassignState: React.Dispatch<React.SetStateAction<ReassignState>>;
  trucks: Truck[];
  drivers: Driver[];
  onSave: () => void;
  onCancel: () => void;
}

export function ReassignDialog({
  reassignState,
  setReassignState,
  trucks,
  drivers,
  onSave,
  onCancel,
}: ReassignDialogProps) {
  return (
    <div className="o-assign-editor">
      <div className="row">
        <select
          value={reassignState.truckId}
          onChange={(e) =>
            setReassignState((s) => ({ ...s, truckId: e.target.value }))
          }
          disabled={reassignState.loading}
        >
          <option value="">Chọn xe đầu</option>
          {trucks
            .filter((t) => t.status !== 'MAINTENANCE')
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.licensePlate}
              </option>
            ))}
        </select>
        <select
          value={reassignState.driverId}
          onChange={(e) =>
            setReassignState((s) => ({ ...s, driverId: e.target.value }))
          }
          disabled={reassignState.loading}
        >
          <option value="">Chọn tài xế</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {reassignState.error && (
        <div className="err">{reassignState.error}</div>
      )}
      <div className="acts">
        <button
          type="button"
          className="save"
          onClick={onSave}
          disabled={reassignState.loading}
        >
          {reassignState.loading ? (
            <div
              className="spin"
              style={{
                width: 10,
                height: 10,
                border: '2px solid #fff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
              }}
            />
          ) : (
            <Check size={12} />
          )}
          Lưu
        </button>
        <button
          type="button"
          className="cancel"
          onClick={onCancel}
          disabled={reassignState.loading}
        >
          <X size={12} />
          Hủy
        </button>
      </div>
    </div>
  );
}
