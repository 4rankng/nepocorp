import { useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { TireImportRow, TireImportResult } from '@tingting/shared';
import { Modal } from '../../components/UI';
import { formatErrorMessage } from '../../lib/api';
import './tire-import-dialog.css';

/**
 * Bulk tire import (kanban 081026215220).
 *
 * Staff back-filling the fleet's existing tires had to submit the add form once
 * per tire. This reads a parsed .xlsx/.csv sheet into rows and hands them to the
 * `/fleet/tires/import` endpoint, which reports per-row outcomes — a sheet with
 * one bad row still keeps the good ones.
 *
 * The plate column is the operator-facing field (nobody types surrogate ids), so
 * the sheet names a biển số and the backend resolves it against both catalogs.
 */

/** Accent-insensitive header key so "Biển số" and "bien so" both match. */
function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .trim()
    .toLowerCase();
}

/** Maps a sheet header to a TireImportRow field. */
const HEADER_ALIASES: Record<string, keyof TireImportRow> = {
  serial: 'serial',
  'so serial': 'serial',
  'so lo': 'serial',
  'serial lop': 'serial',
  size: 'size',
  'co lop': 'size',
  'kich co': 'size',
  position: 'position',
  'vi tri': 'position',
  plate: 'plate',
  'bien so': 'plate',
  'bien so xe': 'plate',
  xe: 'plate',
  'dau keo': 'plate',
  'ro moc': 'plate',
  installedat: 'installedAt',
  'ngay lap': 'installedAt',
  purchasedat: 'purchasedAt',
  'ngay mua': 'purchasedAt',
};

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    // Rich text / formula / hyperlink cell shapes.
    const rich = value as { richText?: Array<{ text: string }>; text?: string; result?: unknown; hyperlink?: string };
    if (Array.isArray(rich.richText)) return rich.richText.map((r) => r.text).join('');
    if (rich.text != null) return String(rich.text);
    if (rich.result != null) return String(rich.result);
    if (rich.hyperlink != null) return String(rich.hyperlink);
    return '';
  }
  return String(value);
}

/** Minimal RFC-4180-ish CSV split (handles quoted fields + embedded commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Read the first worksheet into a string matrix. */
async function readMatrix(file: File): Promise<string[][]> {
  if (/\.csv$/i.test(file.name)) {
    return parseCsv(await file.text());
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const matrix: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cellText(cell.value).trim();
    });
    matrix.push(cells);
  });
  return matrix;
}

/** Map a raw matrix to TireImportRow objects using the header row. */
function toRows(matrix: string[][]): TireImportRow[] {
  const headerIndex: Partial<Record<keyof TireImportRow, number>> = {};
  let headerRowNumber = -1;
  for (let r = 0; r < matrix.length; r++) {
    const cells = matrix[r] ?? [];
    const found: Array<{ col: number; key: keyof TireImportRow }> = [];
    cells.forEach((text, col) => {
      const key = HEADER_ALIASES[normalizeHeader(text)];
      if (key) found.push({ col, key });
    });
    if (found.length > 0) {
      headerRowNumber = r;
      for (const f of found) headerIndex[f.key] = f.col;
      break;
    }
  }
  if (headerRowNumber < 0 || headerIndex.serial === undefined) return [];

  const rows: TireImportRow[] = [];
  for (let r = headerRowNumber + 1; r < matrix.length; r++) {
    const cells = matrix[r] ?? [];
    const pick = (key: keyof TireImportRow): string | null => {
      const col = headerIndex[key];
      if (col === undefined) return null;
      const text = (cells[col] ?? '').trim();
      return text || null;
    };
    const serial = pick('serial');
    if (!serial) continue; // Skip blank rows; a blank serial inside a filled row is reported by the API.
    rows.push({
      serial,
      plate: pick('plate'),
      size: pick('size'),
      position: pick('position'),
      installedAt: pick('installedAt'),
      purchasedAt: pick('purchasedAt'),
    });
  }
  return rows;
}

const STATUS_LABEL: Record<TireImportResult['results'][number]['status'], string> = {
  created: 'Đã nhập',
  skipped: 'Bỏ qua',
  error: 'Lỗi',
};

export function TireImportDialog({
  isOpen,
  importing,
  onClose,
  onImport,
}: {
  isOpen: boolean;
  importing: boolean;
  onClose: () => void;
  onImport: (rows: TireImportRow[]) => Promise<TireImportResult>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<TireImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState<TireImportResult | null>(null);

  const reset = () => {
    setRows([]);
    setFileName('');
    setParseError('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParseError('');
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = toRows(await readMatrix(file));
      if (parsed.length === 0) {
        setRows([]);
        setParseError('Không đọc được dòng lốp nào. Cần cột "Serial" và các cột tuỳ chọn: Biển số, Cỡ, Vị trí, Ngày lắp, Ngày mua.');
        return;
      }
      setRows(parsed);
    } catch (err) {
      setRows([]);
      setParseError(formatErrorMessage(err));
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    try {
      const res = await onImport(rows);
      setResult(res);
    } catch (err) {
      setParseError(formatErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Nhập lốp hàng loạt"
      onClose={() => { reset(); onClose(); }}
      maxWidth={640}
      footer={
        <div className="tip-actions">
          <button type="button" className="btn btn--secondary" onClick={() => { reset(); onClose(); }}>
            Đóng
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={rows.length === 0 || importing}
            onClick={() => void handleImport()}
          >
            {importing ? <Loader2 size={15} className="tip-spin" /> : <Upload size={15} />}
            {importing ? 'Đang nhập…' : `Nhập ${rows.length} dòng`}
          </button>
        </div>
      }
    >
      <p className="tip-hint">
        Tệp Excel/CSV cần một dòng tiêu đề với cột <strong>Serial</strong> (bắt buộc) và các cột
        tuỳ chọn: <strong>Biển số</strong> (đầu kéo hoặc rơ-moóc — để trống nghĩa là lốp dự phòng),
        <strong> Cỡ</strong>, <strong>Vị trí</strong>, <strong>Ngày lắp</strong>, <strong>Ngày mua</strong>.
        Dòng trùng serial sẽ bị bỏ qua, các dòng hợp lệ vẫn được nhập.
      </p>

      <div className="tip-file">
        <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
          <FileSpreadsheet size={15} />
          Chọn tệp
        </button>
        <span className="tip-file__name">{fileName || 'Chưa chọn tệp'}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.csv"
          style={{ display: 'none' }}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {parseError && <p className="tip-error" role="alert">{parseError}</p>}

      {rows.length > 0 && !result && (
        <div className="tip-preview">
          <p className="tip-preview__count">Đọc được <strong>{rows.length}</strong> dòng. Xem trước 5 dòng đầu:</p>
          <table className="tip-table">
            <thead>
              <tr><th>Serial</th><th>Biển số</th><th>Cỡ</th><th>Vị trí</th><th>Ngày lắp</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={i}>
                  <td>{r.serial}</td>
                  <td>{r.plate ?? '—'}</td>
                  <td>{r.size ?? '—'}</td>
                  <td>{r.position ?? '—'}</td>
                  <td>{r.installedAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && (
        <div className="tip-result">
          <p className="tip-result__summary">
            Tổng <strong>{result.total}</strong> dòng · Đã nhập <strong className="tip-ok">{result.created}</strong>
            {' · '}Bỏ qua <strong className="tip-skip">{result.skipped}</strong>
            {' · '}Lỗi <strong className="tip-err">{result.errors}</strong>
          </p>
          {result.results.some((r) => r.status !== 'created') && (
            <div className="tip-result__scroll">
              <table className="tip-table">
                <thead>
                  <tr><th>Dòng</th><th>Serial</th><th>Kết quả</th><th>Ghi chú</th></tr>
                </thead>
                <tbody>
                  {result.results.filter((r) => r.status !== 'created').map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.serial || '—'}</td>
                      <td>{STATUS_LABEL[r.status]}</td>
                      <td>{r.message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
