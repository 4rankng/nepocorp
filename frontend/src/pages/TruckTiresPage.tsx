import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, Check, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { TIRE_DISPOSAL_REASONS } from '@tingting/shared';
import type { Tire, TirePosition } from '@tingting/shared';
import type { Supplier } from '@tingting/shared';
import { ConfirmDialog } from '../components/UI';
import { StatusStrip, StatusSwatch } from '../components/shared/StatusStrip';
import { useToast } from '../components/shared/Toast';
import { ShareLinkButton } from '../components/shared';
import { formatErrorMessage } from '../lib/api';
import { routes } from '../lib/routes';
import { useBackShortcut } from '../hooks/useBackShortcut';
import {
  buildPositionLabels,
  buildUsedPositionLabels,
  cleanText,
  daysBetween,
  displayTirePosition,
  draftFromTire,
  normalizedCatalogLabel,
  patchFromDraft,
  positionPayloadFromLabel,
  supplierIdFromText,
  supplierName,
  tireAgeDays,
  todayISO,
  textMatches,
  type TireEditDraft,
  type TirePatch,
} from '../features/tires/tireUtils';
import {
  useTires, useCreateTire, useUpdateTire, useDeleteTire, useRemoveTire, useDisposeTire,
} from '../hooks/useTireQueries';
import {
  useAllSuppliers,
  useCreateTirePosition,
  useDeleteTirePosition,
  useTirePositions,
  useTrailers,
  useTrucksAndDrivers,
  useUpdateTirePosition,
} from '../hooks/useCatalogQueries';
import './TruckTiresPage.css';

type VehicleKind = 'truck' | 'trailer';

const TIRE_STATUS_COLORS: Record<Tire['status'], string> = {
  IN_USE: '#16A34A',
  IN_STOCK: '#2563EB',
  DISPOSED: '#9CA3AF',
};

const TIRE_STATUS_LEGEND: { status: Tire['status']; label: string }[] = [
  { status: 'IN_USE', label: 'Đang lắp trên xe' },
  { status: 'IN_STOCK', label: 'Lốp dự phòng' },
  { status: 'DISPOSED', label: 'Đã thanh lý' },
];

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
  return daysBetween(installedAt, removedAt);
}

/**
 * N1 — per-vehicle tire management page.
 *
 * Mounted on /fleet/:id/tires (truck) and /fleet/trailers/:id/tires (rơ-moóc).
 * Lists the vehicle's mounted tires (serial, position, size, installed, days in
 * service, purchase date, tire age, supplier) with an inline add form, a spare
 * pool, and a disposal (thanh lý) flow: tháo lốp → chọn giữ dự phòng hoặc thanh
 * lý kèm lý do.
 */
export default function TruckTiresPage({ vehicle = 'truck' }: { vehicle?: VehicleKind } = {}) {
  const params = useParams<{ id: string }>();
  const vehicleId = Number(params.id);
  const isTruck = vehicle === 'truck';
  const vehicleNoun = isTruck ? 'xe' : 'rơ-moóc';
  const navigate = useNavigate();
  const handleBack = () => navigate(routes.fleet);
  useBackShortcut(handleBack);

  const { data: trucksDrivers } = useTrucksAndDrivers({ enabled: isTruck && Number.isFinite(vehicleId) });
  const { data: trailers = [] } = useTrailers();
  const truck = trucksDrivers?.trucks.find((t) => t.id === vehicleId);
  const trailer = trailers.find((t) => t.id === vehicleId);
  const vehicleLabel = isTruck
    ? (truck?.licensePlate ?? 'Lốp xe')
    : (trailer?.licensePlate ?? 'Lốp rơ-moóc');

  // Fetch all tires; filter to this vehicle + stock spares + disposed for read-only tracking.
  const { data: allTires, isLoading } = useTires();
  const { data: suppliers = [] } = useAllSuppliers();
  const { data: tirePositions = [] } = useTirePositions();
  // Derived tire lists + position suggestions. Memoized so opening a dialog or
  // typing in an input doesn't re-scan the whole tire array on every render.
  const { tiresOnVehicle, spares, disposed, positionLabels, usedPositionLabels } = useMemo(() => {
    const all = allTires ?? [];
    return {
      // Mounted = assigned to THIS vehicle. (A tire created via "Thêm lốp" is
      // saved IN_USE, so it lands here and not in the spare pool below.)
      tiresOnVehicle: all.filter((t) => (isTruck ? t.truckId === vehicleId : t.trailerId === vehicleId)),
      // A true warehouse spare is IN_STOCK with no vehicle assignment. The
      // lifecycle keeps IN_STOCK ⟺ no vehicle, so this also keeps a freshly
      // removed tire (IN_STOCK, vehicle nulled) from double-listing.
      spares: all.filter((t) => t.status === 'IN_STOCK' && !t.truckId && !t.trailerId),
      disposed: all.filter((t) => t.status === 'DISPOSED'),
      positionLabels: buildPositionLabels(all, tirePositions),
      usedPositionLabels: buildUsedPositionLabels(all),
    };
  }, [allTires, tirePositions, vehicleId, isTruck]);

  const createMut = useCreateTire();
  const updateMut = useUpdateTire();
  const deleteMut = useDeleteTire();
  const removeMut = useRemoveTire();
  const disposeMut = useDisposeTire();
  const createPositionMut = useCreateTirePosition();
  const updatePositionMut = useUpdateTirePosition();
  const deletePositionMut = useDeleteTirePosition();
  const [editingTire, setEditingTire] = useState<Tire | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tire | null>(null);
  const [unmountTarget, setUnmountTarget] = useState<Tire | null>(null);
  const [positionManagerOpen, setPositionManagerOpen] = useState(false);

  const busy = updateMut.isPending || deleteMut.isPending || removeMut.isPending || disposeMut.isPending;
  const positionBusy = createPositionMut.isPending || updatePositionMut.isPending || deletePositionMut.isPending;

  const syncUsedPositionsToCatalog = async () => {
    const catalogNames = new Set(tirePositions.map((position) => normalizedCatalogLabel(position.name)));
    const missingLabels = usedPositionLabels.filter((label) => !catalogNames.has(normalizedCatalogLabel(label)));
    let nextSortOrder = computeNextSortOrder(tirePositions);

    for (const label of missingLabels) {
      try {
        await createPositionMut.mutateAsync({
          name: label,
          sortOrder: nextSortOrder,
          status: 'ACTIVE',
        });
      } catch (error) {
        console.error('Không thể đồng bộ vị trí lốp đã dùng vào danh mục', error);
      }
      nextSortOrder += 10;
    }
  };

  const openPositionManager = () => {
    setPositionManagerOpen(true);
    void syncUsedPositionsToCatalog();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await deleteMut.mutateAsync(target.id);
  };

  return (
    <div className="ttp">
      <div className="ttp-header">
        <div>
          <Link to={routes.fleet} className="ttp-back">
            <ArrowLeft size={14} />
            Quay lại đội xe
          </Link>
          <h1>{vehicleLabel}</h1>
          <div className="ttp-sub">
            Theo dõi serial lốp, vị trí lắp, ngày mua, tuổi lốp, nhà cung cấp và thanh lý lốp cũ.
          </div>
        </div>
        <div className="ttp-actions">
          <ShareLinkButton />
          <a className="ttp-primary-action" href="#ttp-add-title">
            <Plus size={15} />
            Thêm lốp
          </a>
        </div>
      </div>

      <div className="ttp-workbench">
        <section className="ttp-panel ttp-panel--form" aria-labelledby="ttp-add-title">
          <div className="ttp-section-head">
            <div>
              <h2 id="ttp-add-title">Thêm lốp</h2>
              <p>Nhập serial và thông tin chính cho {vehicleNoun} này.</p>
            </div>
            <button
              type="button"
              className="ttp-tool-btn"
              onClick={openPositionManager}
            >
              <Settings2 size={15} />
              Vị trí lốp
            </button>
          </div>
          <AddTireForm
            positionLabels={positionLabels}
            suppliers={suppliers}
            saving={createMut.isPending}
            onManagePositions={openPositionManager}
            onsave={async (d) => {
              await createMut.mutateAsync({
                ...d,
                // "Thêm lốp" on a vehicle page mounts it now: IN_USE from today
                // so it lists under this vehicle (not the spare pool) and Tháo
                // lốp / Thanh lý work without the "chưa được lắp" 409.
                status: 'IN_USE',
                installedAt: todayISO(),
                ...(isTruck ? { truckId: vehicleId } : { trailerId: vehicleId }),
              });
            }}
          />
        </section>

        <section className="ttp-panel ttp-panel--table" aria-labelledby="ttp-mounted-title">
          <div className="ttp-section-head">
            <div>
              <h2 id="ttp-mounted-title">Lốp đang lắp trên {vehicleNoun}</h2>
              <p>{tiresOnVehicle.length} lốp đang theo dõi</p>
            </div>
            <TireLegend />
          </div>
          <TireTable
            tires={tiresOnVehicle}
            suppliers={suppliers}
            loading={isLoading}
            emptyHint={`Chưa có lốp nào được lắp trên ${vehicleNoun} này.`}
            busy={busy}
            onedit={setEditingTire}
            ondelete={setDeleteTarget}
            onunmount={setUnmountTarget}
          />
        </section>
      </div>

      {spares.length > 0 && (
        <section className="ttp-panel ttp-spares" aria-labelledby="ttp-spares-title">
          <div className="ttp-section-head">
            <div>
              <h2 id="ttp-spares-title">Lốp dự phòng trong kho</h2>
              <p>{spares.length} lốp có thể lắp lên phương tiện</p>
            </div>
            <TireLegend />
          </div>
          <TireTable
            tires={spares}
            suppliers={suppliers}
            loading={isLoading}
            emptyHint="Không có lốp kho."
            busy={busy}
            onedit={setEditingTire}
            ondelete={setDeleteTarget}
          />
        </section>
      )}

      {disposed.length > 0 && (
        <section className="ttp-panel ttp-disposed" aria-labelledby="ttp-disposed-title">
          <div className="ttp-section-head">
            <div>
              <h2 id="ttp-disposed-title">Đã thanh lý</h2>
              <p>{disposed.length} lốp đã đưa ra khỏi sử dụng</p>
            </div>
          </div>
          <DisposedTireTable tires={disposed} suppliers={suppliers} />
        </section>
      )}

      {editingTire && (
        <TireEditDialog
          key={editingTire.id}
          tire={editingTire}
          suppliers={suppliers}
          positionLabels={positionLabels}
          saving={updateMut.isPending}
          onManagePositions={openPositionManager}
          oncancel={() => setEditingTire(null)}
          onsave={async (patch) => {
            await updateMut.mutateAsync({ id: editingTire.id, data: patch });
            setEditingTire(null);
          }}
        />
      )}

      {unmountTarget && (
        <UnmountTireDialog
          key={unmountTarget.id}
          tire={unmountTarget}
          saving={busy}
          oncancel={() => setUnmountTarget(null)}
          onremove={async (id) => { await removeMut.mutateAsync(id); setUnmountTarget(null); }}
          ondispose={async (id, reason) => { await disposeMut.mutateAsync({ id, reason }); setUnmountTarget(null); }}
        />
      )}

      {positionManagerOpen && (
        <TirePositionsManagerDialog
          positions={tirePositions}
          saving={positionBusy}
          oncancel={() => setPositionManagerOpen(false)}
          oncreate={(data) => createPositionMut.mutateAsync(data)}
          onupdate={(id, data) => updatePositionMut.mutateAsync({ id, data })}
          ondelete={(id) => deletePositionMut.mutateAsync(id)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        variant="danger"
        message={deleteTarget ? `Xóa lốp ${deleteTarget.serial}? Hành động này sẽ ẩn lốp khỏi danh sách theo dõi.` : ''}
        confirmLabel={deleteMut.isPending ? 'Đang xóa…' : 'Xóa lốp'}
        cancelLabel="Hủy"
        onConfirm={() => { void handleDeleteConfirm(); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Add-tire inline form ───────────────────────────────────────────────────

function AddTireForm({ positionLabels, suppliers, saving, onManagePositions, onsave }: {
  positionLabels: string[];
  suppliers: Supplier[];
  saving: boolean;
  onManagePositions: () => void;
  onsave: (d: {
    serial: string;
    position: string | null;
    size: string | null;
    supplierId: number | null;
    cost: number;
    purchasedAt: string | null;
  }) => void;
}) {
  const [serial, setSerial] = useState('');
  const [positionText, setPositionText] = useState('');
  const [size, setSize] = useState('');
  const [supplierText, setSupplierText] = useState('');
  const [cost, setCost] = useState('');
  const [purchasedAt, setPurchasedAt] = useState('');

  const submit = () => {
    if (!serial.trim()) return;
    const positionPayload = positionPayloadFromLabel(positionText);
    onsave({
      serial: serial.trim(),
      ...positionPayload,
      size: size.trim() || null,
      supplierId: supplierIdFromText(suppliers, supplierText),
      cost: cost ? Number(cost) : 0,
      purchasedAt: purchasedAt || null,
    });
    setSerial('');
    setPositionText('');
    setSize('');
    setSupplierText('');
    setCost('');
    setPurchasedAt('');
  };

  return (
    <div className="ttp-add">
      <div className="ttp-field ttp-field--serial">
        <label>Serial lốp *</label>
        <input className="input" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="VD: 12345678" />
      </div>
      <div className="ttp-field">
        <label>Vị trí</label>
        <PositionPicker
          value={positionText}
          labels={positionLabels}
          onChange={setPositionText}
          onManage={onManagePositions}
        />
      </div>
      <div className="ttp-field">
        <label>Kích cỡ</label>
        <input className="input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="VD: 11R22.5" />
      </div>
      <div className="ttp-field">
        <label>Nhà cung cấp</label>
        <SupplierPicker
          value={supplierText}
          suppliers={suppliers}
          onChange={setSupplierText}
        />
      </div>
      <div className="ttp-field">
        <label>Giá (VND)</label>
        <input className="input" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <div className="ttp-field">
        <label>Ngày mua</label>
        <input className="input" type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
      </div>
      <button className="btn btn--primary ttp-add-submit" disabled={saving || !serial.trim()} onClick={submit}>
        {saving ? 'Đang lưu…' : 'Thêm lốp'}
      </button>
    </div>
  );
}

// ─── Tire table ─────────────────────────────────────────────────────────────

function PositionPicker({ value, labels, onChange, onManage }: {
  value: string;
  labels: string[];
  onChange: (value: string) => void;
  onManage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const filteredLabels = labels
    .filter((label) => !value.trim() || textMatches(label, value))
    .slice(0, 8);

  return (
    <div className="ttp-position-picker">
      <input
        className="input"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          onChange(cleanText(value));
          window.setTimeout(() => setOpen(false), 120);
        }}
        placeholder="VD: Trước trái hoặc Trục nâng trái"
        aria-haspopup="listbox"
        aria-expanded={open}
      />
      {open && (
        <div className="ttp-position-picker-menu" role="listbox">
          {filteredLabels.length > 0 ? filteredLabels.map((label) => (
            <button
              key={label}
              type="button"
              className="ttp-position-picker-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(label);
                setOpen(false);
              }}
              role="option"
              aria-selected={cleanText(value) === label}
            >
              {label}
            </button>
          )) : (
            <div className="ttp-position-picker-empty">Không có vị trí phù hợp</div>
          )}
          <button
            type="button"
            className="ttp-position-picker-manage"
            onPointerDown={(e) => {
              e.preventDefault();
              setOpen(false);
              onManage();
            }}
          >
            <Settings2 size={15} />
            Sửa / xóa vị trí
          </button>
        </div>
      )}
    </div>
  );
}

function SupplierPicker({ value, suppliers, onChange }: {
  value: string;
  suppliers: Supplier[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filteredSuppliers = suppliers
    .filter((supplier) => !value.trim() || textMatches(supplier.name, value))
    .slice(0, 8);

  return (
    <div className="ttp-position-picker ttp-supplier-picker">
      <input
        className="input"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          onChange(cleanText(value));
          window.setTimeout(() => setOpen(false), 120);
        }}
        placeholder="Tìm nhà cung cấp"
        aria-haspopup="listbox"
        aria-expanded={open}
      />
      {open && (
        <div className="ttp-position-picker-menu ttp-supplier-picker-menu" role="listbox">
          {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              className="ttp-position-picker-option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(supplier.name);
                setOpen(false);
              }}
              role="option"
              aria-selected={cleanText(value) === cleanText(supplier.name)}
            >
              {supplier.name}
            </button>
          )) : (
            <div className="ttp-position-picker-empty">Không có nhà cung cấp phù hợp</div>
          )}
        </div>
      )}
    </div>
  );
}

type TirePositionDraft = {
  name: string;
};

function tirePositionDraft(position?: TirePosition): TirePositionDraft {
  return {
    name: position?.name ?? '',
  };
}

function tirePositionPayload(draft: TirePositionDraft, sortOrder?: number) {
  return {
    name: cleanText(draft.name),
    ...(sortOrder == null ? {} : { sortOrder }),
    status: 'ACTIVE' as TirePosition['status'],
  };
}

function sortTirePositions(positions: TirePosition[]) {
  return [...positions].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'));
}

/** Next sort_order value: 10 past the current max (or 10 for the first row). */
function computeNextSortOrder(positions: TirePosition[]): number {
  return positions.length ? Math.max(...positions.map((p) => p.sortOrder)) + 10 : 10;
}

function TirePositionsManagerDialog({ positions, saving, oncreate, onupdate, ondelete, oncancel }: {
  positions: TirePosition[];
  saving: boolean;
  oncreate: (data: { name: string; sortOrder?: number; status: TirePosition['status'] }) => Promise<unknown>;
  onupdate: (id: number, data: Partial<ReturnType<typeof tirePositionPayload>>) => Promise<unknown>;
  ondelete: (id: number) => Promise<unknown>;
  oncancel: () => void;
}) {
  const { toast } = useToast();
  const sortedPositions = sortTirePositions(positions);
  const nextSortOrder = computeNextSortOrder(sortedPositions);
  const [newDraft, setNewDraft] = useState<TirePositionDraft>(() => tirePositionDraft());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<TirePositionDraft>(() => tirePositionDraft());
  const [deleteTarget, setDeleteTarget] = useState<TirePosition | null>(null);
  const [error, setError] = useState('');

  const updateNewDraft = (key: keyof TirePositionDraft, value: string) => {
    setNewDraft((current) => ({ ...current, [key]: value }));
  };

  const updateEditDraft = (key: keyof TirePositionDraft, value: string) => {
    setEditDraft((current) => ({ ...current, [key]: value }));
  };

  const startEdit = (position: TirePosition) => {
    setEditingId(position.id);
    setEditDraft(tirePositionDraft(position));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(tirePositionDraft());
  };

  const createPosition = async () => {
    const payload = tirePositionPayload(newDraft, nextSortOrder);
    if (!payload.name) return;
    const exists = sortedPositions.some((position) => normalizedCatalogLabel(position.name) === normalizedCatalogLabel(payload.name));
    if (exists) {
      setError(`Vị trí "${payload.name}" đã có trong danh sách.`);
      return;
    }
    setError('');
    try {
      await oncreate(payload);
      setNewDraft(tirePositionDraft());
      toast({ kind: 'success', message: `Đã thêm vị trí "${payload.name}".` });
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      toast({ kind: 'error', message });
    }
  };

  const updatePosition = async (id: number) => {
    const payload = tirePositionPayload(editDraft);
    if (!payload.name) return;
    const exists = sortedPositions.some((position) =>
      position.id !== id && normalizedCatalogLabel(position.name) === normalizedCatalogLabel(payload.name),
    );
    if (exists) {
      setError(`Vị trí "${payload.name}" đã có trong danh sách.`);
      return;
    }
    setError('');
    try {
      await onupdate(id, payload);
      cancelEdit();
      toast({ kind: 'success', message: `Đã cập nhật vị trí "${payload.name}".` });
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      toast({ kind: 'error', message });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setError('');
    try {
      await ondelete(target.id);
      toast({ kind: 'success', message: `Đã xóa vị trí "${target.name}".` });
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      toast({ kind: 'error', message });
    }
  };

  return (
    <div className="ttp-dialog-overlay" role="presentation" onClick={oncancel}>
      <div
        className="ttp-dialog ttp-dialog--positions"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttp-position-manager-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ttp-dialog-head ttp-position-head">
          <div className="ttp-position-title-block">
            <span className="ttp-position-kicker">Danh mục lốp</span>
            <h2 id="ttp-position-manager-title">Vị trí lắp</h2>
            <p>Quản lý các lựa chọn xuất hiện trong ô vị trí trên trang lốp xe.</p>
          </div>
          <button type="button" className="ttp-dialog-close" onClick={oncancel} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="ttp-position-manager">
          <div className="ttp-position-create" aria-label="Thêm vị trí lốp">
            <div className="ttp-position-create-copy">
              <strong>Thêm vị trí mới</strong>
              <span>Dùng tên ngắn, dễ nhìn trên bảng lốp.</span>
            </div>
            <label className="ttp-position-control ttp-position-control--name">
              <span>Tên vị trí</span>
              <input
                className="input"
                value={newDraft.name}
                onChange={(e) => updateNewDraft('name', e.target.value)}
                onBlur={(e) => updateNewDraft('name', cleanText(e.target.value))}
                placeholder="VD: Trục nâng trái"
              />
            </label>
            <button
              type="button"
              className="btn btn--primary ttp-position-add-btn"
              onClick={() => { void createPosition(); }}
              disabled={saving || !newDraft.name.trim()}
            >
              <Plus size={16} />
              Thêm
            </button>
            {error && <div className="ttp-position-error">{error}</div>}
          </div>

          <div className="ttp-position-list">
            {sortedPositions.length === 0 ? (
              <div className="ttp-position-empty">
                <div className="ttp-position-empty-icon">
                  <Settings2 size={20} />
                </div>
                <strong>Chưa có vị trí lốp</strong>
                <span>Thêm vị trí đầu tiên để dropdown bắt đầu có lựa chọn.</span>
              </div>
            ) : sortedPositions.map((position) => {
              const isEditing = editingId === position.id;
              return (
                <div
                  key={position.id}
                  className={`ttp-position-row ${isEditing ? 'ttp-position-row--editing' : 'ttp-position-row--read'}`}
                >
                  {isEditing ? (
                    <>
                      <label className="ttp-position-control ttp-position-control--name">
                        <span>Tên vị trí</span>
                        <input
                          className="input"
                          value={editDraft.name}
                          onChange={(e) => updateEditDraft('name', e.target.value)}
                          onBlur={(e) => updateEditDraft('name', cleanText(e.target.value))}
                        />
                      </label>
                      <div className="ttp-icon-actions">
                        <button
                          type="button"
                          className="ttp-icon-btn ttp-icon-btn--save"
                          onClick={() => { void updatePosition(position.id); }}
                          disabled={saving || !editDraft.name.trim()}
                          title="Lưu vị trí"
                          aria-label={`Lưu vị trí ${position.name}`}
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          className="ttp-icon-btn"
                          onClick={cancelEdit}
                          disabled={saving}
                          title="Hủy"
                          aria-label="Hủy sửa vị trí"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ttp-position-name">
                        <span>{position.name}</span>
                        <small>Hiển thị trong dropdown</small>
                      </div>
                      <div className="ttp-icon-actions">
                        <button
                          type="button"
                          className="ttp-icon-btn"
                          onClick={() => startEdit(position)}
                          disabled={saving}
                          title="Sửa vị trí"
                          aria-label={`Sửa vị trí ${position.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="ttp-icon-btn ttp-icon-btn--danger"
                          onClick={() => setDeleteTarget(position)}
                          disabled={saving}
                          title="Xóa vị trí"
                          aria-label={`Xóa vị trí ${position.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        variant="danger"
        message={deleteTarget ? `Xóa vị trí "${deleteTarget.name}" khỏi danh sách chọn mới?` : ''}
        confirmLabel={saving ? 'Đang xóa…' : 'Xóa vị trí'}
        cancelLabel="Hủy"
        onConfirm={() => { void confirmDelete(); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function TireEditDialog({ tire, suppliers, positionLabels, saving, onManagePositions, onsave, oncancel }: {
  tire: Tire;
  suppliers: Supplier[];
  positionLabels: string[];
  saving: boolean;
  onManagePositions: () => void;
  onsave: (patch: TirePatch) => Promise<unknown> | void;
  oncancel: () => void;
}) {
  const [draft, setDraft] = useState<TireEditDraft>(() => draftFromTire(tire, suppliers));

  const updateDraft = (key: keyof TireEditDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  // ESC closes the dialog (mirrors Modal/ConfirmDialog). useBackShortcut yields
  // while this role="dialog" is open (overlayState DOM fallback), so this
  // listener owns ESC without fighting the page-level back shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') oncancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [oncancel]);

  const save = async () => {
    if (!draft.serial.trim()) return;
    await onsave(patchFromDraft(draft, suppliers));
  };

  return (
    <div className="ttp-dialog-overlay" role="presentation" onClick={oncancel}>
      <div
        className="ttp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttp-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ttp-dialog-head">
          <div>
            <h2 id="ttp-edit-title">Sửa thông tin lốp</h2>
            <p>{tire.serial}</p>
          </div>
          <button type="button" className="ttp-dialog-close" onClick={oncancel} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="ttp-edit-form">
          <div className="ttp-field ttp-field--serial">
            <label>Serial lốp *</label>
            <input
              className="input"
              value={draft.serial}
              onChange={(e) => updateDraft('serial', e.target.value)}
              autoFocus
            />
          </div>
          <div className="ttp-field">
            <label>Vị trí</label>
            <PositionPicker
              value={draft.position}
              labels={positionLabels}
              onChange={(value) => updateDraft('position', value)}
              onManage={onManagePositions}
            />
          </div>
          <div className="ttp-field">
            <label>Kích cỡ</label>
            <input className="input" value={draft.size} onChange={(e) => updateDraft('size', e.target.value)} />
          </div>
          <div className="ttp-field">
            <label>Ngày lắp</label>
            <input className="input" type="date" value={draft.installedAt} onChange={(e) => updateDraft('installedAt', e.target.value)} />
          </div>
          <div className="ttp-field">
            <label>Nhà cung cấp</label>
            <SupplierPicker
              value={draft.supplierText}
              suppliers={suppliers}
              onChange={(value) => updateDraft('supplierText', value)}
            />
          </div>
          <div className="ttp-field">
            <label>Ngày mua</label>
            <input className="input" type="date" value={draft.purchasedAt} onChange={(e) => updateDraft('purchasedAt', e.target.value)} />
          </div>
        </div>

        <div className="ttp-dialog-actions">
          <button type="button" className="btn btn--secondary" onClick={oncancel} disabled={saving}>
            Hủy
          </button>
          <button type="button" className="btn btn--primary" onClick={save} disabled={saving || !draft.serial.trim()}>
            {saving ? 'Đang lưu…' : 'Lưu cập nhật'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tháo lốp ra khỏi xe: chọn giữ làm dự phòng HOẶC thanh lý kèm lý do. */
function UnmountTireDialog({ tire, saving, oncancel, onremove, ondispose }: {
  tire: Tire;
  saving: boolean;
  oncancel: () => void;
  onremove: (id: number) => Promise<unknown> | void;
  ondispose: (id: number, reason: string) => Promise<unknown> | void;
}) {
  const [choice, setChoice] = useState<'spare' | 'dispose'>('spare');
  const [reason, setReason] = useState<string>(TIRE_DISPOSAL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  const effectiveReason = reason === 'Khác' ? customReason.trim() : reason;
  const reasonMissing = choice === 'dispose' && (reason === 'Khác' ? customReason.trim().length === 0 : false);
  const canConfirm = !reasonMissing;

  // ESC closes the dialog (mirrors the shared Modal/ConfirmDialog). useBackShortcut
  // already yields while this role="dialog" is open (overlayState DOM fallback), so
  // this listener owns the key without fighting the page-level back shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') oncancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [oncancel]);

  const confirm = async () => {
    if (choice === 'spare') {
      await onremove(tire.id);
    } else {
      if (!effectiveReason) return;
      await ondispose(tire.id, effectiveReason);
    }
  };

  return (
    <div className="ttp-dialog-overlay" role="presentation" onClick={oncancel}>
      <div
        className="ttp-dialog ttp-dialog--unmount"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttp-unmount-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ttp-dialog-head">
          <div>
            <h2 id="ttp-unmount-title">Tháo lốp ra khỏi xe</h2>
            <p>{tire.serial}{tire.position ? ` · ${tire.position}` : ''}</p>
          </div>
          <button type="button" className="ttp-dialog-close" onClick={oncancel} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="ttp-unmount-options">
          <label className={`ttp-unmount-choice ${choice === 'spare' ? 'is-active' : ''}`}>
            <input
              type="radio"
              name="unmount-choice"
              checked={choice === 'spare'}
              onChange={() => setChoice('spare')}
            />
            <span className="ttp-unmount-choice__main">
              <strong>Giữ làm lốp dự phòng</strong>
              <small>Lốp về kho, có thể lắp lại sau.</small>
            </span>
          </label>

          <label className={`ttp-unmount-choice ${choice === 'dispose' ? 'is-active' : ''}`}>
            <input
              type="radio"
              name="unmount-choice"
              checked={choice === 'dispose'}
              onChange={() => setChoice('dispose')}
            />
            <span className="ttp-unmount-choice__main">
              <strong>Thanh lý lốp</strong>
              <small>Đưa lốp ra khỏi sử dụng, ghi lý do.</small>
            </span>
          </label>
        </div>

        {choice === 'dispose' && (
          <div className="ttp-field ttp-unmount-reason">
            <label>Lý do thanh lý *</label>
            <select
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {TIRE_DISPOSAL_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {reason === 'Khác' && (
              <input
                className="input ttp-unmount-reason-custom"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Ghi lý do khác"
                maxLength={120}
                autoFocus
              />
            )}
          </div>
        )}

        <div className="ttp-dialog-actions">
          <button type="button" className="btn btn--secondary" onClick={oncancel} disabled={saving}>
            Hủy
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { void confirm(); }}
            disabled={saving || !canConfirm}
          >
            {saving ? 'Đang xử lý…' : choice === 'dispose' ? 'Thanh lý lốp' : 'Tháo lốp'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TireTable({ tires, suppliers, loading, emptyHint, busy, onedit, ondelete, onunmount }: {
  tires: Tire[];
  suppliers: Supplier[];
  loading: boolean;
  emptyHint: string;
  busy: boolean;
  onedit: (tire: Tire) => void;
  ondelete: (tire: Tire) => void;
  onunmount?: (tire: Tire) => void;
}) {
  if (loading) return <div className="ttp-empty">Đang tải…</div>;
  if (tires.length === 0) return <div className="ttp-empty">{emptyHint}</div>;

  return (
    <div className="ttp-table-wrap">
      <table className="ttp-table">
        <colgroup>
          <col className="ttp-col-serial" />
          <col className="ttp-col-position" />
          <col className="ttp-col-size" />
          <col className="ttp-col-installed" />
          <col className="ttp-col-days" />
          <col className="ttp-col-purchased" />
          <col className="ttp-col-age" />
          <col className="ttp-col-supplier" />
          <col className="ttp-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>Serial</th>
            <th>Vị trí</th>
            <th>Kích cỡ</th>
            <th>Ngày lắp</th>
            <th>Số ngày chạy</th>
            <th>Ngày mua</th>
            <th>Tuổi lốp</th>
            <th>Nhà cung cấp</th>
            <th className="ttp-actions-heading">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {tires.map((t) => {
            const days = daysInService(t.installedAt, t.removedAt);
            const age = tireAgeDays(t.purchasedAt);
            return (
              <tr key={t.id}>
                <td className="ttp-serial" data-label="Serial">
                  <StatusStrip color={TIRE_STATUS_COLORS[t.status]} />
                  {t.serial}
                </td>
                <td data-label="Vị trí">
                  {displayTirePosition(t)}
                </td>
                <td data-label="Kích cỡ">
                  {t.size || '—'}
                </td>
                <td data-label="Ngày lắp">
                  {t.installedAt || '—'}
                </td>
                <td data-label="Số ngày chạy">{days == null ? '—' : `${days} ngày`}</td>
                <td data-label="Ngày mua">{t.purchasedAt || '—'}</td>
                <td data-label="Tuổi lốp">{age == null ? '—' : `${age} ngày`}</td>
                <td className="ttp-supplier" data-label="Nhà cung cấp">
                  {supplierName(suppliers, t.supplierId)}
                </td>
                <td className="ttp-row-actions" data-label="Thao tác">
                  <div className="ttp-icon-actions">
                    {onunmount && (
                      <button
                        type="button"
                        className="ttp-icon-btn ttp-icon-btn--unmount"
                        onClick={() => onunmount(t)}
                        disabled={busy}
                        title="Tháo lốp"
                        aria-label={`Tháo lốp ${t.serial}`}
                      >
                        <ArrowDownToLine size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="ttp-icon-btn"
                      onClick={() => onedit(t)}
                      disabled={busy}
                      title="Sửa lốp"
                      aria-label={`Sửa lốp ${t.serial}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="ttp-icon-btn ttp-icon-btn--danger"
                      onClick={() => ondelete(t)}
                      disabled={busy}
                      title="Xóa lốp"
                      aria-label={`Xóa lốp ${t.serial}`}
                    >
                      <Trash2 size={15} />
                    </button>
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

/** Read-only table of disposed (thanh lý) tires — kept for traceability. */
function DisposedTireTable({ tires, suppliers }: { tires: Tire[]; suppliers: Supplier[] }) {
  return (
    <div className="ttp-table-wrap">
      <table className="ttp-table ttp-table--disposed">
        <colgroup>
          <col className="ttp-col-serial" />
          <col className="ttp-col-size" />
          <col className="ttp-col-purchased" />
          <col className="ttp-col-age" />
          <col className="ttp-col-supplier" />
          <col className="ttp-col-disposal" />
          <col className="ttp-col-disposal-date" />
        </colgroup>
        <thead>
          <tr>
            <th>Serial</th>
            <th>Kích cỡ</th>
            <th>Ngày mua</th>
            <th>Tuổi lốp</th>
            <th>Nhà cung cấp</th>
            <th>Lý do thanh lý</th>
            <th>Ngày thanh lý</th>
          </tr>
        </thead>
        <tbody>
          {tires.map((t) => {
            // Age frozen at disposal — a scrapped tire's age shouldn't keep climbing daily.
            const age = daysBetween(t.purchasedAt, t.disposalDate);
            return (
              <tr key={t.id} className="ttp-row-disposed">
                <td className="ttp-serial" data-label="Serial">
                  <StatusStrip color={TIRE_STATUS_COLORS.DISPOSED} />
                  {t.serial}
                </td>
                <td data-label="Kích cỡ">{t.size || '—'}</td>
                <td data-label="Ngày mua">{t.purchasedAt || '—'}</td>
                <td data-label="Tuổi lốp">{age == null ? '—' : `${age} ngày`}</td>
                <td className="ttp-supplier" data-label="Nhà cung cấp">{supplierName(suppliers, t.supplierId)}</td>
                <td data-label="Lý do thanh lý">{t.disposalReason || '—'}</td>
                <td data-label="Ngày thanh lý">{t.disposalDate || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
