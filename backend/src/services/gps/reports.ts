import { portalPost, isPortalConfigured } from './portalClient';
import { portalProvider } from './providers/portalProvider';
import { normalizePlate } from './parse';

/**
 * Bách Khoa report service — typed access to every web-portal report endpoint.
 * All reports share one call pattern (POST form `{ carId, dateF, timeF, dateT,
 * timeT, ... }` → HTML table); this module turns each into structured data.
 *
 * `carId` is the portal CarID (NOT the DeviceId). Resolve it from a plate via
 * `resolveCarId()`, which reads it from the live get_AllTIBase payload.
 */

export interface ReportRange {
  /** YYYY-MM-DD inclusive */
  dateFrom: string;
  /** YYYY-MM-DD inclusive (defaults to dateFrom) */
  dateTo?: string;
}

// ─── HTML table parsing ──────────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Extract <tr><td>…</td></tr> rows into cell-text arrays. */
function parseTable(html: string): string[][] {
  const rows: string[][] = [];
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      decodeEntities(m[1].replace(/<[^>]+>/g, '').trim()),
    );
    if (cells.some((c) => c !== '')) rows.push(cells);
  }
  return rows;
}

/** "HH:mm:ss - dd/MM/yyyy" | "HH:mm dd/MM/yyyy" | "HH:mm:ss -- dd/MM/yyyy" → Date (UTC+7). */
function parsePortalDateTime(raw: string): Date | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2}):(\d{2}):?(\d{2})?\s*[-—\s]+\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, hh, mm, ss, dd, mo, yyyy] = m;
  const utcMs = Date.UTC(+yyyy, +mo - 1, +dd, +hh, +mm, +(ss ?? 0)) - 7 * 60 * 60 * 1000;
  const d = new Date(utcMs);
  return isNaN(d.getTime()) ? null : d;
}

/** "HH:mm:ss" | "01:42:10" → seconds. Also handles "MMm" style loosely. */
function durationToSec(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
}

/** Parse a number. NOTE: the portal outputs decimals with a '.' (e.g. "327.97"
 *  km, "106.72185" coords), so '.' is treated as the decimal separator. */
function toNum(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const cleaned = raw.toString().trim().replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function dateToPortal(iso: string): string {
  // YYYY-MM-DD → dd/MM/yyyy
  const [, y, m, d] = iso.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? [];
  if (!y) return iso;
  return `${d}/${m}/${y}`;
}

async function fetchReport(
  carId: number,
  path: string,
  range: ReportRange,
  opts: { extra?: Record<string, string>; omitTimes?: boolean; referer?: string } = {},
): Promise<string> {
  const dateFrom = dateToPortal(range.dateFrom);
  const dateTo = dateToPortal(range.dateTo ?? range.dateFrom);
  const fields: Record<string, string> = opts.omitTimes
    ? { carId: String(carId), dateF: dateFrom, dateE: dateTo }
    : { carId: String(carId), dateF: dateFrom, timeF: '00:00', dateT: dateTo, timeT: '23:59', timeS: '0', ...(opts.extra ?? {}) };
  const body = new URLSearchParams(fields).toString();
  const { status, text } = await portalPost(path, body, { referer: opts.referer ?? 'Home/Index' });
  if (status !== 200) throw new Error(`${path} → HTTP ${status}`);
  return text;
}

/** Keep only data rows — drop header rows ("#", "STT", "Biển số", …) and totals. */
function dataRows(rows: string[][]): string[][] {
  return rows.filter((r) => {
    const c0 = (r[0] ?? '').trim();
    if (!c0 || /^tổng/i.test(c0)) return false;
    return !/^(#|stt|biển\s*số|ngày|thời điểm|báo cáo)/i.test(c0);
  });
}

// ─── carId resolution ────────────────────────────────────────────────────────

/**
 * Resolve a vehicle's portal CarID from its plate (read from live data).
 * Returns null if not configured / not found.
 */
export async function resolveCarId(plate: string): Promise<number | null> {
  if (!(await isPortalConfigured())) return null;
  const vehicles = await portalProvider.fetchVehicles();
  const norm = normalizePlate(plate);
  const v = vehicles.find((x) => normalizePlate(x.numberPlate) === norm);
  return v?.carId ?? null;
}

// ─── Report result types + methods ───────────────────────────────────────────

export interface StopEvent { startTime: string | null; endTime: string | null; durationSec: number | null; address: string | null; lat: number | null; lng: number | null; }
export interface StopDetailReport { stops: StopEvent[]; totals: { stopSec: number | null; moveSec: number | null; activeSec: number | null; }; }

/** Detail stop report — each stop with start/end/duration/address + totals. = "how long stopped". */
export async function getStopDetail(carId: number, range: ReportRange): Promise<StopDetailReport> {
  const html = await fetchReport(carId, '/ReportDN/_ResultReportsDetailStop', range, { referer: 'ReportDN/DetailStop' });
  const rows = parseTable(html);
  // columns: #, Biển số, Bắt đầu, Kết thúc, Thời gian dừng, Địa điểm, Kinh độ,Vĩ độ, Lộ trình
  const joinedAll = rows.map((r) => r.join(' ')).join(' | ');
  const findDur = (label: string): number | null => {
    const m = joinedAll.match(new RegExp(`${label}[^:]*:\\s*(\\d{1,2}:\\d{2}:\\d{2})`, 'i'));
    return m ? durationToSec(m[1]) : null;
  };
  const totals = {
    stopSec: findDur('thời gian dừng'),
    moveSec: findDur('thời gian di chuyển'),
    activeSec: findDur('thời gian hoạt động'),
  };
  const stops: StopEvent[] = dataRows(rows)
    .filter((r) => /\d/.test(r[0] ?? '') && r.length >= 6)
    .map((r) => {
      const ll = (r[6] ?? '').split(',');
      return {
        startTime: toIso(parsePortalDateTime(r[2] ?? '')),
        endTime: toIso(parsePortalDateTime(r[3] ?? '')),
        durationSec: durationToSec(r[4]),
        address: r[5] ?? null,
        lat: toNum(ll[0]?.trim()),
        lng: toNum(ll[1]?.trim()),
      };
    });
  return { stops, totals };
}

export interface TripSegment { startTime: string | null; endTime: string | null; durationSec: number | null; distanceKm: number | null; fromAddress: string | null; toAddress: string | null; driver: string | null; }
/** Trip segments — each drive leg between stops with distance/duration/from-to. */
export async function getTripSegments(carId: number, range: ReportRange): Promise<TripSegment[]> {
  const html = await fetchReport(carId, '/ReportDN/_ResultReportsGetTrip', range, { referer: 'ReportDN/GetTrip' });
  const rows = dataRows(parseTable(html));
  // #, Biển số, Lái xe, Bắt đầu, Kết thúc, Thời gian, Quãng đường, Địa điểm bắt đầu, Địa điểm kết thúc
  return rows
    .filter((r) => /\d/.test(r[0] ?? '') && r.length >= 8)
    .map((r) => ({
      startTime: toIso(parsePortalDateTime(r[3] ?? '')),
      endTime: toIso(parsePortalDateTime(r[4] ?? '')),
      durationSec: durationToSec(r[5]),
      distanceKm: toNum(r[6]),
      fromAddress: r[7] ?? null,
      toAddress: r[8] ?? null,
      driver: r[2] || null,
    }));
}

export interface JourneyPoint { time: string | null; lat: number | null; lng: number | null; address: string | null; }
/** Full 10s breadcrumb trail (can be large — ~one row per 10s). */
export async function getJourney(carId: number, range: ReportRange, maxPoints = 5000): Promise<JourneyPoint[]> {
  const html = await fetchReport(carId, '/ReportBGTVT/_ResultReportsDetailJourney', range, { referer: 'ReportBGTVT/ReportsDetailJourney' });
  const rows = dataRows(parseTable(html));
  // STT, Biển số, Thời điểm, Tọa độ (lat,lng), Địa điểm, Ghi chú
  const points = rows
    .filter((r) => r.length >= 3)
    .map((r) => {
      // Cells aren't at fixed indices (empty Biển số/Ghi chú cells are omitted),
      // so locate by pattern.
      const timeCell = r.find((c) => /\d{1,2}:\d{2}:\d{2}/.test(c)) ?? '';
      const coordCell = r.find((c) => /^\d+\.\d+\s*,\s*\d+\.\d+/.test(c.trim())) ?? '';
      const ll = coordCell.split(',');
      const coordIdx = r.indexOf(coordCell);
      const address = coordIdx >= 0 && coordIdx + 1 < r.length ? r[coordIdx + 1] : null;
      return {
        time: toIso(parsePortalDateTime(timeCell)),
        lat: toNum(ll[0]?.trim()),
        lng: toNum(ll[1]?.trim()),
        address,
      };
    })
    .filter((p) => p.lat !== null && p.lng !== null);
  return points.slice(0, maxPoints);
}

/** Full breadcrumb trail across a multi-day range (day-paginated, deduped,
 *  time-sorted). `getJourney` is single-day; this concatenates days so long
 *  trips aren't truncated by the per-call cap. */
export async function getJourneyRange(carId: number, fromDay: string, toDay: string, maxPoints = 50000): Promise<JourneyPoint[]> {
  const seen = new Set<string>();
  const all: JourneyPoint[] = [];
  for (let t = new Date(fromDay + 'T00:00:00Z').getTime(); t <= new Date(toDay + 'T00:00:00Z').getTime(); t += 86400000) {
    const day = new Date(t).toISOString().slice(0, 10);
    for (const p of await getJourney(carId, { dateFrom: day, dateTo: day }, maxPoints)) {
      const k = `${p.time}|${p.lat}|${p.lng}`;
      if (!seen.has(k)) { seen.add(k); all.push(p); }
    }
  }
  all.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  return all;
}
