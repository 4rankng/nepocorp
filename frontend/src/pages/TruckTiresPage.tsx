import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, ArrowLeftRight, ArrowUpToLine, Check, ChevronDown, MoreVertical, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import { TIRE_DISPOSAL_REASONS } from '@tingting/shared';
import type { Tire, TirePosition } from '@tingting/shared';
import type { Supplier } from '@tingting/shared';
import { ConfirmDialog } from '../components/UI';
import { StatusStrip, StatusSwatch } from '../components/shared/StatusStrip';
import { useToast } from '../components/shared/Toast';
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
  useTires, useCreateTire, useUpdateTire, useDeleteTire, useInstallTire, useRemoveTire, useDisposeTire, useTransferTire,
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
type PositionManagerOpener = (onSelect?: (value: string) => void) => void;

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

/** Positions already taken by an IN_USE tire on a given vehicle — fast feedback
 *  in the install/transfer dialogs that mirrors the backend 409. Labels and the
 *  stored `position` are the same cleaned string, so this compares apples-to-apples. */
function occupiedPositionsOn(tires: Tire[], kind: VehicleKind, vehicleId: number): Set<string> {
  const set = new Set<string>();
  for (const t of tires) {
    if (t.status !== 'IN_USE') continue;
    const onThis = kind === 'truck' ? t.truckId === vehicleId : t.trailerId === vehicleId;
    if (onThis && t.position) set.add(t.position);
  }
  return set;
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

  // Trucks are fetched on trailer pages too so the transfer dialog can list
  // every other vehicle as a move target (a mounted trailer tire can go to a truck).
  const { data: trucksDrivers } = useTrucksAndDrivers({ enabled: Number.isFinite(vehicleId) });
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

  // Every other truck + trailer, by plate, as a transfer target (excluding the
  // current vehicle so a tire can't be "moved" onto the vehicle it's already on).
  const transferVehicles = useMemo(() => {
    const truckOpts = (trucksDrivers?.trucks ?? [])
      .filter((t) => !(isTruck && t.id === vehicleId))
      .map((t) => ({ id: t.id, kind: 'truck' as const, label: t.licensePlate }));
    const trailerOpts = trailers
      .filter((t) => !(!isTruck && t.id === vehicleId))
      .map((t) => ({ id: t.id, kind: 'trailer' as const, label: t.licensePlate }));
    return [...truckOpts, ...trailerOpts];
  }, [trucksDrivers, trailers, isTruck, vehicleId]);

  const createMut = useCreateTire();
  const updateMut = useUpdateTire();
  const deleteMut = useDeleteTire();
  const removeMut = useRemoveTire();
  const disposeMut = useDisposeTire();
  const installMut = useInstallTire();
  const transferMut = useTransferTire();
  const createPositionMut = useCreateTirePosition();
  const updatePositionMut = useUpdateTirePosition();
  const deletePositionMut = useDeleteTirePosition();
  const [editingTire, setEditingTire] = useState<Tire | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tire | null>(null);
  const [unmountTarget, setUnmountTarget] = useState<Tire | null>(null);
  const [installTarget, setInstallTarget] = useState<Tire | null>(null);
  const [transferTarget, setTransferTarget] = useState<Tire | null>(null);
  const [positionManagerOpen, setPositionManagerOpen] = useState(false);
  const [positionManagerSelect, setPositionManagerSelect] = useState<((value: string) => void) | null>(null);
  const { toast } = useToast();

  const busy = updateMut.isPending || deleteMut.isPending || removeMut.isPending || disposeMut.isPending || installMut.isPending || transferMut.isPending;
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

  const openPositionManager = (onSelect?: (value: string) => void) => {
    setPositionManagerSelect(() => onSelect ?? null);
    setPositionManagerOpen(true);
    void syncUsedPositionsToCatalog();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMut.mutateAsync(target.id);
      toast({ kind: 'success', message: 'Đã xóa lốp.' });
    } catch (err) {
      toast({ kind: 'error', message: formatErrorMessage(err) });
    }
  };

  return (
    <div className="ttp">
      <div className="ttp-header">
        <div>
          <Link to={routes.fleet} className="ttp-back">
            <ArrowLeft size={14} />
            Quay lại đội xe
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/assets/icons/04-truck-xe-tai.png" alt="" style={{ width: 32, height: 32, flexShrink: 0 }} />
            {vehicleLabel}
          </h1>
          <div className="ttp-sub">
            Theo dõi serial lốp, vị trí lắp, ngày mua, tuổi lốp, nhà cung cấp và thanh lý lốp cũ.
          </div>
        </div>
        <div className="ttp-actions">
          <a id="ttp-add-trigger" className="ttp-primary-action" href="#ttp-add-title">
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
              onClick={() => openPositionManager()}
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
              try {
                await createMut.mutateAsync({
                  ...d,
                  status: 'IN_USE',
                  installedAt: todayISO(),
                  ...(isTruck ? { truckId: vehicleId } : { trailerId: vehicleId }),
                });
                toast({ kind: 'success', message: 'Đã thêm lốp thành công' });
              } catch (err) {
                toast({ kind: 'error', message: formatErrorMessage(err) });
                throw err;
              }
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
            ontransfer={setTransferTarget}
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
            oninstall={setInstallTarget}
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
            try {
              await updateMut.mutateAsync({ id: editingTire.id, data: patch });
              toast({ kind: 'success', message: 'Cập nhật lốp thành công' });
              setEditingTire(null);
            } catch (err) {
              toast({ kind: 'error', message: formatErrorMessage(err) });
              throw err;
            }
          }}
        />
      )}

      {unmountTarget && (
        <UnmountTireDialog
          key={unmountTarget.id}
          tire={unmountTarget}
          saving={busy}
          oncancel={() => setUnmountTarget(null)}
          onremove={async (id) => {
            try {
              await removeMut.mutateAsync(id);
              toast({ kind: 'success', message: 'Đã tháo lốp về kho' });
              setUnmountTarget(null);
            } catch (err) {
              toast({ kind: 'error', message: formatErrorMessage(err) });
            }
          }}
          ondispose={async (id, reason) => {
            try {
              await disposeMut.mutateAsync({ id, reason });
              toast({ kind: 'success', message: 'Đã thanh lý lốp' });
              setUnmountTarget(null);
            } catch (err) {
              toast({ kind: 'error', message: formatErrorMessage(err) });
            }
          }}
        />
      )}

      {installTarget && (
        <InstallTireDialog
          key={installTarget.id}
          tire={installTarget}
          tires={allTires ?? []}
          isTruck={isTruck}
          vehicleId={vehicleId}
          vehicleLabel={vehicleLabel}
          positionLabels={positionLabels}
          saving={installMut.isPending}
          onManagePositions={openPositionManager}
          oncancel={() => setInstallTarget(null)}
          oninstall={async (payload) => {
            try {
              await installMut.mutateAsync({ id: installTarget.id, ...payload });
              toast({ kind: 'success', message: 'Lắp lốp thành công' });
              setInstallTarget(null);
            } catch (err) {
              toast({ kind: 'error', message: formatErrorMessage(err) });
            }
          }}
        />
      )}

      {transferTarget && (
        <TransferTireDialog
          key={transferTarget.id}
          tire={transferTarget}
          tires={allTires ?? []}
          vehicles={transferVehicles}
          currentVehicleLabel={vehicleLabel}
          positionLabels={positionLabels}
          saving={transferMut.isPending}
          onManagePositions={openPositionManager}
          oncancel={() => setTransferTarget(null)}
          ontransfer={async (payload) => {
            try {
              await transferMut.mutateAsync({ id: transferTarget.id, ...payload });
              toast({ kind: 'success', message: 'Điều chuyển lốp thành công' });
              setTransferTarget(null);
            } catch (err) {
              toast({ kind: 'error', message: formatErrorMessage(err) });
            }
          }}
        />
      )}

      {positionManagerOpen && (
        <TirePositionsManagerDialog
          positions={tirePositions}
          saving={positionBusy}
          onselect={positionManagerSelect ?? undefined}
          oncancel={() => {
            setPositionManagerOpen(false);
            setPositionManagerSelect(null);
          }}
          oncreate={(data) => createPositionMut.mutateAsync(data)}
          onupdate={(id, data) => updatePositionMut.mutateAsync({ id, data })}
          ondelete={(id) => deletePositionMut.mutateAsync(id)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        variant="danger"
        message={deleteTarget ? `Xóa lốp ${deleteTarget.serial}? Hành động này sẽ xóa hẳn lốp khỏi hệ thống.` : ''}
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
  onManagePositions: PositionManagerOpener;
  onsave: (d: {
    serial: string;
    position: string | null;
    size: string | null;
    supplierId: number | null;
    cost: number;
    purchasedAt: string | null;
  }) => Promise<unknown> | void;
}) {
  const [serial, setSerial] = useState('');
  const [positionText, setPositionText] = useState('');
  const [size, setSize] = useState('');
  const [supplierText, setSupplierText] = useState('');
  const [cost, setCost] = useState('');
  const [purchasedAt, setPurchasedAt] = useState('');

  const submit = async () => {
    if (!serial.trim()) return;
    const positionPayload = positionPayloadFromLabel(positionText);
    try {
      await onsave({
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
    } catch {
      // Error handled by parent
    }
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

function useFloatingPickerMenu(
  open: boolean,
  itemCount: number,
  onClose: () => void,
  options: { maxWidth?: number; maxHeight?: number } = {},
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>(undefined);
  const maxWidth = options.maxWidth ?? 420;
  const maxHeightLimit = options.maxHeight ?? 280;

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(undefined);
      return;
    }

    const updateMenuPosition = () => {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (!root || !menu) return;

      const rect = root.getBoundingClientRect();
      const gap = 8;
      const viewportPadding = 8;
      const menuWidth = Math.min(rect.width, maxWidth, window.innerWidth - viewportPadding * 2);
      const availableBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const availableAbove = rect.top - gap - viewportPadding;
      const openUp = availableBelow < 180 && availableAbove > availableBelow;
      const maxHeight = Math.max(180, Math.min(maxHeightLimit, openUp ? availableAbove : availableBelow));

      setMenuStyle({
        top: openUp ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap,
        left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding)),
        width: menuWidth,
        maxHeight,
        visibility: 'visible',
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [itemCount, maxHeightLimit, maxWidth, open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  return { rootRef, menuRef, menuStyle };
}

function PositionPicker({ value, labels, onChange, onManage }: {
  value: string;
  labels: string[];
  onChange: (value: string) => void;
  onManage: (onSelect?: (value: string) => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);
  const { rootRef, menuRef, menuStyle } = useFloatingPickerMenu(open, labels.length, closeMenu);
  const selectedLabel = cleanText(value);

  return (
    <div ref={rootRef} className="ttp-position-picker">
      <button
        type="button"
        className={`input ttp-position-select-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedLabel ? '' : 'ttp-position-select-placeholder'}>
          {selectedLabel || 'Chọn vị trí lắp'}
        </span>
        <ChevronDown size={16} className="ttp-position-select-chevron" />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="ttp-position-picker-menu ttp-position-picker-menu--floating"
          role="listbox"
          style={menuStyle ?? { visibility: 'hidden' }}
        >
          {labels.length > 0 ? labels.map((label) => (
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
              aria-selected={selectedLabel === label}
            >
              {label}
            </button>
          )) : (
            <div className="ttp-position-picker-empty">Chưa có vị trí lốp</div>
          )}
          <button
            type="button"
            className="ttp-position-picker-manage"
            onPointerDown={(e) => {
              e.preventDefault();
              setOpen(false);
              onManage((label) => onChange(label));
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
  const closeMenu = () => setOpen(false);
  const { rootRef, menuRef, menuStyle } = useFloatingPickerMenu(open, filteredSuppliers.length, closeMenu);

  return (
    <div ref={rootRef} className="ttp-position-picker ttp-supplier-picker">
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
        <div
          ref={menuRef}
          className="ttp-position-picker-menu ttp-position-picker-menu--floating ttp-supplier-picker-menu"
          role="listbox"
          style={menuStyle ?? { visibility: 'hidden' }}
        >
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

function TirePositionsManagerDialog({ positions, saving, onselect, oncreate, onupdate, ondelete, oncancel }: {
  positions: TirePosition[];
  saving: boolean;
  onselect?: (value: string) => void;
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
      if (onselect) {
        onselect(payload.name);
        oncancel();
      }
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
                        <button
                          type="button"
                          className="ttp-position-select"
                          onClick={() => {
                            if (!onselect) return;
                            onselect(position.name);
                            oncancel();
                          }}
                          disabled={!onselect}
                        >
                          <span>{position.name}</span>
                          <small>{onselect ? 'Chọn vị trí này' : 'Hiển thị trong dropdown'}</small>
                        </button>
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
  onManagePositions: PositionManagerOpener;
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
          <div className="ttp-field">
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

function TireTable({ tires, suppliers, loading, emptyHint, busy, onedit, ondelete, onunmount, oninstall, ontransfer }: {
  tires: Tire[];
  suppliers: Supplier[];
  loading: boolean;
  emptyHint: string;
  busy: boolean;
  onedit: (tire: Tire) => void;
  ondelete: (tire: Tire) => void;
  onunmount?: (tire: Tire) => void;
  oninstall?: (tire: Tire) => void;
  ontransfer?: (tire: Tire) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Only one row menu open at a time; close on outside click / Escape.
  useEffect(() => {
    if (openMenuId == null) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.ttp-kebab-root')) setOpenMenuId(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenuId(null); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

  const handleTableKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.currentTarget.scrollBy({
      left: e.key === 'ArrowRight' ? 220 : -220,
      behavior: 'smooth',
    });
  };

  if (loading) return <div className="ttp-empty">Đang tải…</div>;
  if (tires.length === 0) return <div className="ttp-empty">{emptyHint}</div>;

  return (
    <div
      className="ttp-table-wrap"
      tabIndex={0}
      role="region"
      aria-label="Bảng lốp, dùng phím mũi tên trái phải để cuộn ngang"
      onKeyDown={handleTableKeyDown}
    >
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
            <th className="ttp-actions-heading" aria-label="Tác vụ"></th>
          </tr>
        </thead>
        <tbody>
          {tires.map((t, index) => {
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
                <td className="ttp-row-actions">
                  <TireRowActions
                    tire={t}
                    index={index}
                    total={tires.length}
                    open={openMenuId === t.id}
                    onOpenChange={(o) => setOpenMenuId(o ? t.id : null)}
                    busy={busy}
                    oninstall={oninstall}
                    ontransfer={ontransfer}
                    onunmount={onunmount}
                    onedit={onedit}
                    ondelete={ondelete}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Per-row 3-dot (kebab) action menu. The trigger is icon-only (the universal
 * "more" affordance); every item inside carries a Vietnamese label + icon so the
 * action is unambiguous (q2). Items render only when their callback is present,
 * so the same component serves mounted rows (transfer/unmount/edit/delete) and
 * spare rows (install/edit/delete).
 */
function TireRowActions({ tire, index, total, open, onOpenChange, busy, oninstall, ontransfer, onunmount, onedit, ondelete }: {
  tire: Tire;
  index: number;
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  oninstall?: (tire: Tire) => void;
  ontransfer?: (tire: Tire) => void;
  onunmount?: (tire: Tire) => void;
  onedit: (tire: Tire) => void;
  ondelete: (tire: Tire) => void;
}) {
  const flipUp = total > 2 && index >= total - 2;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>(undefined);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(undefined);
      return;
    }

    const updateMenuPosition = () => {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (!root || !menu) return;

      const triggerRect = root.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 4;
      const viewportPadding = 8;
      const preferredTop = flipUp ? triggerRect.top - menuRect.height - gap : triggerRect.bottom + gap;
      const fallbackTop = flipUp ? triggerRect.bottom + gap : triggerRect.top - menuRect.height - gap;
      const preferredFits = preferredTop >= viewportPadding
        && preferredTop + menuRect.height <= window.innerHeight - viewportPadding;
      const rawTop = preferredFits ? preferredTop : fallbackTop;
      const maxLeft = window.innerWidth - menuRect.width - viewportPadding;

      setMenuStyle({
        top: Math.max(viewportPadding, Math.min(rawTop, window.innerHeight - menuRect.height - viewportPadding)),
        left: Math.max(viewportPadding, Math.min(triggerRect.right - menuRect.width, maxLeft)),
        visibility: 'visible',
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [flipUp, open]);

  const run = (fn: (tire: Tire) => void) => {
    onOpenChange(false);
    fn(tire);
  };

  return (
    <div ref={rootRef} className={`ttp-kebab-root ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className={`ttp-kebab ${open ? 'is-active' : ''}`}
        onClick={() => onOpenChange(!open)}
        disabled={busy}
        title="Thao tác"
        aria-label={open ? 'Đóng menu thao tác' : `Thao tác với lốp ${tire.serial}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="ttp-kebab__menu"
          role="menu"
          style={menuStyle ?? { visibility: 'hidden' }}
        >
          {oninstall && (
            <button type="button" className="ttp-kebab__item" role="menuitem" disabled={busy} onClick={() => run(oninstall)}>
              <ArrowUpToLine size={14} />
              Lắp lốp lên xe
            </button>
          )}
          {ontransfer && (
            <button type="button" className="ttp-kebab__item" role="menuitem" disabled={busy} onClick={() => run(ontransfer)}>
              <ArrowLeftRight size={14} />
              Chuyển sang xe khác
            </button>
          )}
          {onunmount && (
            <button type="button" className="ttp-kebab__item" role="menuitem" disabled={busy} onClick={() => run(onunmount)}>
              <ArrowDownToLine size={14} />
              Tháo lốp
            </button>
          )}
          <button type="button" className="ttp-kebab__item" role="menuitem" disabled={busy} onClick={() => run(onedit)}>
            <Pencil size={14} />
            Sửa
          </button>
          <button type="button" className="ttp-kebab__item ttp-kebab__item--danger" role="menuitem" disabled={busy} onClick={() => run(ondelete)}>
            <Trash2 size={14} />
            Xoá
          </button>
        </div>
      )}
    </div>
  );
}

/** Mount a spare (IN_STOCK) tire onto this vehicle. Position optional but blocked
 *  if another IN_USE tire already fills it. */
function InstallTireDialog({ tire, tires, isTruck, vehicleId, vehicleLabel, positionLabels, saving, onManagePositions, oncancel, oninstall }: {
  tire: Tire;
  tires: Tire[];
  isTruck: boolean;
  vehicleId: number;
  vehicleLabel: string;
  positionLabels: string[];
  saving: boolean;
  onManagePositions: PositionManagerOpener;
  oncancel: () => void;
  oninstall: (payload: { truckId?: number | null; trailerId?: number | null; position?: string | null }) => Promise<unknown> | void;
}) {
  const [positionText, setPositionText] = useState(tire.position ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') oncancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [oncancel]);

  const occupied = occupiedPositionsOn(tires, isTruck ? 'truck' : 'trailer', vehicleId);
  const chosenRaw = positionPayloadFromLabel(positionText).position;
  const positionTaken = !!chosenRaw && occupied.has(chosenRaw);

  const confirm = async () => {
    if (positionTaken) return;
    setError('');
    try {
      await oninstall({
        ...(isTruck ? { truckId: vehicleId } : { trailerId: vehicleId }),
        position: chosenRaw,
      });
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  };

  return (
    <div className="ttp-dialog-overlay" role="presentation" onClick={oncancel}>
      <div
        className="ttp-dialog ttp-dialog--unmount"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttp-install-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ttp-dialog-head">
          <div>
            <h2 id="ttp-install-title">Lắp lốp lên xe</h2>
            <p>{tire.serial} · {vehicleLabel}</p>
          </div>
          <button type="button" className="ttp-dialog-close" onClick={oncancel} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="ttp-edit-form">
          <div className="ttp-field ttp-field--serial">
            <label>Vị trí lắp</label>
            <PositionPicker
              value={positionText}
              labels={positionLabels}
              onChange={setPositionText}
              onManage={onManagePositions}
            />
            {positionTaken && (
              <div className="ttp-position-error">Vị trí này trên {vehicleLabel} đã có lốp.</div>
            )}
            {error && <div className="ttp-position-error">{error}</div>}
          </div>
        </div>

        <div className="ttp-dialog-actions">
          <button type="button" className="btn btn--secondary" onClick={oncancel} disabled={saving}>
            Hủy
          </button>
          <button type="button" className="btn btn--primary" onClick={() => { void confirm(); }} disabled={saving || positionTaken}>
            {saving ? 'Đang xử lý…' : 'Lắp lốp'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Move a mounted tire to another vehicle in one step (preserves install date). */
function TransferTireDialog({ tire, tires, vehicles, currentVehicleLabel, positionLabels, saving, onManagePositions, oncancel, ontransfer }: {
  tire: Tire;
  tires: Tire[];
  vehicles: { id: number; kind: 'truck' | 'trailer'; label: string }[];
  currentVehicleLabel: string;
  positionLabels: string[];
  saving: boolean;
  onManagePositions: PositionManagerOpener;
  oncancel: () => void;
  ontransfer: (payload: { truckId?: number | null; trailerId?: number | null; position?: string | null }) => Promise<unknown> | void;
}) {
  const [targetKey, setTargetKey] = useState('');
  const [positionText, setPositionText] = useState(tire.position ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') oncancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [oncancel]);

  const target = vehicles.find((v) => `${v.kind}:${v.id}` === targetKey) ?? null;
  const chosenRaw = positionPayloadFromLabel(positionText).position;
  const positionTaken = target
    ? !!chosenRaw && occupiedPositionsOn(tires, target.kind, target.id).has(chosenRaw)
    : false;

  const confirm = async () => {
    if (!target || positionTaken) return;
    setError('');
    try {
      await ontransfer({
        ...(target.kind === 'truck' ? { truckId: target.id } : { trailerId: target.id }),
        position: chosenRaw,
      });
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  };

  return (
    <div className="ttp-dialog-overlay" role="presentation" onClick={oncancel}>
      <div
        className="ttp-dialog ttp-dialog--unmount"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttp-transfer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ttp-dialog-head">
          <div>
            <h2 id="ttp-transfer-title">Chuyển lốp sang xe khác</h2>
            <p>{tire.serial} · đang trên {currentVehicleLabel}</p>
          </div>
          <button type="button" className="ttp-dialog-close" onClick={oncancel} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="ttp-edit-form">
          <div className="ttp-field">
            <label>Phương tiện nhận lốp *</label>
            <select className="input" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
              <option value="">— Chọn xe / rơ-moóc —</option>
              <optgroup label="Xe đầu kéo">
                {vehicles.filter((v) => v.kind === 'truck').map((v) => (
                  <option key={`truck-${v.id}`} value={`truck:${v.id}`}>{v.label}</option>
                ))}
              </optgroup>
              <optgroup label="Rơ-moóc">
                {vehicles.filter((v) => v.kind === 'trailer').map((v) => (
                  <option key={`trailer-${v.id}`} value={`trailer:${v.id}`}>{v.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="ttp-field">
            <label>Vị trí lắp</label>
            <PositionPicker
              value={positionText}
              labels={positionLabels}
              onChange={setPositionText}
              onManage={onManagePositions}
            />
          </div>
          {(positionTaken || error) && (
            <div className="ttp-field ttp-field--serial">
              {positionTaken && target && (
                <div className="ttp-position-error">Vị trí này trên {target.label} đã có lốp.</div>
              )}
              {error && <div className="ttp-position-error">{error}</div>}
            </div>
          )}
        </div>

        <div className="ttp-dialog-actions">
          <button type="button" className="btn btn--secondary" onClick={oncancel} disabled={saving}>
            Hủy
          </button>
          <button type="button" className="btn btn--primary" onClick={() => { void confirm(); }} disabled={saving || !target || positionTaken}>
            {saving ? 'Đang xử lý…' : 'Chuyển lốp'}
          </button>
        </div>
      </div>
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
