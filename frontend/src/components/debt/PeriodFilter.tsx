import { useCallback, useMemo } from 'react';

/**
 * Period filter for the AR/AP detail ledger tab. Two modes:
 *   - "month": pick a month (T1–T12) and year; resolves to [first day, last day].
 *   - "range": two <input type="date"> (Từ ngày / Đến ngày).
 *
 * Both modes emit a { dateFrom, dateTo } range via `onChange` so the parent can
 * feed it directly into `useCustomerStatement(id, range)` /
 * `useSupplierStatement(id, range)`.
 *
 * Uses daisyUI's `d-` prefixed classes (per tokens.css daisyUI config) so it
 * cannot collide with the project's existing `.btn`/`.input` BEM classes.
 */

export type PeriodMode = 'month' | 'range';

export interface PeriodRange {
  dateFrom: string;
  dateTo: string;
}

export interface PeriodFilterProps {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  month: number;        // 1–12
  year: number;
  onMonthYearChange: (next: { month: number; year: number }) => void;
  dateFrom: string;     // ISO yyyy-mm-dd
  dateTo: string;       // ISO yyyy-mm-dd
  onRangeChange: (next: Partial<PeriodRange>) => void;
}

const MONTH_LABELS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

/** Year options = current year ± 3 (covers recent history + next year). */
function useYearOptions(): number[] {
  return useMemo(() => {
    const now = new Date().getFullYear();
    const years: number[] = [];
    for (let y = now - 3; y <= now + 1; y++) years.push(y);
    return years;
  }, []);
}

export function PeriodFilter(props: PeriodFilterProps) {
  const { mode, onModeChange, month, year, onMonthYearChange, dateFrom, dateTo, onRangeChange } = props;
  const yearOptions = useYearOptions();

  const handleMonth = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthYearChange({ month: Number(e.target.value), year });
  }, [year, onMonthYearChange]);

  const handleYear = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthYearChange({ month, year: Number(e.target.value) });
  }, [month, onMonthYearChange]);

  return (
    <div className="period-filter" role="group" aria-label="Bộ lọc thời gian">
      {/* Mode switch — two segmented buttons inside a join */}
      <div className="d-join" role="tablist" aria-label="Chế độ lọc">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'month'}
          className={`d-btn d-btn-sm ${mode === 'month' ? 'd-btn-primary' : 'd-btn-outline'}`}
          onClick={() => onModeChange('month')}
        >
          Theo tháng
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'range'}
          className={`d-btn d-btn-sm ${mode === 'range' ? 'd-btn-primary' : 'd-btn-outline'}`}
          onClick={() => onModeChange('range')}
        >
          Theo khoảng
        </button>
      </div>

      {mode === 'month' ? (
        <div className="d-join">
          <select
            className="d-select d-select-sm d-join-item"
            value={month}
            onChange={handleMonth}
            aria-label="Chọn tháng"
          >
            {MONTH_LABELS.map((label, i) => (
              <option key={i + 1} value={i + 1}>{label}</option>
            ))}
          </select>
          <select
            className="d-select d-select-sm d-join-item"
            value={year}
            onChange={handleYear}
            aria-label="Chọn năm"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="period-filter__range">
          <label className="period-filter__field">
            <span>Từ ngày</span>
            <input
              type="date"
              className="d-input d-input-sm"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => onRangeChange({ dateFrom: e.target.value })}
            />
          </label>
          <label className="period-filter__field">
            <span>Đến ngày</span>
            <input
              type="date"
              className="d-input d-input-sm"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => onRangeChange({ dateTo: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * Resolve the active mode + inputs into a single { dateFrom, dateTo } range
 * the parent can pass into the API hook. Kept here so both detail pages share
 * one source of truth for "first/last day of month" math.
 */
export function resolvePeriodRange(opts: {
  mode: PeriodMode;
  month: number;
  year: number;
  dateFrom: string;
  dateTo: string;
}): PeriodRange {
  if (opts.mode === 'range') {
    return { dateFrom: opts.dateFrom, dateTo: opts.dateTo };
  }
  // Month mode → [first day, last day] of the picked month.
  const firstDay = new Date(opts.year, opts.month - 1, 1);
  const lastDay = new Date(opts.year, opts.month, 0); // day 0 of next month = last day
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { dateFrom: toIso(firstDay), dateTo: toIso(lastDay) };
}

/** Default initial state for a detail page's period filter (current month). */
export function initialPeriodState() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1–12
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    mode: 'month' as PeriodMode,
    month,
    year,
    dateFrom: toIso(firstDay),
    dateTo: toIso(lastDay),
  };
}
