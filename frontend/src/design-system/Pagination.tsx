import { useMemo, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import './Pagination.css';

/** Batch sizes offered everywhere — desktop, tablet and phone. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  /** Rendered as a "Số dòng" select. Omit together with onPageSizeChange to hide it. */
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  onChange: (page: number) => void;
  /**
   * `pages` (default) renders numbered buttons.
   * `infinite` renders the running count plus a scroll sentinel that pulls the
   * next batch — used by the long lists.
   */
  mode?: 'pages' | 'infinite';
  /** infinite mode: is there another batch to pull? */
  hasMore?: boolean;
  /** infinite mode: a batch is currently in flight. */
  isLoadingMore?: boolean;
  /** infinite mode: request the next batch. */
  onLoadMore?: () => void;
  summary?: ReactNode;
  siblingCount?: number;
}

function buildPageWindow(current: number, total: number, sibling: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, current - sibling);
  const end = Math.min(total - 1, current + sibling);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push('…');
  out.push(total);
  return out;
}

export function Pagination({
  page, totalPages, totalItems, pageSize, pageSizeOptions = PAGE_SIZE_OPTIONS,
  onPageSizeChange, onChange, mode = 'pages', hasMore = false, isLoadingMore = false,
  onLoadMore, summary, siblingCount = 1,
}: PaginationProps) {
  const pages = useMemo(() => buildPageWindow(page, totalPages, siblingCount), [page, totalPages, siblingCount]);
  const infinite = mode === 'infinite';

  // The sentinel lives at the bottom of the list; re-arm only while a batch can
  // actually be requested so a finished list never re-fires.
  const sentinelRef = useInfiniteScroll({
    enabled: infinite && hasMore && !isLoadingMore && !!onLoadMore,
    onLoadMore: () => onLoadMore?.(),
  });

  if (!infinite && totalPages <= 1 && !summary) return null;

  const shown = totalItems !== undefined && pageSize !== undefined
    ? Math.min(page * pageSize, totalItems)
    : undefined;

  const defaultSummary = totalItems !== undefined && pageSize !== undefined && (
    <span className="ds-pagination__summary">
      Hiển thị <b>{Math.min((page - 1) * pageSize + 1, totalItems)}–{Math.min(page * pageSize, totalItems)}</b> trên <b>{totalItems}</b>
    </span>
  );

  const infiniteSummary = totalItems !== undefined && shown !== undefined
    ? <span className="ds-pagination__summary">Đã tải <b>{shown}</b>/<b>{totalItems}</b></span>
    : undefined;

  const sizeSelect = pageSize !== undefined && onPageSizeChange && (
    <label className="ds-pagination__size">
      <span className="ds-pagination__size-label">Số dòng</span>
      <select
        className="ds-pagination__size-select"
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
        aria-label="Số dòng mỗi lần tải"
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className={`ds-pagination${infinite ? ' ds-pagination--infinite' : ''}`}>
      <div className="ds-pagination__summary-slot">
        {summary ?? (infinite ? infiniteSummary : defaultSummary)}
      </div>

      {infinite ? (
        <div className="ds-pagination__controls">
          {sizeSelect}
          <div ref={sentinelRef} className="ds-pagination__sentinel" aria-hidden="true" />
          {isLoadingMore && (
            <span className="ds-pagination__loading" role="status">
              <Loader2 size={14} className="spin" /> Đang tải…
            </span>
          )}
          {!hasMore && !isLoadingMore && totalItems !== undefined && totalItems > 0 && (
            <span className="ds-pagination__end">Đã hiển thị tất cả {totalItems}</span>
          )}
        </div>
      ) : (
        <div className="ds-pagination__controls">
          {sizeSelect}
          <button
            className="ds-pagination__btn"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
            aria-label="Trang trước"
            type="button"
          >
            <ChevronLeft size={14} />
          </button>
          {pages.map((p, i) =>
            p === '…'
              ? <span key={`e${i}`} className="ds-pagination__ellipsis">…</span>
              : (
                <button
                  key={p}
                  className={`ds-pagination__btn${p === page ? ' ds-pagination__btn--active' : ''}`}
                  onClick={() => onChange(p)}
                  type="button"
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              )
          )}
          <button
            className="ds-pagination__btn"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
            aria-label="Trang sau"
            type="button"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
