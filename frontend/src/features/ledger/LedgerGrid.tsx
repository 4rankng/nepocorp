import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { Download, FilePlus2, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useMonth } from '../../hooks/useMonth';
import { getCalendarMonthRange } from '../../lib/calendar-month';
import { api } from '../../lib/api';
import { downloadBlob } from '../../lib/download';
import { ledgerClient } from '../../api/ledgerClient';
import { qk } from '../../api/keys';
import { useCatalogs } from '../../hooks/useCatalogs';
import { EmptyState, Pagination, useDebouncedValue } from '../../design-system';
import { ANCILLARY_EXPENSE_TYPES, LoadingType, TripStatus, type LedgerRow } from '@tingting/shared';
import { Btn } from '../../components/UI';
import { Alert } from '../../components/shared';
import { buildLedgerColumns, containerReconStatus, type LedgerCellContext, type LedgerCellPatch, type LedgerGroup, type LedgerLeaf } from './ledgerColumns';
import { ContainerStatusDot } from './LedgerEditableCell';
import { LedgerExpandPanel } from './LedgerExpandPanel';
import { LedgerMobileList } from './LedgerMobileList';
import { canEditLedgerMoney, canEditLedgerPlan } from './ledgerPermissions';
import { formatCurrency, formatNumber } from '../../lib/format';
import './ledger.css';

type GridBand = 'plan' | 'revenue' | 'cash' | 'route' | 'docs' | 'carrier' | 'cost' | 'result';
const GROUP_BAND: Record<string, GridBand> = {
  'g-identity': 'plan',
  'g-plan': 'plan',
  'g-revenue': 'revenue',
  'g-cash': 'cash',
  'g-route': 'route',
  'g-docs': 'docs',
  'g-carrier': 'carrier',
  'g-cost': 'cost',
  'g-result': 'result',
};
const VIEW_PRESETS: Array<{ id: string; label: string; bands: GridBand[] }> = [
  { id: 'full', label: 'Sổ cái', bands: ['plan', 'revenue', 'cash', 'route', 'docs', 'carrier', 'cost', 'result'] },
  { id: 'ops', label: 'Điều vận', bands: ['plan', 'route', 'docs', 'carrier'] },
  { id: 'recon', label: 'Đối chiếu', bands: ['plan', 'revenue', 'cash', 'route', 'docs'] },
  { id: 'fuel', label: 'Dầu & Lương', bands: ['plan', 'route', 'cost', 'result'] },
];
type QuickFilter = 'all' | 'no-cont' | 'no-revenue' | 'loss' | 'unreconciled';
const missingCont = (r: LedgerRow): boolean =>
  r.containers.length === 0 || r.containers.every(c => !c.containerNumber);
const unreconciled = (r: LedgerRow): boolean =>
  r.containers.some(c => containerReconStatus(c) === 'pending');
const QUICK_FILTER_PRED: Record<QuickFilter, (r: LedgerRow) => boolean> = {
  all: () => true,
  'no-cont': missingCont,
  'no-revenue': (r) => r.revenue == null || Number(r.revenue) === 0,
  loss: (r) => Number(r.grossProfit ?? 0) < 0,
  unreconciled,
};
const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  all: 'Tất cả',
  'no-cont': 'Chưa có Cont',
  'no-revenue': 'Chưa nhập Cước',
  loss: 'LN âm',
  unreconciled: 'Chưa đối chiếu',
};

const PAGE_SIZE = 200;

/**
 * Bảng kế hoạch (/bang-ke-hoach) — bảng tổng hợp một lệnh một dòng, sửa trực
 * tiếp từng ô theo nhóm quyền (kế hoạch / thu chi), đối chiếu container ngay
 * trong bảng. Tự chứa: tháng từ chip trên topbar, bộ lọc tìm kiếm / khách
 * hàng / trạng thái nội bộ, quick-add và xuất Excel.
 */
export function LedgerGrid() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: catalogs } = useCatalogs();
  const role = user?.role;
  const canPlan = canEditLedgerPlan(role);
  const canMoney = canEditLedgerMoney(role);
  const { month, year } = useMonth();
  const { start: from, end: to } = useMemo(() => getCalendarMonthRange(year, month), [month, year]);
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 300);

  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ key: string; draft: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [cellError, setCellError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const query = useQuery({
    queryKey: qk.ledger.rows(from, to, customerId, status, search, page),
    queryFn: () => ledgerClient.getRows({ from, to, customerId, status: (status || undefined) as TripStatus | undefined, q: search || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    enabled: !!from && !!to && from <= to,
  });
  const rows: LedgerRow[] = useMemo(() => query.data?.rows ?? [], [query.data]);

  // ── Bộ cột theo góc nhìn (Saved Views) + chip lọc nhanh ────────────────────
  const [bandView, setBandView] = useState('full');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const quickCounts: Record<QuickFilter, number> = {
    all: rows.length,
    'no-cont': rows.filter(missingCont).length,
    'no-revenue': rows.filter(r => r.revenue == null || Number(r.revenue) === 0).length,
    loss: rows.filter(r => Number(r.grossProfit ?? 0) < 0).length,
    unreconciled: rows.filter(unreconciled).length,
  };
  const displayRows = useMemo(() => rows.filter(QUICK_FILTER_PRED[quickFilter]), [rows, quickFilter]);

  // Reset pagination when the filters change so a narrower result set can't
  // strand the user past the last page.
  React.useEffect(() => { setPage(0); }, [from, to, customerId, status, search]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.ledger.all });
  }, [queryClient]);

  // ── Cell editing (group-scoped PATCH) ──────────────────────────────────────
  // Enter-commit + the unmount blur can both reach the handler; the second
  // run must be a no-op (it fired with an already-cleared draft once and
  // wrote 0 over the saved value).
  const committingKeyRef = useRef<string | null>(null);
  const commitCell = useCallback((
    row: LedgerRow,
    colId: string,
    patch: LedgerCellPatch,
  ): string | null => {
    const key = `${row.id}:${colId}`;
    if (committingKeyRef.current === key) return null;
    committingKeyRef.current = key;
    setSavingKey(key);
    setCellError(null);
    (async () => {
      try {
        if (patch.kind === 'plan') {
          await ledgerClient.patchPlan(row.id, { ...patch.body, expectedVersion: row.version });
        } else if (patch.kind === 'money') {
          await ledgerClient.patchMoney(row.id, { ...patch.body, expectedVersion: row.version });
        } else {
          await ledgerClient.patchExpense(row.id, patch.expenseId, patch.body);
        }
        setEditing(null);
        refetch();
      } catch (err) {
        setCellError((err as Error).message || 'Không lưu được ô dữ liệu');
      } finally {
        committingKeyRef.current = null;
        setSavingKey(null);
      }
    })();
    return null;
  }, [refetch]);

  const startEdit = useCallback((rowId: number, colId: string, initial: string) => {
    setCellError(null);
    setEditing({ key: `${rowId}:${colId}`, draft: initial });
  }, []);
  const draftChange = useCallback((draft: string) => {
    setEditing((prev) => (prev ? { ...prev, draft } : prev));
  }, []);
  const cancelEdit = useCallback(() => {
    setEditing(null);
    setCellError(null);
  }, []);
  const toggleExpand = useCallback((rowId: number) => {
    setExpandedId((prev) => {
      const next = prev === rowId ? null : rowId;
      if (next != null) {
        // The panel renders below the row — bring it into view after mount.
        requestAnimationFrame(() => {
          document.querySelector('.ledger-expand-row')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
      return next;
    });
  }, []);

  // The column defs must have a STABLE identity across keystrokes: rebuilding
  // them per edit re-creates every cell renderer function, React remounts the
  // editing <input>, and typed characters get swallowed. The closures instead
  // read this object's fields at render time (identity stable, fields
  // reassigned each render), so they always see the fresh editing state.
  const cellCtxRef = useRef<LedgerCellContext | null>(null);
  if (cellCtxRef.current == null) {
    cellCtxRef.current = {
      canPlan,
      canMoney,
      customerOptions: (catalogs?.customers ?? []).map(c => ({ value: String(c.id), label: c.name })),
      editing: null,
      savingKey: null,
      onToggleExpand: toggleExpand,
      onStartEdit: startEdit,
      onDraftChange: draftChange,
      onCommit: commitCell,
      onCancelEdit: cancelEdit,
    };
  }
  const cellCtx = cellCtxRef.current;
  cellCtx.canPlan = canPlan;
  cellCtx.canMoney = canMoney;
  cellCtx.customerOptions = (catalogs?.customers ?? []).map(c => ({ value: String(c.id), label: c.name }));
  cellCtx.editing = editing;
  cellCtx.savingKey = savingKey;
  cellCtx.onToggleExpand = toggleExpand;
  cellCtx.onStartEdit = startEdit;
  cellCtx.onDraftChange = draftChange;
  cellCtx.onCommit = commitCell;
  cellCtx.onCancelEdit = cancelEdit;

  // cellCtx is a stable identity whose fields are refreshed above — the empty
  // dep array is the point (rebuilding defs per keystroke remounts the editor).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => buildLedgerColumns(cellCtx), []);

  // Bộ cột theo góc nhìn đang chọn — nhóm identity luôn hiển thị (frozen).
  const activeBands = VIEW_PRESETS.find(v => v.id === bandView)?.bands ?? VIEW_PRESETS[0].bands;
  const visibleColumns = useMemo(
    () => (columns as Array<LedgerGroup | LedgerLeaf>).filter((g) => {
      if (g.id === 'g-identity') return true;
      const band = GROUP_BAND[String(g.id)];
      return band != null && activeBands.includes(band);
    }) as ColumnDef<LedgerRow, unknown>[],
    // columns + activeBands thay đổi cùng lúc khi người dùng đổi góc nhìn;
    // đổi view remount cell editor nhưng đó là hành động chủ động, chấp nhận được.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, bandView],
  );

  const table = useReactTable({
    data: displayRows,
    columns: visibleColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const headerGroups = table.getHeaderGroups();

  // ── Quick add + export ─────────────────────────────────────────────────────
  const [quickAdd, setQuickAdd] = useState({ customerId: '', departureDate: todayVN(), notes: '' });
  const submitQuickAdd = async () => {
    if (!quickAdd.customerId || !quickAdd.departureDate) {
      setQuickAddError('Chọn khách hàng và ngày kế hoạch');
      return;
    }
    setQuickAddSaving(true);
    setQuickAddError(null);
    try {
      await ledgerClient.createDraft({
        customerId: Number(quickAdd.customerId),
        departureDate: quickAdd.departureDate,
        notes: quickAdd.notes || undefined,
      });
      setQuickAddOpen(false);
      setQuickAdd({ customerId: '', departureDate: todayVN(), notes: '' });
      refetch();
    } catch (err) {
      setQuickAddError((err as Error).message || 'Không tạo được dòng mới');
    } finally {
      setQuickAddSaving(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await api.getBlob(ledgerClient.exportUrl({
        from,
        to,
        customerId,
        status: (status || undefined) as TripStatus | undefined,
        q: search || undefined,
      }));
      downloadBlob(blob, `so-chuyen-di-${from}_${to}.xlsx`);
    } catch (err) {
      setLoadError((err as Error).message || 'Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  const totalItems = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <div className="ledger-page">
      <div className="ledger-toolbar" role="toolbar" aria-label="Bộ lọc bảng kế hoạch">
        <input
          type="search"
          aria-label="Tìm kiếm"
          placeholder="Tìm mã chuyến, KH, biển số, số cont…"
          className="ledger-toolbar__search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          aria-label="Khách hàng"
          className="ledger-toolbar__select"
          value={customerId ?? ''}
          onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Tất cả khách hàng</option>
          {(catalogs?.customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          aria-label="Trạng thái"
          className="ledger-toolbar__select"
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value || undefined)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value={TripStatus.CREATED}>Mới tạo</option>
          <option value={TripStatus.IN_TRANSIT}>Đang chạy</option>
          <option value={TripStatus.COMPLETED}>Hoàn thành</option>
          <option value={TripStatus.LOCKED}>Đã chốt</option>
        </select>
        <div className="ledger-toolbar__spacer" />
        <div className="ledger-toolbar__actions">
          {canPlan && (
            <Btn variant="primary" size="sm" icon={<FilePlus2 size={15} />} onClick={() => { setQuickAddOpen((v) => !v); setQuickAddError(null); }}>
              Thêm dòng
            </Btn>
          )}
          <Btn size="sm" icon={exporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />} onClick={exportExcel} disabled={exporting}>
            Xuất Excel
          </Btn>
        </div>
      </div>

      <div className="ledger-views" role="tablist" aria-label="Bộ cột và lọc nhanh">
        <div className="ledger-views__presets">
          {VIEW_PRESETS.map(v => (
            <button
              key={v.id}
              type="button"
              className={bandView === v.id ? 'is-active' : ''}
              aria-pressed={bandView === v.id}
              onClick={() => setBandView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="ledger-views__filters">
          {(Object.keys(quickCounts) as QuickFilter[]).map(f => (
            <button
              key={f}
              type="button"
              className={`ledger-chip${quickFilter === f ? ' is-active' : ''}${quickCounts[f] === 0 && f !== 'all' ? ' is-empty' : ''}`}
              onClick={() => setQuickFilter(f)}
            >
              {QUICK_FILTER_LABELS[f]}
              <span className="ledger-chip__count">{quickCounts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {cellError && <Alert variant="error">{cellError}</Alert>}
        {loadError && <Alert variant="error">{loadError}</Alert>}
      </div>

      {quickAddOpen && (
        <div className="ledger-quickadd" role="form" aria-label="Thêm dòng sổ cái">
          <select
            aria-label="Khách hàng"
            className="ledger-quickadd__select"
            value={quickAdd.customerId}
            onChange={(e) => setQuickAdd((p) => ({ ...p, customerId: e.target.value }))}
          >
            <option value="">— Khách hàng —</option>
            {(catalogs?.customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            aria-label="Ngày kế hoạch"
            type="date"
            className="ledger-quickadd__date"
            value={quickAdd.departureDate}
            onChange={(e) => setQuickAdd((p) => ({ ...p, departureDate: e.target.value }))}
          />
          <input
            aria-label="Nội dung"
            type="text"
            placeholder="Nội dung vận chuyển (không bắt buộc)"
            className="ledger-quickadd__notes"
            value={quickAdd.notes}
            onChange={(e) => setQuickAdd((p) => ({ ...p, notes: e.target.value }))}
          />
          <Btn variant="primary" onClick={submitQuickAdd} disabled={quickAddSaving}>
            {quickAddSaving ? 'Đang lưu…' : 'Tạo dòng'}
          </Btn>
          <Btn onClick={() => setQuickAddOpen(false)}>Đóng</Btn>
          {quickAddError && <span className="ledger-quickadd__error">{quickAddError}</span>}
        </div>
      )}

      {isMobile ? (
        <>
          {query.isLoading ? (
            <div className="ledger-skeleton" aria-label="Đang tải…">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="ledger-skeleton__row" />)}
            </div>
          ) : query.isError ? (
            <Alert variant="error">Không tải được dữ liệu. Vui lòng thử lại.</Alert>
          ) : displayRows.length === 0 ? (
            <EmptyState
              illustration="empty-trips"
              title="Không có lệnh nào trong khoảng thời gian này"
              description={canPlan ? 'Đổi tháng ở thanh trên, hoặc bấm “Thêm dòng” để tạo lệnh mới.' : 'Đổi tháng ở thanh trên để xem khoảng khác.'}
            />
          ) : (
            <LedgerMobileList rows={displayRows} ctx={cellCtx} canPlan={canPlan} canMoney={canMoney} />
          )}
        </>
      ) : (
        <div className="table-wrap">
        <div className="table-scroll ledger-scroll">
          {query.isLoading ? (
            <div className="ledger-skeleton" aria-label="Đang tải…">
              {Array.from({ length: 8 }, (_, i) => <div key={i} className="ledger-skeleton__row" />)}
            </div>
          ) : query.isError ? (
            <Alert variant="error">Không tải được dữ liệu. Vui lòng thử lại.</Alert>
          ) : displayRows.length === 0 ? (
            <EmptyState
              illustration="empty-trips"
              title="Không có lệnh nào trong khoảng thời gian này"
              description={canPlan ? 'Đổi tháng ở thanh trên, hoặc bấm “Thêm dòng” để tạo lệnh mới.' : 'Đổi tháng ở thanh trên để xem khoảng khác.'}
            />
          ) : (
            <table className="ledger-table">
              <caption>Sổ chuyến đi — bảng thu chi: kế hoạch, doanh thu, tạm ứng, chi phí và kết quả theo lệnh vận chuyển</caption>
              <thead>
                {headerGroups.map((hg, depth) => (
                  <tr key={hg.id} className={depth === 0 ? 'ledger-table__group-row' : undefined}>
                    {hg.headers.map((header) => {
                      const meta = (header.column.columnDef.meta ?? {}) as { groupEnd?: boolean; align?: 'num'; group?: string };
                      if (depth === 0) {
                        const label = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                        return (
                          <th
                            key={header.id}
                            colSpan={header.colSpan}
                            className={`ledger-th ledger-th--group${meta.groupEnd ? ' ledger-th--group-end' : ''}${header.column.id === 'g-identity' ? ' ledger-th--identity' : ''}`}
                          >
                            {label}
                          </th>
                        );
                      }
                      return (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          className={`ledger-th${meta.align === 'num' ? ' ledger-th--num' : ''}${meta.groupEnd ? ' ledger-th--group-end' : ''}${header.column.id === 'ledger-code' ? ' ledger-th--frozen' : ''}${header.column.id === 'ledger-status' ? ' ledger-th--statuscol' : ''}`}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const r = row.original;
                  // Sheet convention: one row per container. Multi-container
                  // trips flatten — trip-level money stays on the first row
                  // and each extra container gets an indented sub-row carrying
                  // its own identifiers + fee state.
                  const extraContainers = r.containers.slice(1);
                  return (
                    <React.Fragment key={row.id}>
                      <tr className={`ledger-row${expandedId === r.id ? ' ledger-row--expanded' : ''}`}>
                        {row.getVisibleCells().map((cell) => {
                          const meta = (cell.column.columnDef.meta ?? {}) as { groupEnd?: boolean; align?: 'num' };
                          return (
                            <td
                              key={cell.id}
                              className={`ledger-td${meta.align === 'num' ? ' ledger-td--num' : ''}${meta.groupEnd ? ' ledger-td--group-end' : ''}${cell.column.id === 'ledger-code' ? ' ledger-td--frozen' : ''}${cell.column.id === 'ledger-status' ? ' ledger-td--statuscol' : ''}`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                      {extraContainers.map((container) => (
                        <tr key={`${row.id}-c${container.id}`} className="ledger-subrow">
                          {row.getVisibleCells().map((cell) => {
                            const meta = (cell.column.columnDef.meta ?? {}) as { groupEnd?: boolean; align?: 'num' };
                            return (
                              <td
                                key={cell.id}
                                className={`ledger-td${meta.align === 'num' ? ' ledger-td--num' : ''}${meta.groupEnd ? ' ledger-td--group-end' : ''}${cell.column.id === 'ledger-code' ? ' ledger-td--frozen' : ''}`}
                              >
                                <SubRowCell columnId={cell.column.id} container={container} index={extraContainers.indexOf(container) + 2} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {expandedId === r.id && (
                        <tr className="ledger-expand-row">
                          <td colSpan={row.getVisibleCells().length}>
                            <LedgerExpandPanel row={r} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              {displayRows.length > 0 && (
                <tfoot className="ledger-tfoot">
                  <tr>
                    {table.getRowModel().rows[0]?.getVisibleCells().map((cell) => (
                      <td
                        key={cell.column.id}
                        className={`ledger-td${(cell.column.columnDef.meta as { align?: 'num' } | undefined)?.align === 'num' ? ' ledger-td--num' : ''}${cell.column.id === 'ledger-code' ? ' ledger-td--frozen' : ''}`}
                      >
                        {footerTotalFor(cell.column.id, displayRows)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
      )}

      {totalItems > PAGE_SIZE && !isMobile && (
        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onChange={(p) => setPage(p - 1)}
        />
      )}
    </div>
  );
}

/** Today (YYYY-MM-DD) in the office timezone — the quick-add default, matching the backend's todayVN. */
function todayVN(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Container columns a flattened sub-row fills (everything else stays blank). */
const SUBROW_VALUE_BY_COLUMN: Record<string, true> = {
  containerNumber: true,
  sealNumber: true,
  declarationNumbers: true,
  cargoWeight: true,
  containerQty: true,
};

/** One flattened container sub-row cell: identifiers + fee state, empty elsewhere. */
function SubRowCell({ columnId, container, index }: {
  columnId: string;
  container: LedgerRow['containers'][number];
  index: number;
}) {
  if (columnId === 'ledger-code') {
    return <span className="ledger-subrow__mark">↳ Cont {index}</span>;
  }
  if (!SUBROW_VALUE_BY_COLUMN[columnId]) return null;
  switch (columnId) {
    case 'containerNumber':
      return (
        <span className="ledger-cell__stack">
          <ContainerStatusDot status={containerReconStatus(container)} />
          {container.containerNumber ?? '—'}
        </span>
      );
    case 'sealNumber':
      return <>{container.seals.join(', ') || '—'}</>;
    case 'declarationNumbers':
      return <>{container.declarationNumbers.join(', ') || '—'}</>;
    case 'cargoWeight':
      return <>{container.cargoWeightKg != null ? formatNumber(Number(container.cargoWeightKg)) : '—'}</>;
    case 'containerQty':
      return <>{container.containerTypeCode ? `1x${container.containerTypeCode}` : '—'}</>;
    default:
      return null;
  }
}

/** Footer totals: every column names its own extractor — several grid column
 *  ids intentionally differ from the LedgerRow field names (sell fees live in
 *  expenseRollup, km in legs[], roadAllowance maps to totalRoadAllowance). */
function footerTotalFor(columnId: string, rows: LedgerRow[]): ReactNode | null {
  if (columnId === 'ledger-code') {
    return <span className="ledger-tfoot__label">Tổng ({rows.length} lệnh)</span>;
  }
  const num = (row: LedgerRow, field: string): number => Number((row as unknown as Record<string, string | null>)[field] ?? 0) || 0;
  const rollup = (row: LedgerRow, expenseType: string): number =>
    Number(row.expenseRollup.find(e => e.expenseType === expenseType)?.sellTotal || 0);
  const km = (row: LedgerRow, loadingType: LoadingType, sequence: number): number =>
    row.legs.find(l => l.sequence === sequence && l.loadingType === loadingType)?.km ?? 0;

  switch (columnId) {
    case 'revenue': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'revenue'), 0))}</>;
    case 'fee-nang-ha': return <>{formatCurrency(rows.reduce((a, r) => a + rollup(r, ANCILLARY_EXPENSE_TYPES[0]) + rollup(r, ANCILLARY_EXPENSE_TYPES[1]), 0))}</>;
    case 'fee-nop-ho': return <>{formatCurrency(rows.reduce((a, r) => a + rollup(r, ANCILLARY_EXPENSE_TYPES[3]) + rollup(r, ANCILLARY_EXPENSE_TYPES[4]) + rollup(r, ANCILLARY_EXPENSE_TYPES[5]) + rollup(r, ANCILLARY_EXPENSE_TYPES[6]), 0))}</>;
    case 'fee-khac': return <>{formatCurrency(rows.reduce((a, r) => a + rollup(r, ANCILLARY_EXPENSE_TYPES[2]) + rollup(r, ANCILLARY_EXPENSE_TYPES[7]), 0))}</>;
    case 'advanceTotal': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'advanceTotal'), 0))}</>;
    case 'tollCost': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'tollCost'), 0))}</>;
    case 'km-HANG-1': return <>{formatNumber(rows.reduce((a, r) => a + km(r, LoadingType.HANG, 1), 0))}</>;
    case 'km-VO-1': return <>{formatNumber(rows.reduce((a, r) => a + km(r, LoadingType.VO, 1), 0))}</>;
    case 'km-HANG-2': return <>{formatNumber(rows.reduce((a, r) => a + km(r, LoadingType.HANG, 2), 0))}</>;
    case 'km-VO-2': return <>{formatNumber(rows.reduce((a, r) => a + km(r, LoadingType.VO, 2), 0))}</>;
    case 'fuelLiters': return <>{formatNumber(rows.reduce((a, r) => a + num(r, 'fuelLiters'), 0))}</>;
    case 'totalFuelCost': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'totalFuelCost'), 0))}</>;
    case 'driverSalary': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'driverSalary'), 0))}</>;
    case 'roadAllowance': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'totalRoadAllowance'), 0))}</>;
    case 'externalFreight': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'externalFreightCost'), 0))}</>;
    case 'totalCost': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'totalCost'), 0))}</>;
    case 'grossProfit': return <>{formatCurrency(rows.reduce((a, r) => a + num(r, 'grossProfit'), 0))}</>;
    default: return null;
  }
}
