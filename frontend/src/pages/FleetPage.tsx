import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Truck, UserCheck, Plus, Search,
  Download, Filter, CheckCircle, Save, X, Loader2,
} from 'lucide-react';
import { AVATAR_COLORS, getInitials, avatarColorByName } from '../lib/avatar';
import { downloadCSV } from '../lib/csv';
import { PageHeader, Panel, StatusPill, Btn, KPI, Modal } from '../components/UI';
import { ActionBtns } from '../components/config/ActionBtns';
import { useCRUD } from '../hooks/useCRUD';
import { useFleetData } from '../hooks/useFleetData';
import { useCatalogs } from '../hooks/useCatalogs';
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

// ─── Forms (modal-based) ─────────────────────────────────────────────────────

/**
 * TruckForm rendered inside a Modal — the previous tr-based inline edit row
 * was visually cramped and easy to miss when toggled. Modal gives the form
 * proper breathing room, focused labels, and an obvious save/cancel footer.
 */
function TruckFormModal({ saving, item, trailers, onsave, oncancel, isOpen }: {
  saving: boolean; item?: TruckType; trailers: Array<{ id: number; licensePlate: string; type: string }>; onsave: (d: Record<string, unknown>) => void; oncancel: () => void; isOpen: boolean;
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
              <option key={t.id} value={t.id}>{t.licensePlate} ({TRAILER_TYPE_LABELS[t.type] || t.type})</option>
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
      </div>
    </Modal>
  );
}

function DriverFormModal({ saving, item, trucks, onsave, oncancel, isOpen }: {
  saving: boolean; item?: Driver; trucks: TruckType[]; onsave: (d: Record<string, unknown>) => void; oncancel: () => void; isOpen: boolean;
}) {
  const [name, setName] = useState(item?.name || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [baseSalary, setBaseSalary] = useState<string | number>(item?.baseSalary || '');
  const [truckId, setTruckId] = useState<number>(item?.assignedTruckId || 0);
  const [status, setStatus] = useState(item?.status || 'ACTIVE');
  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setPhone(item?.phone || '');
      setBaseSalary(item?.baseSalary || '');
      setTruckId(item?.assignedTruckId || 0);
      setStatus(item?.status || 'ACTIVE');
    }
  }, [isOpen, item?.id]);
  const handleSave = () => {
    if (!name.trim()) return;
    onsave({
      name: name.trim(),
      phone: phone.trim() || undefined,
      baseSalary: baseSalary ? Number(baseSalary) : undefined,
      assignedTruckId: truckId || null,
      status,
    });
  };
  return (
    <Modal
      isOpen={isOpen}
      title={item ? `Sửa tài xế ${item.name}` : 'Thêm tài xế'}
      onClose={oncancel}
      onConfirm={handleSave}
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={oncancel}>
            <X size={14} /> Hủy
          </button>
          <button className="btn btn--primary btn--sm" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {item ? 'Cập nhật' : 'Thêm tài xế'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label htmlFor="driver-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
            Họ và tên <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="driver-name"
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Nguyễn Văn A"
            autoFocus
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="driver-phone" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Số điện thoại
            </label>
            <input
              id="driver-phone"
              className="input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0912…"
            />
          </div>
          <div className="field">
            <label htmlFor="driver-salary" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Lương cơ bản (VND)
            </label>
            <input
              id="driver-salary"
              className="input"
              type="number"
              value={baseSalary}
              onChange={e => setBaseSalary(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="driver-truck" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Xe phân công
            </label>
            <select id="driver-truck" className="input" value={truckId} onChange={e => setTruckId(Number(e.target.value))}>
              <option value={0}>— Chưa phân —</option>
              {trucks.filter(t => t.status === 'ACTIVE').map(t => <option key={t.id} value={t.id}>{t.licensePlate}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="driver-status" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
              Trạng thái
            </label>
            <select id="driver-status" className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(DRIVER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Card Components ─────────────────────────────────────────────────────────

function TruckCard({ trucks, driverByTruck, trailers, crud }: {
  trucks: TruckType[];
  driverByTruck: Map<number, Driver>;
  trailers: Array<{ id: number; licensePlate: string; type: string }>;
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
            {trucks.length === 0 && (
              <tr><td colSpan={7} style={styles.emptyRow}>Chưa có dữ liệu</td></tr>
            )}
            {trucks.map((t, i) => (
              <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => crud.setEditingId(t.id)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); crud.setEditingId(t.id); } }}>
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
                <td onClick={e => e.stopPropagation()}><ActionBtns id={t.id} deleting={crud.deleting} onedit={() => crud.setEditingId(t.id)} ondelete={() => crud.doDelete(t.id)} /></td>
              </tr>
            ))}
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
      <TruckFormModal
        key={crud.editingId ?? (crud.showAddForm ? 'add' : 'closed')}
        isOpen={crud.showAddForm || crud.editingId != null}
        saving={crud.saving}
        item={crud.editingId != null ? trucks.find(t => t.id === crud.editingId) : undefined}
        trailers={trailers}
        onsave={d => {
          if (crud.editingId != null) crud.doUpdate(crud.editingId, d);
          else crud.doCreate(d);
        }}
        oncancel={crud.cancelForm}
      />
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
            {drivers.length === 0 && (
              <tr><td colSpan={7} style={styles.emptyRow}>Chưa có dữ liệu</td></tr>
            )}
            {filteredDrivers.map((d, i) => (
              <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => crud.setEditingId(d.id)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); crud.setEditingId(d.id); } }}>
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
                <td onClick={e => e.stopPropagation()}><ActionBtns id={d.id} deleting={crud.deleting} onedit={() => crud.setEditingId(d.id)} ondelete={() => crud.doDelete(d.id)} /></td>
              </tr>
            ))}
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
      <DriverFormModal
        key={crud.editingId ?? (crud.showAddForm ? 'add' : 'closed')}
        isOpen={crud.showAddForm || crud.editingId != null}
        saving={crud.saving}
        item={crud.editingId != null ? drivers.find(d => d.id === crud.editingId) : undefined}
        trucks={[...truckMap.values()]}
        onsave={dd => {
          if (crud.editingId != null) crud.doUpdate(crud.editingId, dd);
          else crud.doCreate(dd);
        }}
        oncancel={crud.cancelForm}
      />
    </Panel>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FleetPage() {
  const queryClient = useQueryClient();
  const { data: fleetData } = useFleetData();
  const { data: catalog } = useCatalogs();
  const trucks = fleetData?.trucks ?? [];
  const drivers = fleetData?.drivers ?? [];
  const trailers = catalog?.trailers ?? [];

  const invalidateFleet = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['fleet'] });
  }, [queryClient]);

  const truckCrud = useCRUD('/trucks', invalidateFleet);
  const driverCrud = useCRUD('/drivers', invalidateFleet);

  const { truckMap, driverByTruck, activeTrucks, maintTrucks, assignedDrivers, activeDrivers, readyToRun } = useMemo(() => {
    const truckMap = new Map<number, TruckType>();
    trucks.forEach(t => truckMap.set(t.id, t));

    const driverByTruck = new Map<number, Driver>();
    drivers.forEach(d => { if (d.assignedTruckId) driverByTruck.set(d.assignedTruckId, d); });

    const activeTrucks = trucks.filter(t => t.status === 'ACTIVE').length;
    const maintTrucks = trucks.filter(t => t.status === 'MAINTENANCE').length;
    const assignedDrivers = drivers.filter(d => d.assignedTruckId).length;
    const activeDrivers = drivers.filter(d => d.status === 'ACTIVE').length;
    const readyToRun = trucks.filter(t =>
      t.status === 'ACTIVE' && driverByTruck.has(t.id),
    ).length;

    return { truckMap, driverByTruck, activeTrucks, maintTrucks, assignedDrivers, activeDrivers, readyToRun };
  }, [trucks, drivers]);

  const ft40 = trailers.filter(t => t.type === TrailerType.FT40).length;
  const ft20 = trailers.filter(t => t.type === TrailerType.FT20).length;

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
          value={activeDrivers}
          unit="người"
          icon={UserCheck}
          variant="warn"
          meta={
            <span style={styles.metaRow}>
              <span style={styles.dotSuccess} />
              <span style={styles.textSuccess}>{activeDrivers} đang làm</span>
              <span style={styles.textMuted}>·</span>
              <span>{assignedDrivers}/{activeDrivers} đã phân xe</span>
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
              {readyToRun >= activeTrucks ? (
                <span style={styles.textSuccess}>Đủ xe + tài xế</span>
              ) : (
                <>
                  <span>{readyToRun} xe sẵn sàng</span>
                  <span style={styles.textMuted}>·</span>
                  <span style={styles.textWarning}>{activeTrucks - readyToRun} cần phân xe</span>
                </>
              )}
            </span>
          }
        />
      </div>

      {/* Trucks */}
      <TruckCard trucks={trucks} driverByTruck={driverByTruck} trailers={trailers} crud={truckCrud} />

      {/* Drivers full width */}
      <DriverCard drivers={drivers} truckMap={truckMap} crud={driverCrud} />
    </div>
  );
}
