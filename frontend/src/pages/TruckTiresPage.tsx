import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  TirePosition, TireStatus,
  TIRE_POSITION_LABELS, TIRE_STATUS_LABELS,
  computeTireAlerts,
} from '@tingting/shared';
import type { Tire } from '@tingting/shared';
import { StatusPill } from '../components/UI';

/** Editable tire fields. `cost` is a number on the wire (numeric(15,0)). */
type TirePatch = Partial<{
  serial: string;
  truckId: number | null;
  position: TirePosition | null;
  size: string | null;
  supplierId: number | null;
  cost: number;
  warrantyUntil: string | null;
  status: Tire['status'];
}>;
import { routes } from '../lib/routes';
import {
  useTires, useCreateTire, useUpdateTire, useDeleteTire,
  useInstallTire, useRemoveTire,
} from '../hooks/useTireQueries';
import { useTrucksAndDrivers } from '../hooks/useCatalogQueries';
import './TruckTiresPage.css';

const POSITION_OPTIONS = Object.values(TirePosition);

/**
 * N1 — per-truck tire management page at /fleet/:id/tires.
 *
 * Lists the truck's tires (serial, position, size, installed, warranty, status)
 * with an inline add form + install/remove actions. Warranty-expiry badge uses
 * computeTireAlerts (≤30d = warn, overdue = danger), mirroring the N5 truck
 * alert styling via StatusPill.
 *
 * Tires with status IN_STOCK (truckId null) are also shown so a manager can
 * install a spare onto this truck from the same view.
 */
export default function TruckTiresPage() {
  const params = useParams<{ id: string }>();
  const truckId = Number(params.id);

  const { data: trucksDrivers } = useTrucksAndDrivers({ enabled: Number.isFinite(truckId) });
  const truck = trucksDrivers?.trucks.find((t) => t.id === truckId);

  // Fetch all tires; filter to this truck + spares available for install.
  const { data: allTires, isLoading } = useTires();
  const tiresOnTruck = (allTires ?? []).filter((t) => t.truckId === truckId);
  const spares = (allTires ?? []).filter((t) => t.status === TireStatus.IN_STOCK);

  const createMut = useCreateTire();
  const updateMut = useUpdateTire();
  const deleteMut = useDeleteTire();
  const installMut = useInstallTire();
  const removeMut = useRemoveTire();

  return (
    <div className="ttp">
      <div className="ttp-header">
        <div>
          <Link to={routes.fleet} className="ttp-back">← Quay lại đội xe</Link>
          <h1>Lốp xe{truck ? ` — ${truck.licensePlate}` : ''}</h1>
          <div className="ttp-sub">
            Theo dõi serial lốp, vị trí lắp, hạn bảo hành và vòng đời (kho → đang dùng → thanh lý).
          </div>
        </div>
      </div>

      <AddTireForm
        saving={createMut.isPending}
        onsave={async (d) => { await createMut.mutateAsync({ ...d, truckId }); }}
      />

      <h2 style={{ fontSize: 15, fontWeight: 600, margin: '12px 0 8px', color: 'var(--fg-2)' }}>
        Lốp đang lắp trên xe ({tiresOnTruck.length})
      </h2>
      <TireTable
        tires={tiresOnTruck}
        loading={isLoading}
        emptyHint="Chưa có lốp nào được lắp trên xe này."
        onremove={(id, retire) => removeMut.mutate({ id, retire })}
        onedit={(id, patch) => updateMut.mutate({ id, data: patch })}
        ondelete={(id) => deleteMut.mutate(id)}
      />

      {spares.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 8px', color: 'var(--fg-2)' }}>
            Lốp dự phòng trong kho ({spares.length})
          </h2>
          <TireTable
            tires={spares}
            loading={isLoading}
            emptyHint="Không có lốp kho."
            oninstall={(id, position) => installMut.mutate({ id, truckId, position })}
            onedit={(id, patch) => updateMut.mutate({ id, data: patch })}
            ondelete={(id) => deleteMut.mutate(id)}
          />
        </>
      )}
    </div>
  );
}

// ─── Add-tire inline form ───────────────────────────────────────────────────

function AddTireForm({ saving, onsave }: {
  saving: boolean;
  onsave: (d: {
    serial: string;
    position: TirePosition | null;
    size: string | null;
    cost: number;
    warrantyUntil: string | null;
  }) => void;
}) {
  const [serial, setSerial] = useState('');
  const [position, setPosition] = useState<TirePosition>(TirePosition.OTHER);
  const [size, setSize] = useState('');
  const [cost, setCost] = useState('');
  const [warranty, setWarranty] = useState('');

  const submit = () => {
    if (!serial.trim()) return;
    onsave({
      serial: serial.trim(),
      position,
      size: size.trim() || null,
      cost: cost ? Number(cost) : 0,
      warrantyUntil: warranty || null,
    });
    setSerial(''); setSize(''); setCost(''); setWarranty('');
  };

  return (
    <div className="ttp-add">
      <div className="ttp-field">
        <label>Serial lốp *</label>
        <input className="input" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="VD: 12345678" />
      </div>
      <div className="ttp-field">
        <label>Vị trí</label>
        <select className="input" value={position} onChange={(e) => setPosition(e.target.value as TirePosition)}>
          {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{TIRE_POSITION_LABELS[p]}</option>)}
        </select>
      </div>
      <div className="ttp-field">
        <label>Kích cỡ</label>
        <input className="input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="VD: 11R22.5" />
      </div>
      <div className="ttp-field">
        <label>Giá (VND)</label>
        <input className="input" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <div className="ttp-field">
        <label>Hạn bảo hành</label>
        <input className="input" type="date" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
      </div>
      <button className="ttp-btn ttp-btn-primary" disabled={saving || !serial.trim()} onClick={submit}>
        {saving ? 'Đang lưu…' : 'Thêm lốp'}
      </button>
    </div>
  );
}

// ─── Tire table ─────────────────────────────────────────────────────────────

function TireTable({ tires, loading, emptyHint, oninstall, onremove, onedit, ondelete }: {
  tires: Tire[];
  loading: boolean;
  emptyHint: string;
  oninstall?: (id: number, position: TirePosition | null) => void;
  onremove?: (id: number, retire: boolean) => void;
  onedit: (id: number, patch: TirePatch) => void;
  ondelete: (id: number) => void;
}) {
  if (loading) return <div className="ttp-empty">Đang tải…</div>;
  if (tires.length === 0) return <div className="ttp-empty">{emptyHint}</div>;

  return (
    <table className="ttp-table">
      <thead>
        <tr>
          <th>Serial</th>
          <th>Vị trí</th>
          <th>Kích cỡ</th>
          <th>Ngày lắp</th>
          <th>Hạn bảo hành</th>
          <th>Trạng thái</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {tires.map((t) => {
          const alert = computeTireAlerts(t)[0];
          return (
            <tr key={t.id}>
              <td className="ttp-serial">{t.serial}</td>
              <td>{t.position ? TIRE_POSITION_LABELS[t.position] : '—'}</td>
              <td>{t.size || '—'}</td>
              <td>{t.installedAt || '—'}</td>
              <td>
                {t.warrantyUntil ? (
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {t.warrantyUntil}
                    {alert && (
                      <StatusPill variant={alert.status === 'overdue' ? 'danger' : 'warn'}>
                        {alert.status === 'overdue' ? `Quá hạn ${Math.abs(alert.daysUntil)}d` : `Còn ${alert.daysUntil}d`}
                      </StatusPill>
                    )}
                  </span>
                ) : '—'}
              </td>
              <td>
                <StatusPill variant={t.status === TireStatus.IN_USE ? 'success' : t.status === TireStatus.IN_STOCK ? 'neutral' : 'warn'}>
                  {TIRE_STATUS_LABELS[t.status]}
                </StatusPill>
              </td>
              <td>
                <div className="ttp-row-actions">
                  {oninstall && (
                    <button
                      className="ttp-btn ttp-btn-primary"
                      onClick={() => oninstall(t.id, t.position)}
                    >
                      Lắp lên xe
                    </button>
                  )}
                  {onremove && (
                    <>
                      <button className="ttp-btn" onClick={() => onremove(t.id, false)}>Tháo (về kho)</button>
                      <button className="ttp-btn ttp-btn-danger" onClick={() => onremove(t.id, true)}>Thanh lý</button>
                    </>
                  )}
                  <button className="ttp-btn" onClick={() => {
                    const sz = prompt('Kích cỡ mới', t.size ?? '');
                    if (sz !== null) onedit(t.id, { size: sz });
                  }}>Sửa</button>
                  <button className="ttp-btn ttp-btn-danger" onClick={() => {
                    if (confirm(`Xóa lốp "${t.serial}"?`)) ondelete(t.id);
                  }}>Xóa</button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
