/**
 * "Nhật ký OCR" — the ADMIN log of AI OCR requests (NEPO-34, follow-up to the
 * NEPO-33 logging). DESIGN LOCK: the mockup + locked spec live in the ticket
 * comment and docs/qa/nepo34-ocr-log-mockup.html — change neither without
 * going back to that comment.
 *
 *   - Desktop ≥768px: dense table (Thời gian · Model · Thời lượng · Trạng
 *     thái · Người gọi · Phản hồi). "Phản hồi" expands the FULL response in a
 *     wrapped mono block + copy button — the No Truncation doctrine: nothing
 *     is ellipsized without a path to the whole value.
 *   - Mobile <768px: one card per request, expand in place.
 *   - Filters: status pills with counts (ListFilterBar), model select, local
 *     date range. 20 rows/page with Trước/Sau paging.
 *   - ADMIN-only at three layers: strictAdminOnly route guard + ADMIN-only
 *     nav item + requireRoles(Role.ADMIN) on the API.
 */
import { useMemo, useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Panel, KPI } from '../components/UI';
import { EmptyState } from '../components/shared';
import { ListFilterBar } from '../components/shared/ListFilterBar';
import { StatusStrip, StatusSwatch } from '../components/shared/StatusStrip';
import { useOcrRequests, OCR_REQUESTS_PAGE_SIZE } from '../hooks/useOcrRequests';
import { formatDateTimeVN, formatNumber } from '../lib/format';
import type { OcrRequestRow, OcrRequestStatus } from '@tingting/shared';
import './OcrRequestsPage.css';

type StatusFilter = 'all' | OcrRequestStatus;

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Tất cả',
  completed: 'Thành công',
  failed: 'Lỗi',
};

/** status → strip/label colour. Text label always rides along (never colour alone). */
const STATUS_COLORS: Record<OcrRequestStatus, string> = {
  completed: 'var(--success)',
  failed: 'var(--error)',
};

/** Pretty-print the stored answer; raw text passes through unchanged. */
function prettyResponse(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function OcrRequestsPage() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [model, setModel] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filters = useMemo(() => ({
    status: status === 'all' ? undefined : status,
    model: model || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [status, model, dateFrom, dateTo]);

  const { data, isLoading, isFetching } = useOcrRequests(filters, page);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts;
  const stats = data?.stats;
  const totalPages = Math.max(1, Math.ceil(total / OCR_REQUESTS_PAGE_SIZE));

  // Keep the selected model in the options even if the current scope no longer
  // contains it — a filter must never silently rewrite the user's choice.
  const modelOptions = useMemo(() => {
    const models = data?.models ?? [];
    return model && !models.includes(model) ? [model, ...models] : models;
  }, [data?.models, model]);

  const resetFilters = () => {
    setStatus('all');
    setModel('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setExpandedId(null);
  };

  const changePage = (next: number) => {
    setPage(Math.min(totalPages, Math.max(1, next)));
    setExpandedId(null);
  };

  const toggleExpand = (id: number) => {
    setExpandedId((current) => (current === id ? null : id));
    setCopiedId(null);
  };

  const copyResponse = async (row: OcrRequestRow) => {
    try {
      await navigator.clipboard.writeText(row.response ?? '');
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard unavailable (permissions/headless) — the value is on screen.
    }
  };

  const errorRate = stats && stats.count > 0
    ? `${Math.round((stats.failed / stats.count) * 1000) / 10}% tổng yêu cầu`
    : undefined;

  return (
    <div className="ocrlog-page">
      {/* ── KPI strip — the 30-day health of the OCR pipeline ─────────────── */}
      <section className="ocrlog-kpis" aria-label="Tổng quan OCR 30 ngày">
        <KPI
          label="Tổng yêu cầu"
          value={formatNumber(stats?.count ?? 0)}
          meta="30 ngày gần nhất"
        />
        <KPI
          label="Lỗi"
          value={formatNumber(stats?.failed ?? 0)}
          variant={(stats?.failed ?? 0) > 0 ? 'danger' : 'success'}
          meta={errorRate}
        />
        <KPI
          label="Thời lượng TB"
          value={stats?.avgDurationMs != null ? formatNumber(stats.avgDurationMs) : '—'}
          unit={stats?.avgDurationMs != null ? 'ms' : undefined}
          meta="trung bình mỗi yêu cầu"
        />
        <KPI
          label="p95 thời lượng"
          value={stats?.p95DurationMs != null ? formatNumber(stats.p95DurationMs) : '—'}
          unit={stats?.p95DurationMs != null ? 'ms' : undefined}
          meta="5% yêu cầu chậm hơn mức này"
        />
      </section>

      {/* ── Filters: status pills · model · local date range ──────────────── */}
      <div className="ocrlog-filters">
        <ListFilterBar<StatusFilter>
          label="Lọc trạng thái"
          value={status}
          onChange={(next) => { setStatus(next); setPage(1); setExpandedId(null); }}
          options={[
            { value: 'all', label: STATUS_LABELS.all, count: counts?.all ?? 0 },
            { value: 'completed', label: STATUS_LABELS.completed, count: counts?.completed ?? 0 },
            { value: 'failed', label: STATUS_LABELS.failed, count: counts?.failed ?? 0 },
          ]}
        />
        <div className="ocrlog-filter-row">
          <div className="ocrlog-field">
            <label htmlFor="ocrlog-model">Model</label>
            <select
              id="ocrlog-model"
              value={model}
              onChange={(e) => { setModel(e.target.value); setPage(1); setExpandedId(null); }}
            >
              <option value="">Tất cả model</option>
              {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="ocrlog-field">
            <label htmlFor="ocrlog-from">Từ ngày</label>
            <input
              id="ocrlog-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); setExpandedId(null); }}
            />
          </div>
          <div className="ocrlog-field">
            <label htmlFor="ocrlog-to">Đến ngày</label>
            <input
              id="ocrlog-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); setExpandedId(null); }}
            />
          </div>
          <button type="button" className="ocrlog-reset" onClick={resetFilters}>Đặt lại</button>
        </div>
      </div>

      {/* ── The log ───────────────────────────────────────────────────────── */}
      <Panel
        className="ocrlog-panel"
        title="Yêu cầu OCR gần đây"
        subtitle="Mỗi dòng là một lần AI OCR chạy — bấm “Phản hồi” để xem toàn bộ kết quả."
      >
        {isLoading ? (
          <div className="ocrlog-loading">Đang tải…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            illustration="ops"
            title="Chưa có yêu cầu OCR nào"
            description="Thử đổi bộ lọc, hoặc chụp ảnh container/seal để tạo dữ liệu đầu tiên."
          />
        ) : (
          <>
            {/* Desktop dense table (≥768px) */}
            <div className="ocrlog-desktop ocrlog-table-wrap">
              <table className="ocrlog-table">
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '30%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Model</th>
                    <th>Thời lượng</th>
                    <th>Trạng thái</th>
                    <th>Người gọi</th>
                    <th>Phản hồi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <RequestRows
                      key={row.id}
                      row={row}
                      expanded={expandedId === row.id}
                      copied={copiedId === row.id}
                      onToggle={() => toggleExpand(row.id)}
                      onCopy={() => copyResponse(row)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (<768px) */}
            <div className="ocrlog-mobile ocrlog-cards">
              {rows.map((row) => (
                <RequestCard
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  copied={copiedId === row.id}
                  onToggle={() => toggleExpand(row.id)}
                  onCopy={() => copyResponse(row)}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="ocrlog-pager">
              <button
                type="button"
                className="ocrlog-reset"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
              >
                ‹ Trước
              </button>
              <button
                type="button"
                className="ocrlog-reset"
                disabled={page >= totalPages}
                onClick={() => changePage(page + 1)}
              >
                Sau ›
              </button>
              <p className="ocrlog-page-info">
                Trang <b>{page}</b>/<b>{totalPages}</b> · <b>{formatNumber(total)}</b> bản ghi
                {isFetching ? ' · Đang tải…' : ''}
              </p>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

interface RequestPartProps {
  row: OcrRequestRow;
  expanded: boolean;
  copied: boolean;
  onToggle: () => void;
  onCopy: () => void;
}

/** The expanded content shared by the desktop row and the mobile card. */
function ExpandedContent({ row, copied, onCopy }: Omit<RequestPartProps, 'expanded' | 'onToggle'>) {
  return (
    <div className="ocrlog-expand">
      {row.error_msg && (
        <>
          <p className="ocrlog-sub-label">Lý do lỗi</p>
          <div className="ocrlog-error-block">{row.error_msg}</div>
        </>
      )}
      <p className="ocrlog-sub-label">Phản hồi đầy đủ</p>
      <div className="ocrlog-json-block">{row.response != null ? prettyResponse(row.response) : 'null'}</div>
      <div className="ocrlog-expand-tools">
        <button type="button" className="ocrlog-reset" onClick={onCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Đã sao chép' : 'Sao chép JSON'}
        </button>
      </div>
    </div>
  );
}

/** Desktop: one table row + (when expanded) one full-width detail row. */
function RequestRows({ row, expanded, copied, onToggle, onCopy }: RequestPartProps) {
  return (
    <>
      <tr>
        <td className="ocrlog-time">{formatDateTimeVN(row.created_at)}</td>
        <td>{row.model != null ? <span className="ocrlog-model-chip">{row.model}</span> : '—'}</td>
        <td className="ocrlog-dur">{formatNumber(row.duration_ms)} ms</td>
        <td className="ocrlog-status-cell">
          <StatusStrip color={STATUS_COLORS[row.status]} />
          <span
            className="ocrlog-status-label"
            style={row.status === 'failed' ? { color: 'var(--error)' } : undefined}
          >
            {STATUS_LABELS[row.status]}
          </span>
        </td>
        <td className="ocrlog-user">{row.user_name ?? '—'}</td>
        <td>
          <button
            type="button"
            className="ocrlog-expand-btn"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            Phản hồi {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="ocrlog-expand-row">
          <td colSpan={6}>
            <ExpandedContent row={row} copied={copied} onCopy={onCopy} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Mobile: one card per request, expand in place. */
function RequestCard({ row, expanded, copied, onToggle, onCopy }: RequestPartProps) {
  return (
    <article className="ocrlog-card">
      <div className="ocrlog-card-top">
        <span className="ocrlog-time">{formatDateTimeVN(row.created_at)}</span>
        <span className="ocrlog-status-label ocrlog-status-inline">
          <StatusSwatch color={STATUS_COLORS[row.status]} />
          <span style={row.status === 'failed' ? { color: 'var(--error)' } : undefined}>
            {STATUS_LABELS[row.status]}
          </span>
        </span>
      </div>
      <div className="ocrlog-card-grid">
        <div>
          <p className="ocrlog-c-k">Model</p>
          <p className="ocrlog-c-v">{row.model ?? '—'}</p>
        </div>
        <div>
          <p className="ocrlog-c-k">Thời lượng</p>
          <p className="ocrlog-c-v">{formatNumber(row.duration_ms)} ms</p>
        </div>
        <div>
          <p className="ocrlog-c-k">Người gọi</p>
          <p className="ocrlog-c-v ocrlog-c-vn">{row.user_name ?? '—'}</p>
        </div>
      </div>
      <button
        type="button"
        className="ocrlog-expand-btn ocrlog-expand-btn-full"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        Phản hồi {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {expanded && <ExpandedContent row={row} copied={copied} onCopy={onCopy} />}
    </article>
  );
}
