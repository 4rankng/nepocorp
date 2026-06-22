import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react';
import {
  computeTireAlerts,
} from '@tingting/shared';
import type { Tire, TirePosition } from '@tingting/shared';
import type { Supplier } from '@tingting/shared';
import { ConfirmDialog, StatusPill } from '../components/UI';
import { StatusStrip, StatusSwatch } from '../components/shared/StatusStrip';
import { useToast } from '../components/shared/Toast';
import { formatErrorMessage } from '../lib/api';
import { routes } from '../lib/routes';
import {
  buildPositionLabels,
  buildUsedPositionLabels,
  cleanText,
  displayTirePosition,
  draftFromTire,
  normalizedCatalogLabel,
  patchFromDraft,
  positionPayloadFromLabel,
  supplierIdFromText,
  supplierName,
  textMatches,
  type TireEditDraft,
  type TirePatch,
} from '../features/tires/tireUtils';
import {
  useTires, useCreateTire, useUpdateTire, useDeleteTire,
} from '../hooks/useTireQueries';
import {
  useAllSuppliers,
  useCreateTirePosition,
  useDeleteTirePosition,
  useTirePositions,
  useTrucksAndDrivers,
  useUpdateTirePosition,
} from '../hooks/useCatalogQueries';
import './TruckTiresPage.css';

const TIRE_STATUS_COLORS: Record<Tire['status'], string> = {
  IN_USE: '#16A34A',
  IN_STOCK: '#2563EB',
};

const TIRE_STATUS_LEGEND: { status: Tire['status']; label: string }[] = [
  { status: 'IN_USE', label: 'Đang lắp trên xe' },
  { status: 'IN_STOCK', label: 'Lốp dự phòng' },
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
  const { data: tirePositions = [] } = useTirePositions();
  // Derived tire lists + position suggestions. Memoized so opening a dialog or
  // typing in an input doesn't re-scan the whole tire array on every render.
  const { tiresOnTruck, spares, positionLabels, usedPositionLabels } = useMemo(() => {
    const all = allTires ?? [];
    return {
      tiresOnTruck: all.filter((t) => t.truckId === truckId),
      spares: all.filter((t) => t.status === 'IN_STOCK'),
      positionLabels: buildPositionLabels(all, tirePositions),
      usedPositionLabels: buildUsedPositionLabels(all),
    };
  }, [allTires, tirePositions, truckId]);

  const createMut = useCreateTire();
  const updateMut = useUpdateTire();
  const deleteMut = useDeleteTire();
  const createPositionMut = useCreateTirePosition();
  const updatePositionMut = useUpdateTirePosition();
  const deletePositionMut = useDeleteTirePosition();
  const [editingTire, setEditingTire] = useState<Tire | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tire | null>(null);
  const [positionManagerOpen, setPositionManagerOpen] = useState(false);

  const busy = updateMut.isPending || deleteMut.isPending;
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
          <h1>{truck?.licensePlate ?? 'Lốp xe'}</h1>
          <div className="ttp-sub">
            Theo dõi serial lốp, vị trí lắp, ngày thay, nhà cung cấp và hạn bảo hành.
          </div>
        </div>
        <div className="ttp-actions">
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
              <p>Nhập serial và thông tin chính cho xe này.</p>
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
            loading={isLoading}
            emptyHint="Chưa có lốp nào được lắp trên xe này."
            busy={busy}
            onedit={setEditingTire}
            ondelete={setDeleteTarget}
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
            loading={isLoading}
            emptyHint="Không có lốp kho."
            busy={busy}
            onedit={setEditingTire}
            ondelete={setDeleteTarget}
          />
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
    warrantyUntil: string | null;
  }) => void;
}) {
  const [serial, setSerial] = useState('');
  const [positionText, setPositionText] = useState('');
  const [size, setSize] = useState('');
  const [supplierText, setSupplierText] = useState('');
  const [cost, setCost] = useState('');
  const [warranty, setWarranty] = useState('');

  const submit = () => {
    if (!serial.trim()) return;
    const positionPayload = positionPayloadFromLabel(positionText);
    onsave({
      serial: serial.trim(),
      ...positionPayload,
      size: size.trim() || null,
      supplierId: supplierIdFromText(suppliers, supplierText),
      cost: cost ? Number(cost) : 0,
      warrantyUntil: warranty || null,
    });
    setSerial('');
    setPositionText('');
    setSize('');
    setSupplierText('');
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
            <label>Hạn bảo hành</label>
            <input className="input" type="date" value={draft.warrantyUntil} onChange={(e) => updateDraft('warrantyUntil', e.target.value)} />
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

function TireTable({ tires, suppliers, loading, emptyHint, busy, onedit, ondelete }: {
  tires: Tire[];
  suppliers: Supplier[];
  loading: boolean;
  emptyHint: string;
  busy: boolean;
  onedit: (tire: Tire) => void;
  ondelete: (tire: Tire) => void;
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
          <col className="ttp-col-supplier" />
          <col className="ttp-col-warranty" />
          <col className="ttp-col-actions" />
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
            <th className="ttp-actions-heading">Thao tác</th>
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
                  {displayTirePosition(t)}
                </td>
                <td data-label="Kích cỡ">
                  {t.size || '—'}
                </td>
                <td data-label="Ngày lắp">
                  {t.installedAt || '—'}
                </td>
                <td data-label="Số ngày chạy">{days == null ? '—' : `${days} ngày`}</td>
                <td className="ttp-supplier" data-label="Nhà cung cấp">
                  {supplierName(suppliers, t.supplierId)}
                </td>
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
                <td className="ttp-row-actions" data-label="Thao tác">
                  <div className="ttp-icon-actions">
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
