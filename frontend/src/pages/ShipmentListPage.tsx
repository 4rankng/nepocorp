/**
 * Lô hàng — sea-shipment list (NEPO-61).
 * Skeleton mirrors DebtListPage: Breadcrumbs → PageHeader → number band →
 * ListFilterBar → mobile cards ≤640px / desktop table >640px → Pagination.
 * The URL is the source of truth (?q=, ?page=) with replace:true so reloads
 * and dashboard deep-links keep the view.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, PencilLine, Plus } from 'lucide-react';
import { SHIPMENT_CUTOFF_WARN_DAYS } from '@tingting/shared';
import type { Shipment } from '@tingting/shared';
import { useAuth } from '../hooks/useAuth';
import { useShipments } from '../hooks/useShipmentQueries';
import ShipmentFormModal from '../features/shipments/ShipmentFormModal';
import { useDebouncedValue, useAutoHideColumn, Pagination, SubLine } from '../design-system';
import { PageHeader } from '../components/UI';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { ListFilterBar } from '../components/shared/ListFilterBar';
import { ClickableCard } from '../components/shared/ClickableCard';
import { formatDatePadded, formatDate } from '../lib/format';
import { resolveEmptyIllustration } from '../lib/emptyIllustrations';
import {
  canWriteShipments,
  cutoffDaysLeft,
  flowTypeLabel,
  isCutoffUrgent,
  routeText,
} from '../features/shipments/shipmentDisplay';
import './ShipmentListPage.css';

/** The write-role gate, re-exported as the page module's contract surface. */
export { canWriteShipments } from '../features/shipments/shipmentDisplay';

const PAGE_SIZE = 25;

/** Band chip count: lô whose cut-off falls inside the shared warn window.
 *  Computed over the rows actually shown — the list payload carries no
 *  profit/billing aggregates, so the band stays honest to what is on screen. */
export function cutoffUrgentCount(rows: Shipment[]): number {
  return rows.filter(r => isCutoffUrgent(r.cutoffDate)).length;
}

export default function ShipmentListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useAuth();
  const canWrite = canWriteShipments(user?.role);

  const urlSearch = searchParams.get('q') ?? '';
  const urlPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  // The input owns its own state so typing stays instant; the debounced value
  // is what lands in the URL (and therefore in the query key).
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    next.delete('page'); // a new filter always restarts at page 1
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams identity churns per keystroke; only the debounced value may drive the URL
  }, [debouncedSearch]);

  const { data, isLoading: loading, error: queryError } = useShipments({
    search: urlSearch || undefined,
    page: urlPage,
    pageSize: PAGE_SIZE,
  });

  const rows = useMemo(() => data?.items ?? [], [data?.items]);
  const totalItems = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const error = queryError ? (queryError as Error).message : null;

  // NEPO-16 auto-hide: B/L is sparse early in a lô's life — once every row
  // would render "—" the column disappears until one row carries a B/L.
  const showBlColumn = useAutoHideColumn(
    useMemo(() => rows.map(r => (r.blNo == null || r.blNo.trim() === '' ? null : r.blNo)), [rows]),
  );

  const urgentCutoffCount = useMemo(() => cutoffUrgentCount(rows), [rows]);

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const openDetail = (id: number) => navigate(`/shipments/${id}`);
  const colCount = showBlColumn ? 7 : 6;

  return (
    <div className="shipment-list-page">
      <Breadcrumbs
        className="shipment-list-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Lô hàng' },
        ]}
        renderLink={(to, children) => <Link to={to}>{children}</Link>}
      />
      <PageHeader
        title="Lô hàng"
        description={loading ? 'Đang tải dữ liệu lô hàng…' : 'Danh sách lô biển'}
        iconName="cargo"
        action={canWrite && (
          <button
            className="btn btn--primary btn--sm"
            onClick={() => setCreateOpen(true)}
            data-tour-id="shipment-create"
          >
            <Plus size={14} aria-hidden="true" /> Tạo lô hàng
          </button>
        )}
      />

      {/* Zone 1 — number band. Cut-off chip rides the shared warn window. */}
      <div className="shipment-band" data-tour-id="shipment-list">
        <div className="shipment-band__total">
          <span className="shipment-band__label">Tổng lô hàng</span>
          <span className="shipment-band__amount">{loading ? '—' : totalItems}</span>
        </div>
        {urgentCutoffCount > 0 && (
          <span
            className="shipment-band__chip shipment-band__chip--warn"
            title={`Cut-off trong ${SHIPMENT_CUTOFF_WARN_DAYS} ngày tới (hoặc đã qua)`}
          >
            <span className="shipment-band__chip-value">{urgentCutoffCount}</span>
            {' lô sắp cut-off (trang này)'}
          </span>
        )}
      </div>

      {/* Zone 2 — filter tabs + search */}
      <ListFilterBar<'all'>
        label="Lọc lô hàng"
        value="all"
        onChange={() => { /* single tab for now — the search field does the filtering */ }}
        options={[{ value: 'all', label: 'Tất cả', count: loading ? undefined : totalItems }]}
        search={{
          value: searchInput,
          onChange: setSearchInput,
          label: 'Tìm lô hàng',
          placeholder: 'Tìm theo mã lô, booking, B/L, khách hàng…',
        }}
      />

      <div className="shipment-list-data-card">
        {error && <div className="shipment-list-error">{error}</div>}

        {loading ? (
          <div className="shipment-list-loading">
            <Loader2 size={28} className="shipment-list-loading__spin" aria-hidden="true" />
            <span>Đang tải dữ liệu lô hàng…</span>
          </div>
        ) : (
          <>
            {/* ── Mobile card list (≤640px) ── */}
            <div className="mobile-only mobile-table-wrap">
              <div className="m-card-list">
                {rows.length === 0 ? (
                  <ShipmentEmptyState />
                ) : (
                  rows.map(r => <ShipmentMobileCard key={r.id} shipment={r} />)
                )}
              </div>
            </div>

            {/* ── Desktop table (>640px) ── */}
            <div className="desktop-only table-wrap">
              <div className="table-scroll">
                <table className={`shipment-list-table${showBlColumn ? '' : ' shipment-list-table--no-bl'}`}>
                  <thead>
                    <tr>
                      <th>Mã lô</th>
                      <th>Khách hàng</th>
                      <th>Booking</th>
                      {showBlColumn && <th>B/L</th>}
                      <th>ETD</th>
                      <th>Tuyến</th>
                      <th aria-label="Thao tác" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <ShipmentRow
                        key={r.id}
                        shipment={r}
                        showBl={showBlColumn}
                        canWrite={canWrite}
                        onOpen={openDetail}
                      />
                    ))}

                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={colCount} style={{ textAlign: 'center', padding: '24px 40px', color: 'var(--fg-3)' }}>
                          <ShipmentEmptyState />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Count line always renders; the controls auto-hide ≤1 page. */}
            <Pagination
              page={urlPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              summary={(
                <span className="ds-pagination__summary">
                  {totalItems > 0
                    ? <>Hiển thị <b>{Math.min((urlPage - 1) * PAGE_SIZE + 1, totalItems)}–{Math.min(urlPage * PAGE_SIZE, totalItems)}</b> trên <b>{totalItems}</b> lô</>
                    : <b>0 lô hàng</b>}
                </span>
              )}
            />
          </>
        )}
      </div>

      {canWrite && (
        <ShipmentFormModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => navigate(`/shipments/${created.id}`)}
        />
      )}
    </div>
  );
}

function ShipmentEmptyState() {
  return (
    <div className="shipment-list-empty">
      <img
        src={resolveEmptyIllustration('ops')}
        alt=""
        aria-hidden="true"
        style={{ width: 140, height: 116, objectFit: 'contain' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      Chưa có lô hàng nào khớp bộ lọc.
    </div>
  );
}

interface ShipmentRowProps {
  shipment: Shipment;
  showBl: boolean;
  canWrite: boolean;
  onOpen: (id: number) => void;
}

function ShipmentRow({ shipment: r, showBl, canWrite, onOpen }: ShipmentRowProps) {
  const navigate = useNavigate();
  const flow = flowTypeLabel(r.flowType);
  const cutoff = cutoffDaysLeft(r.cutoffDate);
  const route = routeText(r.pol, r.pod);
  return (
    <tr onClick={() => onOpen(r.id)}>
      <td>
        <Link
          to={`/shipments/${r.id}`}
          className="shipment-list-table__code"
          onClick={(e) => e.stopPropagation()}
        >
          {r.shipmentCode}
        </Link>
        <SubLine value={flow} />
      </td>
      <td>
        <div className="shipment-list-table__customer-main">{r.customerName ?? '—'}</div>
        <SubLine value={r.customerShortName} />
      </td>
      <td className="shipment-list-table__date">{r.bookingNo ?? <Dash />}</td>
      {showBl && <td className="shipment-list-table__date">{r.blNo ?? <Dash />}</td>}
      <td className="shipment-list-table__date">
        {formatDatePadded(r.etd)}
        {isCutoffUrgent(r.cutoffDate) && cutoff != null && (
          <div className="shipment-list-table__cutoff">
            Cut-off {cutoff < 0 ? 'đã qua' : `còn ${cutoff} ngày`}
          </div>
        )}
      </td>
      <td className="shipment-list-table__route" title={route ?? undefined}>
        {route ?? <Dash />}
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        {canWrite && (
          <button
            className="btn btn--ghost btn--icon btn--sm shipment-list-table__edit"
            title="Sửa lô"
            aria-label={`Sửa lô ${r.shipmentCode}`}
            onClick={() => navigate(`/shipments/${r.id}?edit=1`)}
          >
            <PencilLine size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

function ShipmentMobileCard({ shipment: r }: { shipment: Shipment }) {
  const flow = flowTypeLabel(r.flowType);
  const cutoff = cutoffDaysLeft(r.cutoffDate);
  return (
    <ClickableCard to={`/shipments/${r.id}`} className="m-card">
      <div className="m-card__top">
        <span className="shipment-mcard__code">{r.shipmentCode}</span>
        {flow && <span className="shipment-mcard__flow">{flow}</span>}
      </div>
      {r.customerName && <div className="shipment-mcard__customer">{r.customerName}</div>}
      {r.bookingNo && (
        <div className="m-card__row">
          <span className="m-card__row-label">Booking</span>
          <span className="m-card__row-value">{r.bookingNo}</span>
        </div>
      )}
      {r.etd && (
        <div className="m-card__row">
          <span className="m-card__row-label">ETD</span>
          <span className="m-card__row-value">{formatDate(r.etd)}</span>
        </div>
      )}
      {isCutoffUrgent(r.cutoffDate) && cutoff != null && (
        <div className="m-card__row">
          <span className="m-card__row-label">Cut-off</span>
          <span className="m-card__row-value shipment-mcard__cutoff">
            {cutoff < 0 ? 'đã qua' : `còn ${cutoff} ngày`}
          </span>
        </div>
      )}
    </ClickableCard>
  );
}

/** The honest em dash — a missing datum, never a fake zero. */
function Dash() {
  return <span style={{ color: 'var(--fg-3)' }}>—</span>;
}
