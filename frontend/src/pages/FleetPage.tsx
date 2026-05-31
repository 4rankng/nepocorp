import { useState, useCallback, useMemo, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Truck, UserCheck, Plus, Search,
  Download, Filter, CheckCircle, Save, X, Loader2,
} from 'lucide-react';
import { AVATAR_COLORS, getInitials, avatarColorByName } from '../lib/avatar';
import { downloadCSV } from '../lib/csv';
import { PageHeader, Panel, StatusPill, Btn, KPI } from '../components/UI';
import { ActionBtns } from '../components/config/ActionBtns';
import { useCRUD } from '../hooks/useCRUD';
import { useFleetData } from '../hooks/useFleetData';
import { TrailerType } from '@nepocorp/shared';
import type { Truck as TruckType, Driver } from '@nepocorp/shared';

// ─── Constants ───────────────────────────────────────────────────────────────

const TRUCK_STATUS: Record<string, string> = {
  ACTIVE: 'Hoạt động', MAINTENANCE: 'Bảo trì', INACTIVE: 'Ngưng',
};
const DRIVER_STATUS: Record<string, string> = {
  ACTIVE: 'Hoạt động', INACTIVE: 'Ngưng',
};
const TRAILER_TYPE_LABELS: Record<string, string> = {
  [TrailerType.FT20]: '20FT', [TrailerType.FT40]: '40FT',
};

// ─── Static Styles ───────────────────────────────────────────────────────────

const styles = {
  emptyRow: { textAlign: 'center', padding: 32, color: 'var(--fg-3)' },
  centerAlign: { textAlign: 'center' },
  errorBanner: { textAlign: 'center', color: 'var(--danger)', padding: '8px 20px' },
  swatchSuccess: { background: 'var(--success)' },
  swatchWarning: { background: 'var(--warning)' },
  salaryMono: { fontFamily: 'var(--font-mono)', color: 'var(--ink)' },
  dotSep: { opacity: 0.5 },
  actionRow: { display: 'flex', gap: 8 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 8 },
  dotSuccess: { width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' },
  dotWarning: { width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)' },
  textSuccess: { color: 'var(--success)', fontWeight: 600 },
  textWarning: { color: 'var(--warning)', fontWeight: 600 },
  textMuted: { opacity: 0.4 },
  fontMono: { fontFamily: 'var(--font-mono)' },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AvatarInitials = memo(function AvatarInitials({ name }: { name: string }) {
  const c = avatarColorByName(name);
  return (
    <span className="fleet-avatar" style={{ background: c.bg, color: c.fg }}>
      {getInitials(name)}
    </span>
  );
});

const Plate = memo(function Plate({ plate, tag }: { plate: string; tag: string }) {
  return (
    <span className="fleet-plate">
      <span className="fleet-plate-tag">{tag}</span>
      {plate}
    </span>
  );
});

const TypeChip = memo(function TypeChip({ type }: { type: string }) {
  const cls = type === TrailerType.FT40 ? 'ft40' : 'ft20';
  return <span className={`fleet-type-chip ${cls}`}>{TRAILER_TYPE_LABELS[type] || type}</span>;
});

const StatusDot = memo(function StatusDot({ status }: { status: string }) {
  const variant = status === 'ACTIVE' ? 'success' : status === 'MAINTENANCE' ? 'warn' : 'neutral';
  const label = TRUCK_STATUS[status] || DRIVER_STATUS[status] || status;
  return <StatusPill variant={variant} dot>{label}</StatusPill>;
});

// ─── Inline edit row actions ─────────────────────────────────────────────────

function EditActions({ saving, isedit, onsave, oncancel }: {
  saving: boolean; isedit: boolean; onsave: () => void; oncancel: () => void;
}) {
  return (
    <div className="fleet-edit-actions">
      <button className="btn btn--primary btn--sm" disabled={saving} onClick={onsave}>
        {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
        {isedit ? 'Cập nhật' : 'Thêm'}
      </button>
      <button className="btn btn--ghost btn--sm" onClick={oncancel}>
        <X size={12} /> Hủy
      </button>
    </div>
  );
}

// ─── Forms ────────────────────────────────────────────────────────────────────

function TruckForm({ saving, item, onsave, oncancel }: {
  saving: boolean; item?: TruckType; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [plate, setPlate] = useState(item?.licensePlate || '');
  const [trailerPlate, setTrailerPlate] = useState(item?.trailerPlateNumber || '');
  const [trailerType, setTrailerType] = useState<string>(item?.trailerType || TrailerType.FT40);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');
  const handleSave = () => { if (!plate.trim()) return; onsave({ licensePlate: plate.trim(), trailerPlateNumber: trailerPlate.trim() || null, trailerType: trailerType as TrailerType, status }); };
  return (
    <tr className="fleet-edit-row">
      <td className="num" />
      <td>
        <input
          className="input input--sm"
          value={plate}
          onChange={e => setPlate(e.target.value)}
          placeholder="VD: 60C-12345"
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') oncancel(); }}
          autoFocus
        />
      </td>
      <td>
        <div className="fleet-edit-pair">
          <input
            className="input input--sm"
            value={trailerPlate}
            onChange={e => setTrailerPlate(e.target.value)}
            placeholder="VD: 70C-56789"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') oncancel(); }}
          />
          <select className="input input--sm fleet-edit-select-sm" value={trailerType} onChange={e => setTrailerType(e.target.value)}>
            {Object.entries(TRAILER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </td>
      <td />
      <td>
        <select className="input input--sm" value={status} onChange={e => setStatus(e.target.value)}>
          {Object.entries(TRUCK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td>
        <EditActions saving={saving} isedit={!!item} onsave={handleSave} oncancel={oncancel} />
      </td>
    </tr>
  );
}

function DriverForm({ saving, item, trucks, onsave, oncancel }: {
  saving: boolean; item?: Driver; trucks: TruckType[]; onsave: (d: Record<string, unknown>) => void; oncancel: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [baseSalary, setBaseSalary] = useState<string | number>(item?.baseSalary || '');
  const [truckId, setTruckId] = useState<number>(item?.assignedTruckId || 0);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');
  const handleSave = () => {
    if (!name.trim()) return;
    onsave({ name: name.trim(), phone: phone.trim() || undefined, baseSalary: baseSalary ? Number(baseSalary) : undefined, assignedTruckId: truckId || null, status });
  };
  return (
    <tr className="fleet-edit-row">
      <td className="num" />
      <td>
        <input
          className="input input--sm"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Họ và tên"
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') oncancel(); }}
          autoFocus
        />
      </td>
      <td>
        <input
          className="input input--sm"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="0912..."
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') oncancel(); }}
        />
      </td>
      <td>
        <select className="input input--sm" value={truckId} onChange={e => setTruckId(Number(e.target.value))}>
          <option value={0}>— Chưa phân —</option>
          {trucks.filter(t => t.status === 'ACTIVE').map(t => <option key={t.id} value={t.id}>{t.licensePlate}</option>)}
        </select>
      </td>
      <td>
        <input
          className="input input--sm"
          type="number"
          value={baseSalary}
          onChange={e => setBaseSalary(e.target.value)}
          placeholder="0"
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') oncancel(); }}
        />
      </td>
      <td>
        <select className="input input--sm" value={status} onChange={e => setStatus(e.target.value)}>
          {Object.entries(DRIVER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td>
        <EditActions saving={saving} isedit={!!item} onsave={handleSave} oncancel={oncancel} />
      </td>
    </tr>
  );
}

// ─── Card Components ─────────────────────────────────────────────────────────

function TruckCard({ trucks, driverByTruck, crud }: {
  trucks: TruckType[];
  driverByTruck: Map<number, Driver>;
  crud: ReturnType<typeof useCRUD>;
}) {
  const active = trucks.filter(t => t.status === 'ACTIVE').length;
  const maint = trucks.filter(t => t.status === 'MAINTENANCE').length;

  return (
    <Panel flush>
      <div className="fleet-card-head">
        <div className="fleet-card-lead">
          <div className="fleet-card-icon">
            <Truck size={18} />
          </div>
          <div>
            <div className="fleet-card-title">
              Xe đầu kéo <span className="count-pill">{trucks.length}</span>
            </div>
            <div className="fleet-card-sub">Quản lý đầu kéo và trạng thái hoạt động</div>
          </div>
        </div>
        <div className="fleet-card-tools">
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}>
            <Plus size={13} /> Thêm xe
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="tt-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Biển số xe đầu</th>
              <th>Rơ-moóc</th>
              <th>Tài xế gán</th>
              <th className="center">Trạng thái</th>
              <th className="actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {crud.showAddForm && !crud.editingId && (
              <TruckForm saving={crud.saving} onsave={crud.doCreate} oncancel={crud.cancelForm} />
            )}
            {trucks.length === 0 && !crud.showAddForm && (
              <tr><td colSpan={7} style={styles.emptyRow}>Chưa có dữ liệu</td></tr>
            )}
            {trucks.map((t, i) => crud.editingId === t.id
              ? <TruckForm key={`edit-${t.id}`} saving={crud.saving} item={t} onsave={d => crud.doUpdate(t.id, d)} oncancel={crud.cancelForm} />
              : (
                <tr key={t.id}>
                  <td className="num">{i + 1}</td>
                  <td><Plate plate={t.licensePlate} tag="VN" /></td>
                  <td>
                    {t.trailerPlateNumber
                      ? <span className="fleet-pair"><Plate plate={t.trailerPlateNumber} tag="RM" /> <TypeChip type={t.trailerType ?? TrailerType.FT40} /></span>
                      : <span className="fleet-unassigned">—</span>
                    }
                  </td>
                  <td>
                    {driverByTruck.has(t.id)
                      ? (
                        <span className="fleet-assigned">
                          <AvatarInitials name={driverByTruck.get(t.id)!.name} />
                          <span className="name">{driverByTruck.get(t.id)!.name}</span>
                        </span>
                      )
                      : <span className="fleet-unassigned">— Chưa phân —</span>
                    }
                  </td>
                  <td style={styles.centerAlign}><StatusDot status={t.status} /></td>
                  <td><ActionBtns id={t.id} deleting={crud.deleting} onedit={() => crud.setEditingId(t.id)} ondelete={() => crud.doDelete(t.id)} /></td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <div className="fleet-legend">
          <span className="fleet-legend-item">
            <span className="fleet-legend-swatch" style={styles.swatchSuccess} /> Hoạt động
          </span>
          <span className="fleet-legend-item">
            <span className="fleet-legend-swatch" style={styles.swatchWarning} /> Bảo trì
          </span>
        </div>
        <span>Hoạt động {active} · Bảo trì {maint}</span>
      </div>
      {crud.error && <div style={styles.errorBanner}>{crud.error}</div>}
    </Panel>
  );
}

function DriverCard({ drivers, truckMap, crud }: {
  drivers: Driver[];
  truckMap: Map<number, TruckType>;
  crud: ReturnType<typeof useCRUD>;
}) {
  const [driverSearch, setDriverSearch] = useState('');
  const totalSalary = drivers.reduce((s, d) => s + (d.baseSalary ? Number(d.baseSalary) : 0), 0);
  const unassigned = drivers.filter(d => !d.assignedTruckId).length;
  const q = driverSearch.trim().toLowerCase();
  const filteredDrivers = q
    ? drivers.filter(d => d.name.toLowerCase().includes(q) || (d.phone && d.phone.includes(q)))
    : drivers;

  return (
    <Panel flush>
      <div className="fleet-card-head">
        <div className="fleet-card-lead">
          <div className="fleet-card-icon">
            <UserCheck size={18} />
          </div>
          <div>
            <div className="fleet-card-title">
              Tài xế <span className="count-pill">{drivers.length}</span>
            </div>
            <div className="fleet-card-sub">Nhân sự lái xe, lương cơ bản và phân công xe</div>
          </div>
        </div>
        <div className="fleet-card-tools">
          <div className="fleet-mini-search">
            <Search size={14} />
            <input type="text" placeholder="Tìm tên hoặc SĐT…" value={driverSearch} onChange={e => setDriverSearch(e.target.value)} />
          </div>
          <Btn variant="ghost" size="sm" icon={<Filter size={13} />} disabled title="Sắp ra mắt">Lọc</Btn>
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}>
            <Plus size={13} /> Thêm tài xế
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="tt-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Tên tài xế</th>
              <th>SĐT</th>
              <th>Xe phân công</th>
              <th>Lương CB</th>
              <th className="center">Trạng thái</th>
              <th className="actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {crud.showAddForm && !crud.editingId && (
              <DriverForm saving={crud.saving} trucks={[...truckMap.values()]} onsave={crud.doCreate} oncancel={crud.cancelForm} />
            )}
            {drivers.length === 0 && !crud.showAddForm && (
              <tr><td colSpan={7} style={styles.emptyRow}>Chưa có dữ liệu</td></tr>
            )}
            {filteredDrivers.map((d, i) => crud.editingId === d.id
              ? <DriverForm key={`edit-${d.id}`} saving={crud.saving} item={d} trucks={[...truckMap.values()]} onsave={dd => crud.doUpdate(d.id, dd)} oncancel={crud.cancelForm} />
              : (
                <tr key={d.id}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <span className="fleet-assigned">
                      <AvatarInitials name={d.name} />
                      <span className="name">{d.name}</span>
                    </span>
                  </td>
                  <td><span className="fleet-phone">{d.phone || '—'}</span></td>
                  <td>
                    {d.assignedTruckId && truckMap.has(d.assignedTruckId)
                      ? (
                        <span className="fleet-pair">
                          {truckMap.get(d.assignedTruckId)!.licensePlate}
                        </span>
                      )
                      : <span className="fleet-unassigned">— Chưa phân —</span>
                    }
                  </td>
                  <td>
                    {d.baseSalary
                      ? <span className="fleet-salary">{Number(d.baseSalary).toLocaleString('vi-VN')}<span className="unit">VNĐ</span></span>
                      : <span className="fleet-salary empty">—</span>
                    }
                  </td>
                  <td style={styles.centerAlign}><StatusDot status={d.status} /></td>
                  <td><ActionBtns id={d.id} deleting={crud.deleting} onedit={() => crud.setEditingId(d.id)} ondelete={() => crud.doDelete(d.id)} /></td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <div className="fleet-legend">
          <span>Tổng quỹ lương: <strong style={styles.salaryMono}>{totalSalary.toLocaleString('vi-VN')} VNĐ</strong></span>
          {unassigned > 0 && (
            <>
              <span style={styles.dotSep}>·</span>
              <span>{unassigned} tài xế chưa được phân xe</span>
            </>
          )}
        </div>
        <span>Hiển thị {filteredDrivers.length}/{drivers.length}</span>
      </div>
      {crud.error && <div style={styles.errorBanner}>{crud.error}</div>}
    </Panel>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FleetPage() {
  const queryClient = useQueryClient();
  const { data: fleetData } = useFleetData();
  const trucks = fleetData?.trucks ?? [];
  const drivers = fleetData?.drivers ?? [];

  const invalidateFleet = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['fleet'] });
  }, [queryClient]);

  const truckCrud = useCRUD('/trucks', invalidateFleet);
  const driverCrud = useCRUD('/drivers', invalidateFleet);

  const { truckMap, driverByTruck, activeTrucks, maintTrucks, ft40, ft20, assignedDrivers, readyToRun } = useMemo(() => {
    const truckMap = new Map<number, TruckType>();
    trucks.forEach(t => truckMap.set(t.id, t));

    const driverByTruck = new Map<number, Driver>();
    drivers.forEach(d => { if (d.assignedTruckId) driverByTruck.set(d.assignedTruckId, d); });

    const activeTrucks = trucks.filter(t => t.status === 'ACTIVE').length;
    const maintTrucks = trucks.filter(t => t.status === 'MAINTENANCE').length;
    const ft40 = trucks.filter(t => t.trailerType === TrailerType.FT40).length;
    const ft20 = trucks.filter(t => t.trailerType === TrailerType.FT20).length;
    const assignedDrivers = drivers.filter(d => d.assignedTruckId).length;
    const readyToRun = trucks.filter(t =>
      t.status === 'ACTIVE' && driverByTruck.has(t.id),
    ).length;

    return { truckMap, driverByTruck, activeTrucks, maintTrucks, ft40, ft20, assignedDrivers, readyToRun };
  }, [trucks, drivers]);

  return (
    <div className="fleet-page fade-up">
      <PageHeader
        title="Đội xe"
        description="Quản lý xe đầu kéo, rơ-moóc và tài xế trong một trang"
        action={
          <div style={styles.actionRow}>
            <Btn variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => {
              const headers = ['Loại', 'Biển số', 'Trạng thái', 'Tài xế gán'];
              const rows = [
                ...trucks.map(t => ['Xe đầu kéo', t.licensePlate, TRUCK_STATUS[t.status] || t.status, driverByTruck.has(t.id) ? driverByTruck.get(t.id)!.name : '—']),
              ];
              downloadCSV(`doi-xe-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
            }}>Xuất Excel</Btn>
            <Btn variant="secondary" size="sm" icon={<Filter size={14} />} disabled title="Sắp ra mắt">Lọc nâng cao</Btn>
          </div>
        }
      />

      {/* KPI Strip */}
      <div className="kpi-grid">
        <KPI
          label="Xe đầu kéo"
          value={trucks.length}
          unit="xe"
          icon={Truck}
          variant="success"
          meta={
            <span style={styles.metaRow}>
              <span style={styles.dotSuccess} />
              <span style={styles.textSuccess}>{activeTrucks} hoạt động</span>
              <span style={styles.textMuted}>·</span>
              <span style={styles.dotWarning} />
              <span style={styles.textWarning}>{maintTrucks} bảo trì</span>
            </span>
          }
        />
        <KPI
          label="Rơ-moóc"
          value={ft40 + ft20}
          unit="moóc"
          icon={Truck}
          variant="info"
          meta={
            <span style={styles.metaRow}>
              <span style={styles.fontMono}>{ft40}×40FT</span>
              <span style={styles.textMuted}>·</span>
              <span style={styles.fontMono}>{ft20}×20FT</span>
            </span>
          }
        />
        <KPI
          label="Tài xế"
          value={drivers.length}
          unit="người"
          icon={UserCheck}
          variant="warn"
          meta={
            <span style={styles.metaRow}>
              <span style={styles.dotSuccess} />
              <span style={styles.textSuccess}>{drivers.length} đang làm</span>
              <span style={styles.textMuted}>·</span>
              <span>{assignedDrivers} đã phân xe</span>
            </span>
          }
        />
        <KPI
          label="Sẵn sàng chạy"
          value={readyToRun}
          unit={`/ ${activeTrucks + maintTrucks || trucks.length} đầu kéo`}
          icon={CheckCircle}
          variant="default"
          meta={
            <span style={styles.metaRow}>
              {activeTrucks === readyToRun ? (
                <span style={styles.textSuccess}>Đủ xe + tài xế</span>
              ) : (
                <>
                  <span>{readyToRun} xe sẵn sàng</span>
                  <span style={styles.textMuted}>·</span>
                  <span style={styles.textWarning}>{activeTrucks - readyToRun} cần phân xế</span>
                </>
              )}
            </span>
          }
        />
      </div>

      {/* Trucks */}
      <TruckCard trucks={trucks} driverByTruck={driverByTruck} crud={truckCrud} />

      {/* Drivers full width */}
      <DriverCard drivers={drivers} truckMap={truckMap} crud={driverCrud} />
    </div>
  );
}
