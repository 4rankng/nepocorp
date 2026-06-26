import { useState, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { EmptyIllustration } from '../components/shared';
import {
  Truck, Container, UserCheck, Plus, Search,
  Download, Filter, CheckCircle,
  Pencil, Trash2, X, Loader2, ArrowRight,
} from 'lucide-react';
import { downloadCSV } from '../lib/csv';
import { PageHeader, Panel, StatusPill, Btn, KPI, Modal } from '../components/UI';
import { StatusStrip } from '../components/shared/StatusStrip';
import { useCRUD } from '../hooks/useCRUD';
import { useTrucksAndDrivers } from '../hooks/useCatalogQueries';
import { useTires } from '../hooks/useTireQueries';
import { usePageAnimations } from '../hooks/animations';
import { configClient } from '../api/configClient';
import { qk } from '../api/keys';
import type { TireStatus } from '@tingting/shared';
import { TrailerType, TRAILER_TYPE_LABELS, TIRE_STATUS_LABELS } from '@tingting/shared';
import type { Tire, Truck as TruckType, Driver } from '@tingting/shared';
import { routes } from '../lib/routes';
import { formatDate } from '../lib/format';

// Extracted form modals + shared fleet constants
import {
  TruckFormModal,
  DriverFormModal,
  TrailerFormModal,
  TRUCK_STATUS,
  DRIVER_STATUS,
  fleetStyles as styles,
} from '../features/fleet';

import './FleetPage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DriverAvatarIcon = memo(function DriverAvatarIcon() {
  return (
    <span className="fleet-avatar" aria-hidden="true">
      <UserCheck size={14} />
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
  return <span className={`fleet-type-chip ${cls}`}>{TRAILER_TYPE_LABELS[type as TrailerType] || type}</span>;
});

const StatusDot = memo(function StatusDot({ status }: { status: string }) {
  const variant = status === 'ACTIVE' ? 'success' : status === 'MAINTENANCE' ? 'warn' : 'neutral';
  const label = TRUCK_STATUS[status] || DRIVER_STATUS[status] || status;
  return <StatusPill variant={variant} dot>{label}</StatusPill>;
});

function fleetStatusColor(status: string): string {
  if (status === 'ACTIVE') return '#059669';
  if (status === 'MAINTENANCE') return '#D97706';
  return '#6B7280';
}

const TireQuickLink = memo(function TireQuickLink({ to, count }: { to: string; count: number }) {
  return (
    <Link
      to={to}
      className={`fleet-tire-link${count === 0 ? ' fleet-tire-link--empty' : ''}`}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Quản lý lốp, hiện có ${count} lốp`}
    >
      <span className="fleet-tire-link__count">{count}</span>
      <span>Lốp</span>
      <ArrowRight size={13} />
    </Link>
  );
});

function tireStatusVariant(status: TireStatus): 'neutral' | 'success' | 'warn' {
  if (status === 'IN_USE') return 'success';
  return 'neutral';
}

const TireDetailList = memo(function TireDetailList({ truckId, tires }: { truckId: number; tires: Tire[] }) {
  const mountedTires = tires.filter((tire) => tire.truckId === truckId && tire.status === 'IN_USE');

  if (mountedTires.length === 0) {
    return <TireQuickLink to={routes.fleetTires(truckId)} count={0} />;
  }

  return (
    <div className="fleet-tire-detail">
      <div className="fleet-tire-detail__head">
        <span><strong>{mountedTires.length}</strong> lốp đang lắp</span>
        <TireQuickLink to={routes.fleetTires(truckId)} count={mountedTires.length} />
      </div>
      <div className="fleet-tire-detail__list">
        {mountedTires.map((tire) => (
          <div className="fleet-tire-detail__row" key={tire.id}>
            <div className="fleet-tire-detail__main">
              <span className="fleet-tire-detail__serial">{tire.serial}</span>
              <span className="fleet-tire-detail__position">{tire.position || 'Chưa nhập vị trí'}</span>
            </div>
            <div className="fleet-tire-detail__meta">
              <span>{tire.size || '—'}</span>
              {tire.purchasedAt && <span>Mua {formatDate(tire.purchasedAt)}</span>}
              <StatusPill variant={tireStatusVariant(tire.status)}>
                {TIRE_STATUS_LABELS[tire.status]}
              </StatusPill>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

function FleetStatusLegend({ maintenance = true }: { maintenance?: boolean }) {
  return (
    <span className="fleet-status-legend" aria-label="Chú giải trạng thái">
      <span className="fleet-legend-item">
        <span className="fleet-legend-swatch" style={{ background: fleetStatusColor('ACTIVE') }} /> Hoạt động
      </span>
      {maintenance && (
        <span className="fleet-legend-item">
          <span className="fleet-legend-swatch" style={{ background: fleetStatusColor('MAINTENANCE') }} /> Bảo trì
        </span>
      )}
      <span className="fleet-legend-item">
        <span className="fleet-legend-swatch" style={{ background: fleetStatusColor('INACTIVE') }} /> Ngưng
      </span>
    </span>
  );
}

// ─── DetailModal — shared view dialog with edit/delete actions ────────────────

function DetailModal({ isOpen, title, onClose, details, onEdit, onDelete, deleting, itemId }: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  details: Array<{ label: string; value: React.ReactNode }>;
  onEdit: () => void;
  onDelete?: () => void;
  deleting: number | null;
  itemId: number;
}) {
  const primary = details[0];
  const status = details.find((d) => d.label === 'Trạng thái');
  const secondary = details.filter((d, i) => i !== 0 && d.label !== 'Trạng thái');

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      maxWidth={620}
      footer={
        <div className="fleet-detail-actions">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            <X size={14} /> Đóng
          </button>
          <button className="btn btn--primary btn--sm" onClick={onEdit}>
            <Pencil size={13} /> Sửa
          </button>
          {onDelete && (
            <button
              className="btn btn--ghost btn--sm"
              style={{ color: 'var(--danger)' }}
              disabled={deleting === itemId}
              onClick={onDelete}
            >
              {deleting === itemId ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
              Xóa
            </button>
          )}
        </div>
      }
    >
      <div className="fleet-detail">
        {primary && (
          <div className="fleet-detail__hero">
            <div className="fleet-detail__identity">
              <div className="fleet-detail__label">{primary.label}</div>
              <div className="fleet-detail__primary">{primary.value}</div>
            </div>
            {status && (
              <div className="fleet-detail__status">
                <div className="fleet-detail__label">Trạng thái</div>
                <div>{status.value}</div>
              </div>
            )}
          </div>
        )}

        <div className="fleet-detail__grid">
          {secondary.map((d, i) => (
            <div className={`fleet-detail__item${d.label === 'Lốp' ? ' fleet-detail__item--wide' : ''}`} key={`${d.label}-${i}`}>
              <div className="fleet-detail__label">{d.label}</div>
              <div className="fleet-detail__value">{d.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── TrailerCard ────────────────────────────────────────────────────────────

function TrailerCard({ trailers, trucks, crud }: {
  trailers: Array<{ id: number; licensePlate: string; type: string; status: string }>;
  trucks: TruckType[];
  crud: ReturnType<typeof useCRUD>;
}) {
  const [viewingId, setViewingId] = useState<number | null>(null);
  const { data: tires = [] } = useTires();
  // Build reverse lookup: trailerId → truck plate, so we can show which đầu
  // kéo each rơ-moóc is currently coupled to.
  const truckByTrailer = useMemo(() => {
    const m = new Map<number, TruckType>();
    trucks.forEach(t => { if (t.currentTrailerId) m.set(t.currentTrailerId, t); });
    return m;
  }, [trucks]);
  // Count IN_USE tires per rơ-moóc for the Lốp quick-link badge.
  const tireCountByTrailer = useMemo(() => {
    const counts = new Map<number, number>();
    (tires as Tire[]).forEach((tire) => {
      if (tire.trailerId && tire.status === 'IN_USE') {
        counts.set(tire.trailerId, (counts.get(tire.trailerId) ?? 0) + 1);
      }
    });
    return counts;
  }, [tires]);
  const ft40 = trailers.filter(t => t.type === TrailerType.FT40).length;
  const ft20 = trailers.filter(t => t.type === TrailerType.FT20).length;
  const active = trailers.filter(t => t.status === 'ACTIVE').length;

  return (
    <Panel flush>
      <div className="fleet-card-head">
        <div className="fleet-card-lead">
          <div className="fleet-card-icon">
            <Truck size={18} />
          </div>
          <div>
            <div className="fleet-card-title">
              Rơ-moóc <span className="count-pill">{trailers.length}</span>
            </div>
            <div className="fleet-card-sub">Quản lý rơ-moóc · Tách chi phí sửa chữa, đăng kiểm, thay lốp theo từng rơ-moóc</div>
          </div>
        </div>
        <div className="fleet-card-tools">
          <button className="btn btn--primary btn--sm" onClick={() => crud.setShowAddForm(true)}>
            <Plus size={13} /> Thêm rơ-moóc
          </button>
        </div>
      </div>
      <div className="desktop-only">
        <div className="table-scroll">
          <table className="tt-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Biển số rơ-moóc</th>
                <th>Loại</th>
                <th>Đầu kéo đang ghép</th>
                <th>Lốp</th>
              </tr>
            </thead>
            <tbody>
              {trailers.length === 0 && (
                <tr><td colSpan={5} style={styles.emptyRow}>
                  <EmptyIllustration name="empty-trucks" width={140} height={116} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div>Chưa có rơ-moóc nào. Bấm "Thêm rơ-moóc" để tạo mới.</div>
                </td></tr>
              )}
              {trailers.map((t, i) => {
                const coupledTruck = truckByTrailer.get(t.id);
                return (
                  <tr
                    key={t.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setViewingId(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setViewingId(t.id); } }}
                  >
                    <td className="num fleet-status-cell">
                      <StatusStrip color={fleetStatusColor(t.status)} />
                      {i + 1}
                    </td>
                    <td><Plate plate={t.licensePlate} tag="RM" /></td>
                    <td><TypeChip type={t.type} /></td>
                    <td>
                      {coupledTruck
                        ? <span className="fleet-pair"><Plate plate={coupledTruck.licensePlate} tag="VN" /></span>
                        : <span className="fleet-unassigned">— Chưa ghép —</span>
                      }
                    </td>
                    <td>
                      <TireQuickLink to={routes.fleetTrailerTires(t.id)} count={tireCountByTrailer.get(t.id) ?? 0} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <div className="fleet-legend">
            <span><strong style={styles.fontMono}>{ft40}</strong> × 40FT</span>
            <span style={styles.dotSep}>·</span>
            <span><strong style={styles.fontMono}>{ft20}</strong> × 20FT</span>
            <span style={styles.dotSep}>·</span>
            <span>{active} đang hoạt động</span>
            <span style={styles.dotSep}>·</span>
            <FleetStatusLegend />
          </div>
          <span>Hiển thị {trailers.length}</span>
        </div>
      </div>
      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {trailers.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
              <EmptyIllustration name="empty-trucks" width={150} height={124} style={{ margin: '0 auto 8px', display: 'block' }} />
              <div>Chưa có rơ-moóc nào</div>
            </div>
          )}
          {trailers.map((t) => {
            const coupledTruck = truckByTrailer.get(t.id);
            return (
              <div key={t.id} className="m-card" onClick={() => setViewingId(t.id)}>
                <StatusStrip color={fleetStatusColor(t.status)} />
                <div className="m-card__top">
                  <span className="m-card__title">
                    <span className="fleet-plate-tag" style={{ marginRight: 6, background: 'var(--ink)', color: '#fff', padding: '2px 5px', borderRadius: 4, fontSize: 10, letterSpacing: '0.5px' }}>RM</span>
                    {t.licensePlate}
                  </span>
                </div>
                <div className="m-card__row">
                  <span className="m-card__row-label">Loại</span>
                  <span><TypeChip type={t.type} /></span>
                </div>
                <div className="m-card__row">
                  <span className="m-card__row-label">Đầu kéo ghép</span>
                  <span className="m-card__row-value">{coupledTruck ? coupledTruck.licensePlate : '— Chưa ghép —'}</span>
                </div>
                <div className="m-card__row">
                  <span className="m-card__row-label">Lốp</span>
                  <TireQuickLink to={routes.fleetTrailerTires(t.id)} count={tireCountByTrailer.get(t.id) ?? 0} />
                </div>
                <div className="fleet-card-actions">
                  <button className="btn btn--ghost btn--sm" onClick={e => { e.stopPropagation(); crud.setEditingId(t.id); }}>Sửa</button>
                  <button className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); crud.doDelete(t.id); }}>Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="table-foot">
          <div className="fleet-legend">
            <span><strong style={styles.fontMono}>{ft40}</strong> × 40FT</span>
            <span style={styles.dotSep}>·</span>
            <span><strong style={styles.fontMono}>{ft20}</strong> × 20FT</span>
            <span style={styles.dotSep}>·</span>
            <span>{active} đang hoạt động</span>
            <span style={styles.dotSep}>·</span>
            <FleetStatusLegend />
          </div>
          <span>Hiển thị {trailers.length}</span>
        </div>
      </div>
      {crud.error && <div style={styles.errorBanner}>{crud.error}</div>}
      <DetailModal
        isOpen={viewingId != null}
        title="Rơ-moóc"
        onClose={() => setViewingId(null)}
        itemId={viewingId ?? 0}
        deleting={crud.deleting}
        onEdit={() => { const id = viewingId; setViewingId(null); if (id != null) crud.setEditingId(id); }}
        onDelete={() => { const id = viewingId; setViewingId(null); if (id != null) crud.doDelete(id); }}
        details={(() => {
          const t = viewingId != null ? trailers.find(x => x.id === viewingId) : null;
          if (!t) return [];
          const coupledTruck = truckByTrailer.get(t.id);
          return [
            { label: 'Biển số rơ-moóc', value: <Plate plate={t.licensePlate} tag="RM" /> },
            { label: 'Loại', value: <TypeChip type={t.type} /> },
            { label: 'Đầu kéo đang ghép', value: coupledTruck ? <Plate plate={coupledTruck.licensePlate} tag="VN" /> : <span className="fleet-unassigned">— Chưa ghép —</span> },
            { label: 'Lốp', value: <TireQuickLink to={routes.fleetTrailerTires(t.id)} count={tireCountByTrailer.get(t.id) ?? 0} /> },
            { label: 'Trạng thái', value: <StatusDot status={t.status} /> },
          ];
        })()}
      />
      <TrailerFormModal
        key={crud.editingId ?? (crud.showAddForm ? 'add' : 'closed')}
        isOpen={crud.showAddForm || crud.editingId != null}
        saving={crud.saving}
        item={crud.editingId != null ? trailers.find(t => t.id === crud.editingId) : undefined}
        onsave={d => {
          if (crud.editingId != null) crud.doUpdate(crud.editingId, d);
          else crud.doCreate(d);
        }}
        oncancel={crud.cancelForm}
      />
    </Panel>
  );
}

// ─── Card Components ─────────────────────────────────────────────────────────

function TruckCard({ trucks, driverByTruck, trailers, crud }: {
  trucks: TruckType[];
  driverByTruck: Map<number, Driver>;
  trailers: Array<{ id: number; licensePlate: string; type: string }>;
  crud: ReturnType<typeof useCRUD>;
}) {
  const [viewingId, setViewingId] = useState<number | null>(null);
  const { data: tires = [] } = useTires();
  const active = trucks.filter(t => t.status === 'ACTIVE').length;
  const maint = trucks.filter(t => t.status === 'MAINTENANCE').length;
  const tireCountByTruck = useMemo(() => {
    const counts = new Map<number, number>();
    (tires as Tire[]).forEach((tire) => {
      if (tire.truckId && tire.status === 'IN_USE') {
        counts.set(tire.truckId, (counts.get(tire.truckId) ?? 0) + 1);
      }
    });
    return counts;
  }, [tires]);

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
      <div className="desktop-only">
        <div className="table-scroll">
          <table className="tt-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Biển số xe đầu</th>
                <th>Rơ-moóc</th>
                <th>Lái xe gán</th>
                <th>Lốp</th>
              </tr>
            </thead>
            <tbody>
              {trucks.length === 0 && (
                <tr><td colSpan={5} style={styles.emptyRow}>
                  <EmptyIllustration name="empty-trucks" width={140} height={116} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div>Chưa có dữ liệu</div>
                </td></tr>
              )}
              {trucks.map((t, i) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setViewingId(t.id)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setViewingId(t.id); } }}>
                  <td className="num fleet-status-cell">
                    <StatusStrip color={fleetStatusColor(t.status)} />
                    {i + 1}
                  </td>
                  <td><Plate plate={t.licensePlate} tag="VN" /></td>
                  <td>
                    {(() => {
                      const tr = t.currentTrailerId ? trailers.find(x => x.id === t.currentTrailerId) : null;
                      return tr
                        ? <span className="fleet-pair"><Plate plate={tr.licensePlate} tag="RM" /> <TypeChip type={(tr.type as TrailerType) ?? TrailerType.FT40} /></span>
                        : t.trailerPlateNumber
                          ? <span className="fleet-pair"><Plate plate={t.trailerPlateNumber} tag="RM" /> <TypeChip type={t.trailerType ?? TrailerType.FT40} /></span>
                          : <span className="fleet-unassigned">—</span>;
                    })()}
                  </td>
                  <td>
                    {driverByTruck.has(t.id)
                      ? (
                        <span className="fleet-assigned">
                          <DriverAvatarIcon />
                          <span className="name">{driverByTruck.get(t.id)!.name}</span>
                        </span>
                      )
                      : <span className="fleet-unassigned">— Chưa phân —</span>
                    }
                  </td>
                  <td>
                    <TireQuickLink to={routes.fleetTires(t.id)} count={tireCountByTruck.get(t.id) ?? 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <div className="fleet-legend">
            <FleetStatusLegend />
          </div>
          <span>Hoạt động {active} · Bảo trì {maint}</span>
        </div>
      </div>
      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {trucks.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
              <EmptyIllustration name="empty-trucks" width={150} height={124} style={{ margin: '0 auto 8px', display: 'block' }} />
              <div>Chưa có dữ liệu</div>
            </div>
          )}
          {trucks.map((t) => {
            const trailer = t.currentTrailerId ? trailers.find(x => x.id === t.currentTrailerId) : null;
            const driver = driverByTruck.get(t.id);
            return (
              <div key={t.id} className="m-card" onClick={() => setViewingId(t.id)}>
                <StatusStrip color={fleetStatusColor(t.status)} />
                <div className="m-card__top">
                  <span className="m-card__title">
                    <span className="fleet-plate-tag" style={{ marginRight: 6, background: 'var(--ink)', color: '#fff', padding: '2px 5px', borderRadius: 4, fontSize: 10, letterSpacing: '0.5px' }}>VN</span>
                    {t.licensePlate}
                  </span>
                </div>
                <div className="m-card__row">
                  <span className="m-card__row-label">Rơ-moóc</span>
                  <span className="m-card__row-value">{trailer ? trailer.licensePlate : '—'}</span>
                </div>
                <div className="m-card__row">
                  <span className="m-card__row-label">Lái xe</span>
                  <span className="m-card__row-value">{driver ? driver.name : '— Chưa phân —'}</span>
                </div>
                <div className="m-card__row">
                  <span className="m-card__row-label">Lốp</span>
                  <TireQuickLink to={routes.fleetTires(t.id)} count={tireCountByTruck.get(t.id) ?? 0} />
                </div>
                <div className="fleet-card-actions">
                  <button className="btn btn--ghost btn--sm" onClick={e => { e.stopPropagation(); setViewingId(t.id); }}>Xem</button>
                  <button className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); crud.doDelete(t.id); }}>Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="table-foot">
          <div className="fleet-legend">
            <FleetStatusLegend />
          </div>
          <span>Hoạt động {active} · Bảo trì {maint}</span>
        </div>
      </div>
      {crud.error && <div style={styles.errorBanner}>{crud.error}</div>}
      <DetailModal
        isOpen={viewingId != null}
        title="Xe đầu kéo"
        onClose={() => setViewingId(null)}
        itemId={viewingId ?? 0}
        deleting={crud.deleting}
        onEdit={() => { const id = viewingId; setViewingId(null); if (id != null) crud.setEditingId(id); }}
        onDelete={() => { const id = viewingId; setViewingId(null); if (id != null) crud.doDelete(id); }}
        details={(() => {
          const t = viewingId != null ? trucks.find(x => x.id === viewingId) : null;
          if (!t) return [];
          const tr = t.currentTrailerId ? trailers.find(x => x.id === t.currentTrailerId) : null;
          const driver = driverByTruck.get(t.id);
          return [
            { label: 'Biển số xe đầu', value: <Plate plate={t.licensePlate} tag="VN" /> },
            { label: 'Rơ-moóc', value: tr ? <span className="fleet-pair"><Plate plate={tr.licensePlate} tag="RM" /> <TypeChip type={(tr.type as TrailerType) ?? TrailerType.FT40} /></span> : <span className="fleet-unassigned">—</span> },
            { label: 'Lái xe gán', value: driver ? <span className="fleet-assigned"><DriverAvatarIcon /><span className="name">{driver.name}</span></span> : <span className="fleet-unassigned">— Chưa phân —</span> },
            { label: 'Trạng thái', value: <StatusDot status={t.status} /> },
            { label: 'Lốp', value: <TireDetailList truckId={t.id} tires={tires as Tire[]} /> },
          ];
        })()}
      />
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
  const [viewingId, setViewingId] = useState<number | null>(null);
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
              Lái xe <span className="count-pill">{drivers.length}</span>
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
            <Plus size={13} /> Thêm lái xe
          </button>
        </div>
      </div>
      <div className="desktop-only">
        <div className="table-scroll">
          <table className="tt-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Tên lái xe</th>
                <th>SĐT</th>
                <th>Xe phân công</th>
                <th>Lương CB</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 && (
                <tr><td colSpan={5} style={styles.emptyRow}>Chưa có dữ liệu</td></tr>
              )}
              {filteredDrivers.map((d, i) => (
                <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setViewingId(d.id)} role="button" tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setViewingId(d.id); } }}>
                  <td className="num fleet-status-cell">
                    <StatusStrip color={fleetStatusColor(d.status)} />
                    {i + 1}
                  </td>
                  <td>
                    <span className="fleet-assigned">
                      <DriverAvatarIcon />
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
                      ? <span className="fleet-salary">{Number(d.baseSalary).toLocaleString('vi-VN')}<span className="unit">đ</span></span>
                      : <span className="fleet-salary empty">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <div className="fleet-legend">
            <FleetStatusLegend maintenance={false} />
            <span style={styles.dotSep}>·</span>
            <span>Tổng quỹ lương: <strong style={styles.salaryMono}>{totalSalary.toLocaleString('vi-VN')} đ</strong></span>
            {unassigned > 0 && (
              <>
                <span style={styles.dotSep}>·</span>
                <span>{unassigned} lái xe chưa được phân xe</span>
              </>
            )}
          </div>
          <span>Hiển thị {filteredDrivers.length}/{drivers.length}</span>
        </div>
      </div>
      <div className="mobile-only mobile-table-wrap">
        <div className="m-card-list">
          {filteredDrivers.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>Chưa có dữ liệu</div>
          )}
          {filteredDrivers.map((d) => {
            const truck = d.assignedTruckId && truckMap.has(d.assignedTruckId) ? truckMap.get(d.assignedTruckId)! : null;
            return (
              <div key={d.id} className="m-card" onClick={() => setViewingId(d.id)}>
                <StatusStrip color={fleetStatusColor(d.status)} />
                <div className="m-card__top">
                  <span className="m-card__title">
                    <DriverAvatarIcon />
                    <span style={{ marginLeft: 6 }}>{d.name}</span>
                  </span>
                </div>
                {d.phone && (
                  <div className="m-card__meta">
                    <span>{d.phone}</span>
                  </div>
                )}
                <div className="m-card__row">
                  <span className="m-card__row-label">Xe phân công</span>
                  <span className="m-card__row-value">{truck ? truck.licensePlate : '— Chưa phân —'}</span>
                </div>
                {d.baseSalary ? (
                  <div className="m-card__row">
                    <span className="m-card__row-label">Lương CB</span>
                    <span className="m-card__row-value">{Number(d.baseSalary).toLocaleString('vi-VN')} đ</span>
                  </div>
                ) : null}
                <div className="fleet-card-actions">
                  <button className="btn btn--ghost btn--sm" onClick={e => { e.stopPropagation(); setViewingId(d.id); }}>Xem</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="table-foot">
          <div className="fleet-legend">
            <FleetStatusLegend maintenance={false} />
            <span style={styles.dotSep}>·</span>
            <span>Tổng quỹ lương: <strong style={styles.salaryMono}>{totalSalary.toLocaleString('vi-VN')} đ</strong></span>
            {unassigned > 0 && (
              <>
                <span style={styles.dotSep}>·</span>
                <span>{unassigned} lái xe chưa được phân xe</span>
              </>
            )}
          </div>
          <span>Hiển thị {filteredDrivers.length}/{drivers.length}</span>
        </div>
      </div>
      {crud.error && <div style={styles.errorBanner}>{crud.error}</div>}
      <DetailModal
        isOpen={viewingId != null}
        title="Lái xe"
        onClose={() => setViewingId(null)}
        itemId={viewingId ?? 0}
        deleting={crud.deleting}
        onEdit={() => { const id = viewingId; setViewingId(null); if (id != null) crud.setEditingId(id); }}
        details={(() => {
          const d = viewingId != null ? drivers.find(x => x.id === viewingId) : null;
          if (!d) return [];
          const truck = d.assignedTruckId && truckMap.has(d.assignedTruckId) ? truckMap.get(d.assignedTruckId)! : null;
          return [
            { label: 'Họ và tên', value: <span className="fleet-assigned"><DriverAvatarIcon /><span className="name">{d.name}</span></span> },
            { label: 'Số điện thoại', value: d.phone || '—' },
            { label: 'Xe phân công', value: truck ? <Plate plate={truck.licensePlate} tag="VN" /> : <span className="fleet-unassigned">— Chưa phân —</span> },
            { label: 'Lương cơ bản', value: d.baseSalary ? <span className="fleet-salary">{Number(d.baseSalary).toLocaleString('vi-VN')}<span className="unit">đ</span></span> : <span className="fleet-salary empty">—</span> },
            { label: 'Trạng thái', value: <StatusDot status={d.status} /> },
          ];
        })()}
      />
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
  const { rootRef } = usePageAnimations({ ready: true });
  const { data: fleetData } = useTrucksAndDrivers();
  const { data: trailers = [] } = useQuery({
    queryKey: qk.catalogs.trailers,
    queryFn: () => configClient.getTrailers(),
    staleTime: 60_000,
  });
  const trucks = useMemo(() => fleetData?.trucks ?? [], [fleetData?.trucks]);
  const drivers = useMemo(() => fleetData?.drivers ?? [], [fleetData?.drivers]);

  const invalidateFleet = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: qk.catalogs.trucksDrivers });
  }, [queryClient]);

  const truckCrud = useCRUD('/trucks', invalidateFleet);
  const driverCrud = useCRUD('/drivers', invalidateFleet);
  // Trailers are a separate catalog so a rơ-moóc can be coupled to different
  // đầu kéo over time. Invalidate both the trailers list AND fleet (since
  // the truck rows display the coupled trailer's plate).
  const trailerCrud = useCRUD('/trailers', async () => {
    await queryClient.invalidateQueries({ queryKey: qk.catalogs.trailers });
    await invalidateFleet();
  });

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
    <div className="fleet-page" ref={rootRef}>
      <PageHeader
        title="Đội xe"
        iconName="truck"
        description="Quản lý xe đầu kéo, rơ-moóc và lái xe trong một trang"
        action={
          <div style={styles.actionRow}>
            <Btn variant="secondary" size="sm" icon={<Download size={14} />} onClick={async () => {
              const headers = ['Loại', 'Biển số', 'Trạng thái', 'Lái xe gán'];
              const rows = [
                ...trucks.map(t => ['Xe đầu kéo', t.licensePlate, TRUCK_STATUS[t.status] || t.status, driverByTruck.has(t.id) ? driverByTruck.get(t.id)!.name : '—']),
              ];
              await downloadCSV(`doi-xe-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows, {
                title: 'DANH SÁCH ĐỘI XE',
                subtitle: `${trucks.length} xe đầu kéo đang quản lý`,
                columnTypes: ['text', 'text', 'text', 'text'],
                hideTotals: true,
              });
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
          assetIconName="truck"
          variant="success"
          meta={
            <span className="fleet-kpi-meta" style={styles.metaRow}>
              <span className="fleet-kpi-dot fleet-kpi-dot--success" style={styles.dotSuccess} />
              <span className="fleet-kpi-meta__good" style={styles.textSuccess}>{activeTrucks} hoạt động</span>
              <span className="fleet-kpi-meta__sep" style={styles.textMuted}>·</span>
              <span className="fleet-kpi-dot fleet-kpi-dot--warn" style={styles.dotWarning} />
              <span className="fleet-kpi-meta__warn" style={styles.textWarning}>{maintTrucks} bảo trì</span>
            </span>
          }
        />
        <KPI
          label="Rơ-moóc"
          value={ft40 + ft20}
          unit="moóc"
          icon={Container}
          assetIconName="cargo"
          variant="info"
          meta={
            <span className="fleet-kpi-meta" style={styles.metaRow}>
              <span className="fleet-kpi-meta__mono" style={styles.fontMono}>{ft40}×40FT</span>
              <span className="fleet-kpi-meta__sep" style={styles.textMuted}>·</span>
              <span className="fleet-kpi-meta__mono" style={styles.fontMono}>{ft20}×20FT</span>
            </span>
          }
        />
        <KPI
          label="Lái xe"
          value={activeDrivers}
          unit="người"
          icon={UserCheck}
          assetIconName="driver"
          variant="warn"
          meta={
            <span className="fleet-kpi-meta" style={styles.metaRow}>
              <span className="fleet-kpi-dot fleet-kpi-dot--success" style={styles.dotSuccess} />
              <span className="fleet-kpi-meta__good" style={styles.textSuccess}>{activeDrivers} đang làm</span>
              <span className="fleet-kpi-meta__sep" style={styles.textMuted}>·</span>
              <span>{assignedDrivers}/{activeDrivers} phân xe</span>
            </span>
          }
        />
        <KPI
          label="Sẵn sàng chạy"
          value={readyToRun}
          unit={`/ ${activeTrucks + maintTrucks || trucks.length} đầu kéo`}
          icon={CheckCircle}
          assetIconName="checklist"
          variant="default"
          meta={
            <span className="fleet-kpi-meta" style={styles.metaRow}>
              {readyToRun >= activeTrucks ? (
                <span className="fleet-kpi-meta__good" style={styles.textSuccess}>Đủ xe + lái xe</span>
              ) : (
                <>
                  <span>{readyToRun} sẵn sàng</span>
                  <span className="fleet-kpi-meta__sep" style={styles.textMuted}>·</span>
                  <span className="fleet-kpi-meta__warn" style={styles.textWarning}>{activeTrucks - readyToRun} cần phân xe</span>
                </>
              )}
            </span>
          }
        />
      </div>

      {/* Trucks (đầu kéo) */}
      <TruckCard trucks={trucks} driverByTruck={driverByTruck} trailers={trailers} crud={truckCrud} />

      {/* Trailers (rơ-moóc) — separate catalog so a rơ-moóc can be coupled
          to different đầu kéo over time, and so repair / đăng kiểm / thay
          lốp expenses can be split between truck and trailer. */}
      <TrailerCard trailers={trailers} trucks={trucks} crud={trailerCrud} />

      {/* Drivers */}
      <DriverCard drivers={drivers} truckMap={truckMap} crud={driverCrud} />
    </div>
  );
}
