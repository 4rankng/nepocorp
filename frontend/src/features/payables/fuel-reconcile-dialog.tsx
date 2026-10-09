import { useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Scale, Upload } from 'lucide-react';
import type { FuelReconcileResponse, FuelReconcileResultRow, FuelReconcileStatus } from '@tingting/shared';
import { Modal } from '../../components/UI';
import { api, formatErrorMessage } from '../../lib/api';
import './fuel-reconcile-dialog.css';

/**
 * NCC fuel-file reconciliation (kanban 081026215250a).
 *
 * The supplier's sheet has no agreed column layout — the real one is sheet
 * "NEPO", 376 rows × 132 columns, organised by vehicle and oil type, with every
 * "T.Tiền" cell reading 0.0. Instead of freezing a format up front, the operator
 * points at the vehicle / date / liters columns on their own file; the backend
 * then matches by (vehicle, day) on total liters.
 */

type FieldKey = 'plate' | 'date' | 'liters' | 'amount';

const FIELD_LABEL: Record<FieldKey, string> = {
  plate: 'Biển số xe',
  date: 'Ngày lấy dầu',
  liters: 'Số lít',
  amount: 'Số tiền (tuỳ chọn)',
};

/** Header spellings seen in supplier sheets, folded to a field. */
const HEADER_ALIASES: Record<string, FieldKey> = {
  'bienso': 'plate', 'biensoxe': 'plate', 'soxe': 'plate', 'soxevan': 'plate', 'xe': 'plate', 'xevan': 'plate',
  'bienkiemsoat': 'plate', 'dauxekeodaukeo': 'plate', 'plate': 'plate', 'licenseplate': 'plate', 'truck': 'plate',
  'ngay': 'date', 'ngaylaydau': 'date', 'ngaychuyen': 'date', 'ngayhoadon': 'date',
  'date': 'date', 'ngaycapnhat': 'date',
  'solit': 'liters', 'lit': 'liters', 'liters': 'liters', 'soluong': 'liters', 'litter': 'liters',
  'ttien': 'amount', 'sotien': 'amount', 'thanhtien': 'amount', 'amount': 'amount', 'tongtien': 'amount',
};

const STATUS_META: Record<FuelReconcileStatus, { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted' }> = {
  MATCHED: { label: 'Khớp', tone: 'ok' },
  LITERS_MISMATCH: { label: 'Lệch số lít', tone: 'bad' },
  AMOUNT_MISMATCH: { label: 'Lệch số tiền', tone: 'warn' },
  ONLY_IN_FILE: { label: 'Chỉ có ở file NCC', tone: 'warn' },
  ONLY_IN_SYSTEM: { label: 'Chỉ có ở hệ thống', tone: 'warn' },
  UNREADABLE_DATE: { label: 'Không đọc được ngày', tone: 'muted' },
};

const normalizeHeader = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const rich = value as { richText?: Array<{ text: string }>; text?: string; result?: unknown };
    if (Array.isArray(rich.richText)) return rich.richText.map((r) => r.text).join('');
    if (rich.text != null) return String(rich.text);
    if (rich.result != null) return String(rich.result);
    return '';
  }
  return String(value);
}

/** Read the first worksheet into a string matrix. */
async function readMatrix(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const head = new TextDecoder('utf-8').decode(buffer.slice(0, 512)).toLowerCase();

  // Plenty of accounting exports are an HTML table wearing an .xls extension.
  if (head.includes('<table') || head.includes('<html')) {
    const doc = new DOMParser().parseFromString(new TextDecoder('utf-8').decode(buffer), 'text/html');
    return [...doc.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('th,td')].map((td) => (td.textContent ?? '').trim()));
  }
  if (head.startsWith('<?xml') || head.includes('<workbook')) {
    const doc = new DOMParser().parseFromString(new TextDecoder('utf-8').decode(buffer), 'text/xml');
    const rows = [...doc.getElementsByTagName('Row')];
    return rows.map((row) => [...row.getElementsByTagName('Cell')].map((c) => {
      const data = c.getElementsByTagName('Data')[0];
      return (data?.textContent ?? '').trim();
    }));
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
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

/** First row that looks like a header: it names at least one field we can use. */
function detectHeaderRow(matrix: string[][]): number {
  const limit = Math.min(matrix.length, 20);
  for (let r = 0; r < limit; r++) {
    const found = (matrix[r] ?? []).filter((cell) => HEADER_ALIASES[normalizeHeader(cell ?? '')]);
    if (found.length >= 2) return r;
  }
  return 0;
}

function autoMap(header: string[]): Record<FieldKey, number | null> {
  const map: Record<FieldKey, number | null> = { plate: null, date: null, liters: null, amount: null };
  header.forEach((cell, col) => {
    const key = HEADER_ALIASES[normalizeHeader(cell ?? '')];
    if (key && map[key] === null) map[key] = col;
  });
  return map;
}

const columnLetter = (index: number) => {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

export function FuelReconcileDialog({
  isOpen,
  onClose,
  supplierId,
  dateFrom,
  dateTo,
  periodLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  supplierId: number;
  dateFrom: string | null;
  dateTo: string | null;
  periodLabel: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [matrix, setMatrix] = useState<string[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [map, setMap] = useState<Record<FieldKey, number | null>>({ plate: null, date: null, liters: null, amount: null });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FuelReconcileResponse | null>(null);

  const reset = () => {
    setFileName(''); setMatrix([]); setHeaderRow(0);
    setMap({ plate: null, date: null, liters: null, amount: null });
    setError(''); setResult(null); setRunning(false);
  };

  const headerCells = useMemo(() => matrix[headerRow] ?? [], [matrix, headerRow]);
  const columnChoices = useMemo(
    () => headerCells.map((cell, col) => ({ col, label: `${columnLetter(col)} — ${cell || '(trống)'}` })),
    [headerCells],
  );

  /** A "Tổng"/"Cộng" line carries no vehicle — it is the sheet's own total, not a fuel line. */
  const isTotalsRow = (plateCell: string) => /^\s*(tổng|cộng|tổng cộng|total)\b/i.test(plateCell);

  const dataRows = useMemo(() => {
    const out: Array<{ sourceRow: number; cells: string[] }> = [];
    for (let r = headerRow + 1; r < matrix.length; r++) {
      const cells = matrix[r] ?? [];
      if (cells.every((c) => !c)) continue;
      out.push({ sourceRow: r + 1, cells });
    }
    return out;
  }, [matrix, headerRow]);

  const mappedRows = useMemo(() => dataRows
    .filter(({ cells }) => !(map.plate !== null && isTotalsRow(cells[map.plate] ?? '')))
    .map(({ sourceRow, cells }) => ({
      licensePlate: map.plate === null ? '' : (cells[map.plate] ?? ''),
      date: map.date === null ? '' : (cells[map.date] ?? ''),
      liters: map.liters === null ? null : (cells[map.liters] ?? ''),
      amount: map.amount === null ? null : (cells[map.amount] ?? ''),
      sourceRow,
    }))
    .filter((r) => r.licensePlate || r.date || r.liters), [dataRows, map]);

  const skippedTotals = dataRows.length - mappedRows.length;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    setError('');
    setFileName(file.name);
    try {
      const parsed = await readMatrix(file);
      if (parsed.length === 0) {
        setMatrix([]);
        setError('Không đọc được bảng nào trong tệp. Nếu là .xls (Excel 97-2003), mở bằng Excel rồi Lưu thành .xlsx.');
        return;
      }
      const hdr = detectHeaderRow(parsed);
      setMatrix(parsed);
      setHeaderRow(hdr);
      setMap(autoMap(parsed[hdr] ?? []));
    } catch {
      setMatrix([]);
      setError('Không đọc được tệp này. Hỗ trợ .xlsx, .csv và .xls dạng bảng HTML; .xls nhị phân (Excel 97-2003) cần Lưu thành .xlsx trước.');
    }
  };

  const canRun = map.plate !== null && map.date !== null && mappedRows.length > 0 && !running;

  const handleRun = async () => {
    if (!canRun) return;
    setRunning(true);
    setError('');
    try {
      const res = await api.post<FuelReconcileResponse>('/finance/fuel-reconcile', {
        supplierId, dateFrom: dateFrom ?? undefined, dateTo: dateTo ?? undefined, rows: mappedRows,
      });
      setResult(res);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  const toneClass = (tone: 'ok' | 'warn' | 'bad' | 'muted') =>
    `frd-tone frd-tone--${tone}`;
  const money = (n: number | null) => (n === null ? '—' : `${Math.round(n).toLocaleString('vi-VN')} đ`);
  const litres = (n: number | null) => (n === null ? '—' : n.toLocaleString('vi-VN'));

  const summary = result?.summary;

  return (
    <Modal
      isOpen={isOpen}
      title="Đối chiếu file NCC"
      onClose={() => { reset(); onClose(); }}
      maxWidth={980}
      footer={
        <div className="frd-actions">
          <button type="button" className="btn btn--secondary" onClick={() => { reset(); onClose(); }}>Đóng</button>
          <button type="button" className="btn btn--primary" disabled={!canRun} onClick={() => void handleRun()}>
            {running ? <Loader2 size={15} className="frd-spin" /> : <Scale size={15} />}
            {running ? 'Đang đối chiếu…' : `Đối chiếu ${mappedRows.length} dòng`}
          </button>
        </div>
      }
    >
      <p className="frd-hint">
        Nạp bảng kê của hãng dầu rồi chỉ ra cột <strong>Biển số</strong>, <strong>Ngày lấy dầu</strong> và
        <strong> Số lít</strong> trên chính tệp đó — không cần đúng một định dạng cố định. Hệ thống đối chiếu
        theo <strong>xe + ngày</strong> trên tổng số lít, kỳ <strong>{periodLabel}</strong>.
      </p>

      <div className="frd-file">
        <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
          <FileSpreadsheet size={15} /> Chọn tệp
        </button>
        <span className="frd-file__name">{fileName || 'Chưa chọn tệp (.xlsx, .csv, .xls bảng HTML)'}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {error && <p className="frd-error" role="alert">{error}</p>}

      {matrix.length > 0 && (
        <div className="frd-map">
          <label className="frd-map__row">
            <span>Dòng tiêu đề</span>
            <select
              value={headerRow}
              onChange={(e) => {
                const next = Number(e.target.value);
                setHeaderRow(next);
                setMap(autoMap(matrix[next] ?? []));
              }}
            >
              {matrix.slice(0, Math.min(matrix.length, 20)).map((cells, r) => (
                <option key={r} value={r}>
                  Dòng {r + 1}: {cells.slice(0, 4).map((c) => c || '∅').join(' | ').slice(0, 70)}
                </option>
              ))}
            </select>
          </label>
          <div className="frd-map__cols">
            {(Object.keys(FIELD_LABEL) as FieldKey[]).map((key) => (
              <label key={key} className="frd-map__col">
                <span>{FIELD_LABEL[key]}</span>
                <select
                  value={map[key] === null ? '' : String(map[key])}
                  onChange={(e) => setMap((prev) => ({ ...prev, [key]: e.target.value === '' ? null : Number(e.target.value) }))}
                >
                  <option value="">— không dùng —</option>
                  {columnChoices.map((c) => <option key={c.col} value={c.col}>{c.label}</option>)}
                </select>
              </label>
            ))}
          </div>
          <p className="frd-map__count">
            {mappedRows.length > 0
              ? <>Đọc được <strong>{mappedRows.length}</strong> dòng dữ liệu từ {dataRows.length} dòng có nội dung.{skippedTotals > 0 ? ` Bỏ qua ${skippedTotals} dòng tổng ("Tổng"/"Cộng").` : ''}</>
              : 'Chưa đọc được dòng dữ liệu nào — chọn lại dòng tiêu đề hoặc cột.'}
          </p>
        </div>
      )}

      {summary && (
        <div className="frd-summary">
          <div className="frd-chip frd-tone--ok"><CheckCircle2 size={14} /> Khớp {summary.matched}</div>
          <div className="frd-chip frd-tone--bad"><AlertTriangle size={14} /> Lệch lít {summary.litersMismatch}</div>
          <div className="frd-chip frd-tone--warn">Lệch tiền {summary.amountMismatch}</div>
          <div className="frd-chip frd-tone--warn">Chỉ có ở file {summary.onlyInFile}</div>
          <div className="frd-chip frd-tone--warn">Chỉ có ở hệ thống {summary.onlyInSystem}</div>
          {summary.unreadable > 0 && <div className="frd-chip frd-tone--muted">Không đọc được ngày {summary.unreadable}</div>}
          <div className="frd-chip frd-tone--muted">
            Tổng lít: file {litres(summary.fileTotalLiters)} · hệ thống {litres(summary.systemTotalLiters)}
          </div>
        </div>
      )}

      {result && (
        <div className="frd-table-wrap">
          <table className="frd-table">
            <thead>
              <tr>
                <th>Trạng thái</th><th>Biển số</th><th>Ngày</th>
                <th className="frd-num">Lít (file)</th><th className="frd-num">Lít (hệ thống)</th>
                <th className="frd-num">Tiền (file)</th><th className="frd-num">Tiền (hệ thống)</th>
                <th>Chuyến</th><th>Dòng</th><th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row: FuelReconcileResultRow, i) => (
                <tr key={`${row.status}-${row.licensePlate}-${row.date}-${i}`}>
                  <td><span className={toneClass(STATUS_META[row.status].tone)}>{STATUS_META[row.status].label}</span></td>
                  <td>{row.licensePlate || '—'}</td>
                  <td>{row.date || '—'}</td>
                  <td className="frd-num">{litres(row.fileLiters)}</td>
                  <td className="frd-num">{litres(row.systemLiters)}</td>
                  <td className="frd-num">{money(row.fileAmount)}</td>
                  <td className="frd-num">{money(row.systemAmount)}</td>
                  <td>{row.tripCodes.join(', ') || '—'}</td>
                  <td>{row.fileRows.join(', ') || '—'}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.rows.length === 0 && (
        <p className="frd-hint">Không có dòng nào để đối chiếu trong kỳ này.</p>
      )}

      {!result && matrix.length === 0 && (
        <p className="frd-hint frd-hint--muted">
          <Upload size={13} /> Bảng kê của hãng dầu thường có một dòng tiêu đề; nếu tệp mở ra không thấy cột
          Biển số / Ngày / Số lít, chọn lại <strong>Dòng tiêu đề</strong> cho tới khi đúng.
        </p>
      )}
    </Modal>
  );
}
