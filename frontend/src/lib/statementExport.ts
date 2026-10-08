/**
 * URL + filename builders for the AR/AP statement exports. Both detail pages
 * share these so the on-screen period filter is ALWAYS mirrored into the
 * export request (the old behavior silently exported the whole ledger).
 */

export interface StatementExportRange {
  dateFrom: string;
  dateTo: string;
}

export interface StatementExportOptions {
  /** Bảng kê xăng dầu variant (supplier fuel statement). */
  fuel?: boolean;
}

function periodSlug(range?: StatementExportRange): string {
  if (!range?.dateFrom && !range?.dateTo) return 'toan-bo';
  return `${range.dateFrom || 'dau'}_den_${range.dateTo || 'nay'}`;
}

function nameSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'ncc';
}

/** Query string carrying format + the applied period (+ fuel variant). */
export function buildStatementExportQuery(
  format: string,
  range?: StatementExportRange,
  opts?: StatementExportOptions,
): string {
  const params = new URLSearchParams({ format });
  if (range?.dateFrom) params.set('dateFrom', range.dateFrom);
  if (range?.dateTo) params.set('dateTo', range.dateTo);
  if (opts?.fuel) params.set('type', 'fuel');
  return params.toString();
}

export function buildStatementExportUrl(
  base: string,
  format: string,
  range?: StatementExportRange,
  opts?: StatementExportOptions,
): string {
  return `${base}?${buildStatementExportQuery(format, range, opts)}`;
}

export function statementExportFilename(
  kind: 'sao-ke-ncc' | 'sao-ke-kh' | 'bang-ke-xang-dau',
  entityName: string,
  range?: StatementExportRange,
): string {
  return `${kind}-${nameSlug(entityName)}-${periodSlug(range)}.xlsx`;
}
