import { useMemo } from 'react';

/**
 * AutoHideColumn — data-dense law 27/9 (NEPO-16).
 *
 * A table column that holds nothing but placeholders ('—', empty strings) is
 * dead width: on /debt the "Số ròng" column and on /customers "Hạn mức TD"
 * rendered a full column of dashes, and on /expenses the "Thành phần"/"Xe"
 * columns went blank under the "Chi phí công ty" filter. The column must hide
 * itself while every value is empty and come back as soon as one row carries
 * data.
 *
 * Tables render the header (`<th>`) and the cells (`<td>`) from different
 * components, so the primitive is a pure predicate + a memoized hook rather
 * than a JSX wrapper — both sides call it with the same values array and the
 * same options, and render the column only when it returns true:
 *
 *   const showNet = useAutoHideColumn(debts.map(d => d.linkedSupplierId == null ? null : d.netBalance));
 *   {showNet && <th>Số ròng (gồm VAT)</th>}
 *   …
 *   {showNet && <td>{formatCurrency(d.netBalance)}</td>}
 *
 * The caller owns the empty-mapping (turn the cell's display value into
 * null/'—'/''), so the predicate and the cell renderer can never disagree
 * about what "no data" looks like.
 */

export interface AutoHideColumnOptions {
  /** Values that mean "no data". Defaults to null, undefined, '' and '—'. */
  emptyValues?: readonly unknown[];
  /**
   * Minimum number of DISTINCT present values required to keep the column.
   * 1 (default) matches the audit acceptance rule: re-render as soon as any
   * row has data. Raise it to also collapse single-value columns.
   */
  minDistinct?: number;
}

const DEFAULT_EMPTY: readonly unknown[] = [null, undefined, '', '—'];

/** True when `values` carries at least `minDistinct` non-empty entries. */
export function hasColumnData(values: readonly unknown[], options: AutoHideColumnOptions = {}): boolean {
  const empty = options.emptyValues ?? DEFAULT_EMPTY;
  const minDistinct = options.minDistinct ?? 1;
  const distinct = new Set<string>();
  for (const value of values) {
    if (empty.includes(value)) continue;
    // Money/number columns: format-identical duplicates still count as one
    // distinct value for the stricter mode; primitives like numbers use
    // String() so 5 and '5' collapse together.
    distinct.add(String(value));
    if (distinct.size >= minDistinct) return true;
  }
  return false;
}

/** Memoized AutoHideColumn predicate for use inside a page component body. */
export function useAutoHideColumn(values: readonly unknown[], options: AutoHideColumnOptions = {}): boolean {
  const { emptyValues, minDistinct } = options;
  return useMemo(
    () => hasColumnData(values, { emptyValues, minDistinct }),
    // The caller passes a freshly-mapped array each render; the values drive
    // the decision, the option objects are stable per call site.
    [values, emptyValues, minDistinct],
  );
}
