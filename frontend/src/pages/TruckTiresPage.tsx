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

/** Days a tire has been in service: installedAt → removedAt, or → today if still in use. (A10c) */
function daysInService(installedAt: string | null, removedAt: string | null): number | null {
  if (!installedAt) return null;
  const start = new Date(`${installedAt}T00:00:00`).getTime();
  const end = removedAt ? new Date(`${removedAt}T00:00:00`).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

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

      <div className="ttp-workbench">
        <section className="ttp-panel ttp-panel--form" aria-labelledby="ttp-add-title">
          <div className="ttp-section-head">
            <div>
              <h2 id="ttp-add-title">Thêm lốp</h2>
              <p>Nhập serial và thông tin chính cho xe này.</p>
            </div>
          </div>
          <AddTireForm
            saving={createMut.isPending}
            onsave={async (d) => { await createMut.mutateAsync({ ...d, truckId }); }}
          />
        </section>

        <section className="ttp-panel ttp-panel--table" aria-labelledby="ttp-mounted-title">
          <div className="ttp-section-head">
            <div>
              <h2 id="ttp-mounted-title">Lốp đang lắp trên xe</h2>
              <p>{tiresOnTruck.length} lốp đang theo dõi</p>
            </div>
          </div>
          <TireTable
            tires={tiresOnTruck}
            loading={isLoading}
            emptyHint="Chưa có lốp nào được lắp trên xe này."
            onremove={(id, retire) => removeMut.mutate({ id, retire })}
            onedit={(id, patch) => updateMut.mutate({ id, data: patch })}
            ondelete={(id) => deleteMut.mutate(id)}
          />
        </section>
      </div>

      {spares.length > 0 && (
        <section className="ttp-panel ttp-spares" aria-labelledby="ttp-spares-title">
          <div className="ttp-section-head">
            <div>
              <h2 id="ttp-spares-title">Lốp dự phòng trong kho</h2>
              <p>{spares.length} lốp có thể lắp lên xe này</p>
            </div>
          </div>
          <TireTable
            tires={spares}
            loading={isLoading}
            emptyHint="Không có lốp kho."
            oninstall={(id, position) => installMut.mutate({ id, truckId, position })}
            onedit={(id, patch) => updateMut.mutate({ id, data: patch })}
            ondelete={(id) => deleteMut.mutate(id)}
          />
        </section>
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
      <div className="ttp-field ttp-field--serial">
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
      <button className="btn btn--primary ttp-add-submit" disabled={saving || !serial.trim()} onClick={submit}>
        {saving ? 'Đang lưu…' : 'Thêm lốp'}
      </button>
    </div>
  );
}

// ─── Tire table ─────────────────────────────────────────────────────────────

/** Inline position picker + install button for a spare. A spare's stored
 *  position is just its last slot — let the manager choose where it mounts
 *  NOW (was previously always reusing the stale/OTHER slot). (code-review MEDIUM) */
function InstallControl({ tire, oninstall }: {
  tire: Tire;
  oninstall: (id: number, position: TirePosition | null) => void;
}) {
  const [pos, setPos] = useState<TirePosition>(tire.position ?? TirePosition.OTHER);
  return (
    <>
      <select
        className="input ttp-pos-select"
        value={pos}
        onChange={(e) => setPos(e.target.value as TirePosition)}
        aria-label="Vị trí lắp lốp"
      >
        {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{TIRE_POSITION_LABELS[p]}</option>)}
      </select>
      <button className="btn btn--primary" onClick={() => oninstall(tire.id, pos)}>
        Lắp lên xe
      </button>
    </>
  );
}

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
    <div className="ttp-table-wrap">
      <table className="ttp-table">
        <thead>
          <tr>
            <th>Serial</th>
            <th>Vị trí</th>
            <th>Kích cỡ</th>
            <th>Ngày lắp</th>
            <th>Số ngày chạy</th>
            <th>Hạn bảo hành</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tires.map((t) => {
            const alert = computeTireAlerts(t)[0];
            const days = daysInService(t.installedAt, t.removedAt);
            return (
              <tr key={t.id}>
                <td className="ttp-serial">{t.serial}</td>
                <td>{t.position ? TIRE_POSITION_LABELS[t.position] : '—'}</td>
                <td>{t.size || '—'}</td>
                <td>{t.installedAt || '—'}</td>
                <td>{days == null ? '—' : `${days} ngày`}</td>
                <td>
                  {t.warrantyUntil ? (
                    <span className="ttp-warranty">
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
                    {oninstall && <InstallControl tire={t} oninstall={oninstall} />}
                    {onremove && (
                      <>
                        <button className="btn btn--secondary" onClick={() => onremove(t.id, false)}>Tháo (về kho)</button>
                        <button className="btn btn--danger" onClick={() => onremove(t.id, true)}>Thanh lý</button>
                      </>
                    )}
                    <button className="btn btn--secondary" onClick={() => {
                      const sz = prompt('Kích cỡ mới', t.size ?? '');
                      if (sz !== null) onedit(t.id, { size: sz });
                    }}>Sửa</button>
                    <button className="btn btn--danger" onClick={() => {
                      if (confirm(`Xóa lốp "${t.serial}"?`)) ondelete(t.id);
                    }}>Xóa</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
