import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  TIRE_POSITION_SUGGESTIONS,
  computeTireAlerts,
} from '@tingting/shared';
import type { Tire } from '@tingting/shared';
import type { Supplier } from '@tingting/shared';
import { StatusPill } from '../components/UI';
import { StatusStrip, StatusSwatch } from '../components/shared/StatusStrip';
import { routes } from '../lib/routes';
import {
  useTires, useCreateTire, useUpdateTire,
} from '../hooks/useTireQueries';
import { useAllSuppliers, useTrucksAndDrivers } from '../hooks/useCatalogQueries';
import './TruckTiresPage.css';

/** Editable tire fields. `cost` is a number on the wire (numeric(15,0)). */
type TirePatch = Partial<{
  serial: string;
  truckId: number | null;
  position: string | null;
  size: string | null;
  supplierId: number | null;
  cost: number;
  warrantyUntil: string | null;
  status: Tire['status'];
}>;

const TIRE_STATUS_COLORS: Record<Tire['status'], string> = {
  IN_USE: '#16A34A',
  IN_STOCK: '#2563EB',
};

const TIRE_STATUS_LEGEND: { status: Tire['status']; label: string }[] = [
  { status: 'IN_USE', label: 'Đang lắp trên xe' },
  { status: 'IN_STOCK', label: 'Lốp dự phòng' },
];

function normalizePositionText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

function cleanPositionLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

function displayTirePosition(tire: Tire): string {
  return tire.position || '—';
}

function positionPayloadFromLabel(label: string): { position: string | null } {
  const cleaned = cleanPositionLabel(label);
  return {
    position: cleaned || null,
  };
}

function buildPositionLabels(tires: Tire[]): string[] {
  const labels = [
    ...TIRE_POSITION_SUGGESTIONS,
    ...tires.map((tire) => tire.position || '').filter(Boolean),
  ];
  return Array.from(new Set(labels.map(cleanPositionLabel).filter(Boolean)));
}

function supplierName(suppliers: Supplier[], supplierId: number | null): string {
  if (!supplierId) return '—';
  return suppliers.find((supplier) => supplier.id === supplierId)?.name ?? '—';
}

function TireLegend() {
  return (
    <div className="ttp-legend" aria-label="Chú giải trạng thái lốp">
      {TIRE_STATUS_LEGEND.map((item) => (
        <span key={item.status} className="ttp-legend-item">
          <StatusSwatch color={TIRE_STATUS_COLORS[item.status]} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

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
 * with an inline add form. Warranty-expiry badge uses
 * computeTireAlerts (≤30d = warn, overdue = danger), mirroring the N5 truck
 * alert styling via StatusPill.
 */
export default function TruckTiresPage() {
  const params = useParams<{ id: string }>();
  const truckId = Number(params.id);

  const { data: trucksDrivers } = useTrucksAndDrivers({ enabled: Number.isFinite(truckId) });
  const truck = trucksDrivers?.trucks.find((t) => t.id === truckId);

  // Fetch all tires; filter to this truck + stock spares for read-only tracking.
  const { data: allTires, isLoading } = useTires();
  const { data: suppliers = [] } = useAllSuppliers();
  const tiresOnTruck = (allTires ?? []).filter((t) => t.truckId === truckId);
  const spares = (allTires ?? []).filter((t) => t.status === 'IN_STOCK');
  const positionLabels = buildPositionLabels(allTires ?? []);

  const createMut = useCreateTire();
  const updateMut = useUpdateTire();

  return (
    <div className="ttp">
      <div className="ttp-header">
        <div>
          <Link to={routes.fleet} className="ttp-back">← Quay lại đội xe</Link>
          <h1>{truck?.licensePlate ?? 'Lốp xe'}</h1>
          <div className="ttp-sub">
            Theo dõi serial lốp, vị trí lắp, ngày thay, nhà cung cấp và hạn bảo hành.
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
            positionLabels={positionLabels}
            suppliers={suppliers}
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
            <TireLegend />
          </div>
          <TireTable
            tires={tiresOnTruck}
            suppliers={suppliers}
            positionLabels={positionLabels}
            positionListId="ttp-position-options-mounted"
            loading={isLoading}
            emptyHint="Chưa có lốp nào được lắp trên xe này."
            onedit={(id, patch) => updateMut.mutate({ id, data: patch })}
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
            <TireLegend />
          </div>
          <TireTable
            tires={spares}
            suppliers={suppliers}
            positionLabels={positionLabels}
            positionListId="ttp-position-options-spares"
            loading={isLoading}
            emptyHint="Không có lốp kho."
            onedit={(id, patch) => updateMut.mutate({ id, data: patch })}
          />
        </section>
      )}
    </div>
  );
}

// ─── Add-tire inline form ───────────────────────────────────────────────────

function AddTireForm({ positionLabels, suppliers, saving, onsave }: {
  positionLabels: string[];
  suppliers: Supplier[];
  saving: boolean;
  onsave: (d: {
    serial: string;
    position: string | null;
    size: string | null;
    supplierId: number | null;
    cost: number;
    warrantyUntil: string | null;
  }) => void;
}) {
  const [serial, setSerial] = useState('');
  const [positionText, setPositionText] = useState('');
  const [size, setSize] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [cost, setCost] = useState('');
  const [warranty, setWarranty] = useState('');

  const submit = () => {
    if (!serial.trim()) return;
    const positionPayload = positionPayloadFromLabel(positionText);
    onsave({
      serial: serial.trim(),
      ...positionPayload,
      size: size.trim() || null,
      supplierId: supplierId ? Number(supplierId) : null,
      cost: cost ? Number(cost) : 0,
      warrantyUntil: warranty || null,
    });
    setSerial('');
    setPositionText('');
    setSize('');
    setSupplierId('');
    setCost('');
    setWarranty('');
  };

  return (
    <div className="ttp-add">
      <div className="ttp-field ttp-field--serial">
        <label>Serial lốp *</label>
        <input className="input" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="VD: 12345678" />
      </div>
      <div className="ttp-field">
        <label>Vị trí</label>
        <input
          className="input"
          list="ttp-position-options-add"
          value={positionText}
          onChange={(e) => setPositionText(e.target.value)}
          onBlur={() => {
            const cleaned = cleanPositionLabel(positionText);
            setPositionText(cleaned);
          }}
          placeholder="VD: Trước trái hoặc Trục nâng trái"
        />
        <PositionOptions id="ttp-position-options-add" labels={positionLabels} />
      </div>
      <div className="ttp-field">
        <label>Kích cỡ</label>
        <input className="input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="VD: 11R22.5" />
      </div>
      <div className="ttp-field">
        <label>Nhà cung cấp</label>
        <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Chưa chọn</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
          ))}
        </select>
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

function PositionOptions({ id, labels }: { id: string; labels: string[] }) {
  return (
    <datalist id={id}>
      {labels.map((label) => (
        <option key={label} value={label} />
      ))}
    </datalist>
  );
}

function PositionCell({ tire, optionsId, onedit }: {
  tire: Tire;
  optionsId: string;
  onedit: (id: number, patch: TirePatch) => void;
}) {
  const currentLabel = tire.position ?? '';

  const commit = (node: HTMLInputElement) => {
    const nextLabel = cleanPositionLabel(node.value);
    if (!nextLabel) {
      node.value = currentLabel;
      return;
    }
    if (normalizePositionText(nextLabel) === normalizePositionText(currentLabel)) {
      node.value = nextLabel;
      return;
    }
    node.value = nextLabel;
    onedit(tire.id, positionPayloadFromLabel(nextLabel));
  };

  return (
    <input
      className="input ttp-position-input"
      list={optionsId}
      defaultValue={currentLabel}
      placeholder="Gõ vị trí"
      onBlur={(e) => commit(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          e.currentTarget.value = currentLabel;
          e.currentTarget.blur();
        }
      }}
      aria-label={`Vị trí lốp ${tire.serial}`}
    />
  );
}

function TireTable({ tires, suppliers, positionLabels, positionListId, loading, emptyHint, onedit }: {
  tires: Tire[];
  suppliers: Supplier[];
  positionLabels: string[];
  positionListId: string;
  loading: boolean;
  emptyHint: string;
  onedit: (id: number, patch: TirePatch) => void;
}) {
  if (loading) return <div className="ttp-empty">Đang tải…</div>;
  if (tires.length === 0) return <div className="ttp-empty">{emptyHint}</div>;

  return (
    <div className="ttp-table-wrap">
      <PositionOptions id={positionListId} labels={positionLabels} />
      <table className="ttp-table">
        <colgroup>
          <col className="ttp-col-serial" />
          <col className="ttp-col-position" />
          <col className="ttp-col-size" />
          <col className="ttp-col-installed" />
          <col className="ttp-col-days" />
          <col className="ttp-col-supplier" />
          <col className="ttp-col-warranty" />
        </colgroup>
        <thead>
          <tr>
            <th>Serial</th>
            <th>Vị trí</th>
            <th>Kích cỡ</th>
            <th>Ngày lắp</th>
            <th>Số ngày chạy</th>
            <th>Nhà cung cấp</th>
            <th>Hạn bảo hành</th>
          </tr>
        </thead>
        <tbody>
          {tires.map((t) => {
            const alert = computeTireAlerts(t)[0];
            const days = daysInService(t.installedAt, t.removedAt);
            return (
              <tr key={t.id}>
                <td className="ttp-serial" data-label="Serial">
                  <StatusStrip color={TIRE_STATUS_COLORS[t.status]} />
                  {t.serial}
                </td>
                <td data-label="Vị trí">
                  <PositionCell tire={t} optionsId={positionListId} onedit={onedit} />
                </td>
                <td data-label="Kích cỡ">{t.size || '—'}</td>
                <td data-label="Ngày lắp">{t.installedAt || '—'}</td>
                <td data-label="Số ngày chạy">{days == null ? '—' : `${days} ngày`}</td>
                <td className="ttp-supplier" data-label="Nhà cung cấp">{supplierName(suppliers, t.supplierId)}</td>
                <td data-label="Hạn bảo hành">
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
