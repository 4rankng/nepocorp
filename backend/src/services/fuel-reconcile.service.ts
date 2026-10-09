/**
 * NCC fuel-file reconciliation (kanban 081026215250a).
 *
 * The supplier's own sheet has no agreed layout — the real file is sheet "NEPO",
 * 376 rows x 132 columns, organised by vehicle and oil type, with every
 * "T.Tiền" cell reading 0.0. Rather than fixing a format up front, the operator
 * points at the vehicle / date / liters columns at upload time; this module
 * receives rows already mapped and does the matching.
 *
 * Matching key is (vehicle, day) and the compared figure is the TOTAL liters for
 * that day: a supplier bills per vehicle per day, and one vehicle can draw two
 * oil types on the same day (two rows in their file, two allocations here).
 *
 * Pure and synchronous on purpose: no database, no HTTP, so every branch is
 * unit-testable. Read-only — reconciliation never writes a ledger row.
 */

import type {
  FuelReconcileResult,
  FuelReconcileResultRow,
  FuelReconcileStatus,
} from '@tingting/shared';

export interface FuelReconcileFileRow {
  licensePlate: string;
  date: string;
  liters?: number | string | null;
  amount?: number | string | null;
  oilType?: string | null;
  sourceRow?: number;
}

export interface FuelReconcileSystemRow {
  licensePlate: string | null;
  departureDate: string | null;
  liters: number | null;
  amount: number;
  tripCode: string | null;
}

/** Liters are allowed to differ by half a liter — the sheet rounds to whole liters. */
const LITERS_TOLERANCE = 0.5;
/** VND amounts compare exactly apart from a rounding đồng. */
const AMOUNT_TOLERANCE = 1;

/**
 * Uppercase and drop every separator so "15C-136.31", "15c 136.31" and
 * "15C136.31" are one vehicle. The supplier's sheet writes plates its own way.
 */
export function normalizePlate(raw: string): string {
  return (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Read the several date shapes the sheet mixes: dd/mm/yyyy (Vietnamese habit),
 * yyyy-mm-dd, dd-mm-yyyy, an Excel serial number (days since 1899-12-30) and a
 * bare year-month. Returns yyyy-mm-dd, or null when the cell is unusable — the
 * caller reports those rows instead of dropping them silently.
 */
export function normalizeReconcileDate(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === '') return null;

  // Excel serial: a bare number in the modern range. 40000 ≈ 2009, 60000 ≈ 2064.
  if (/^\d{4,5}(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
      const ms = Math.round((serial - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }

  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return buildDate(year, Number(dmy[2]), Number(dmy[1]));
  }
  return null;
}

function buildDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Parse a cell that may be a number, or text with Vietnamese separators:
 * "1.234,56" (dot thousands, comma decimal) and "1234.56" both mean 1234.56.
 * When both separators appear the LAST one is the decimal mark; a lone dot
 * followed by exactly three digits is treated as a thousands separator, which is
 * how the sheet writes whole liters and đồng.
 */
export function toNumber(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let text = String(raw).trim();
  if (text === '') return null;
  text = text.replace(/[^\d.,-]/g, '');
  if (text === '' || text === '-') return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
    else text = text.replace(/,/g, '');
  } else if (lastComma >= 0) {
    text = text.replace(',', '.');
  } else if (lastDot >= 0) {
    const decimals = text.length - lastDot - 1;
    if (decimals === 3 && text.indexOf('.') === lastDot) text = text.replace('.', '');
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

interface Bucket {
  licensePlate: string;
  date: string;
  liters: number;
  hasLiters: boolean;
  amount: number;
  hasAmount: boolean;
  tripCodes: string[];
  fileRows: number[];
  oilTypes: string[];
}

const keyOf = (plate: string, date: string) => `${plate}|${date}`;

function emptyBucket(licensePlate: string, date: string): Bucket {
  return { licensePlate, date, liters: 0, hasLiters: false, amount: 0, hasAmount: false, tripCodes: [], fileRows: [], oilTypes: [] };
}

/** Sum both sides into one bucket per (vehicle, day). */
export function reconcileFuelRows(
  fileRows: FuelReconcileFileRow[],
  systemRows: FuelReconcileSystemRow[],
): FuelReconcileResult {
  const file = new Map<string, Bucket>();
  const system = new Map<string, Bucket>();
  const unreadable: FuelReconcileResultRow[] = [];
  let fileTotalLiters = 0;
  let fileTotalAmount = 0;

  fileRows.forEach((row, index) => {
    const plate = normalizePlate(row.licensePlate);
    const date = normalizeReconcileDate(row.date);
    const liters = toNumber(row.liters);
    const amount = toNumber(row.amount);
    if (liters !== null) fileTotalLiters += liters;
    if (amount !== null) fileTotalAmount += amount;

    if (!plate || !date) {
      unreadable.push({
        status: 'UNREADABLE_DATE',
        licensePlate: row.licensePlate ?? '',
        date: String(row.date ?? ''),
        fileLiters: liters,
        systemLiters: null,
        fileAmount: amount,
        systemAmount: null,
        tripCodes: [],
        fileRows: [row.sourceRow ?? index + 1],
        note: !plate ? 'Dòng không có biển số' : 'Không đọc được ngày (cần dd/mm/yyyy hoặc yyyy-mm-dd)',
      });
      return;
    }
    const bucket = file.get(keyOf(plate, date)) ?? emptyBucket(plate, date);
    if (liters !== null) { bucket.liters += liters; bucket.hasLiters = true; }
    if (amount !== null && amount !== 0) { bucket.amount += amount; bucket.hasAmount = true; }
    bucket.fileRows.push(row.sourceRow ?? index + 1);
    if (row.oilType) bucket.oilTypes.push(row.oilType);
    file.set(keyOf(plate, date), bucket);
  });

  let systemTotalLiters = 0;
  let systemTotalAmount = 0;
  for (const row of systemRows) {
    const plate = normalizePlate(row.licensePlate ?? '');
    const date = normalizeReconcileDate(row.departureDate);
    const liters = row.liters ?? null;
    const amount = row.amount ?? 0;
    if (liters !== null) systemTotalLiters += liters;
    systemTotalAmount += amount;
    if (!plate || !date) continue;
    const bucket = system.get(keyOf(plate, date)) ?? emptyBucket(plate, date);
    if (liters !== null) { bucket.liters += liters; bucket.hasLiters = true; }
    bucket.amount += amount;
    bucket.hasAmount = true;
    if (row.tripCode) bucket.tripCodes.push(row.tripCode);
    system.set(keyOf(plate, date), bucket);
  }

  const rows: FuelReconcileResultRow[] = [];
  for (const [key, f] of file) {
    const s = system.get(key);
    if (!s) {
      rows.push({
        status: 'ONLY_IN_FILE',
        licensePlate: f.licensePlate,
        date: f.date,
        fileLiters: f.hasLiters ? f.liters : null,
        systemLiters: null,
        fileAmount: f.hasAmount ? f.amount : null,
        systemAmount: null,
        tripCodes: [],
        fileRows: f.fileRows,
        note: 'File NCC có dòng này nhưng hệ thống không có chuyến nào khớp',
      });
      continue;
    }
    const litersDiff = f.hasLiters && s.hasLiters ? Math.abs(f.liters - s.liters) : 0;
    const amountDiff = f.hasAmount && s.hasAmount ? Math.abs(f.amount - s.amount) : 0;
    let status: FuelReconcileStatus = 'MATCHED';
    let note = 'Khớp xe/ngày/số lít';
    if (litersDiff > LITERS_TOLERANCE) {
      status = 'LITERS_MISMATCH';
      note = `Lệch ${formatLitres(f.liters - s.liters)} lít so với hệ thống`;
    } else if (amountDiff > AMOUNT_TOLERANCE) {
      status = 'AMOUNT_MISMATCH';
      note = `Khớp số lít nhưng lệch ${Math.round(f.amount - s.amount).toLocaleString('vi-VN')} đ`;
    } else if (!f.hasAmount) {
      note = 'Khớp xe/ngày/số lít (file NCC không ghi số tiền — T.Tiền = 0)';
    }
    rows.push({
      status,
      licensePlate: f.licensePlate,
      date: f.date,
      fileLiters: f.hasLiters ? f.liters : null,
      systemLiters: s.hasLiters ? s.liters : null,
      fileAmount: f.hasAmount ? f.amount : null,
      systemAmount: s.hasAmount ? s.amount : null,
      tripCodes: s.tripCodes,
      fileRows: f.fileRows,
      note,
    });
  }
  for (const [key, s] of system) {
    if (file.has(key)) continue;
    rows.push({
      status: 'ONLY_IN_SYSTEM',
      licensePlate: s.licensePlate,
      date: s.date,
      fileLiters: null,
      systemLiters: s.hasLiters ? s.liters : null,
      fileAmount: null,
      systemAmount: s.hasAmount ? s.amount : null,
      tripCodes: s.tripCodes,
      fileRows: [],
      note: 'Hệ thống có chuyến nhưng file NCC không có dòng khớp',
    });
  }

  const order: Record<FuelReconcileStatus, number> = {
    LITERS_MISMATCH: 0, AMOUNT_MISMATCH: 1, ONLY_IN_FILE: 2, ONLY_IN_SYSTEM: 3, UNREADABLE_DATE: 4, MATCHED: 5,
  };
  rows.sort((a, b) => order[a.status] - order[b.status]
    || (a.date ?? '').localeCompare(b.date ?? '')
    || a.licensePlate.localeCompare(b.licensePlate));
  unreadable.sort((a, b) => (a.fileRows[0] ?? 0) - (b.fileRows[0] ?? 0));

  const all = [...rows, ...unreadable];
  return {
    rows: all,
    summary: {
      fileRows: fileRows.length,
      systemRows: systemRows.length,
      matched: rows.filter((r) => r.status === 'MATCHED').length,
      litersMismatch: rows.filter((r) => r.status === 'LITERS_MISMATCH').length,
      amountMismatch: rows.filter((r) => r.status === 'AMOUNT_MISMATCH').length,
      onlyInFile: rows.filter((r) => r.status === 'ONLY_IN_FILE').length,
      onlyInSystem: rows.filter((r) => r.status === 'ONLY_IN_SYSTEM').length,
      unreadable: unreadable.length,
      fileTotalLiters: Math.round(fileTotalLiters * 100) / 100,
      systemTotalLiters: Math.round(systemTotalLiters * 100) / 100,
      fileTotalAmount: Math.round(fileTotalAmount),
      systemTotalAmount: Math.round(systemTotalAmount),
    },
  };
}

function formatLitres(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('vi-VN')}`;
}
