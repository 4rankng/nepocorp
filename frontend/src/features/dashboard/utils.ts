import { formatCompact } from '../../lib/format';

export const CATEGORY_COLORS: Record<string, string> = {
  'Sửa chữa': '#8B5CF6',
  'Phụ tùng': '#F59E0B',
  'Vật tư': '#6366F1',
  'Bảo hiểm': '#06B6D4',
  'Đăng kiểm': '#10B981',
  'Phí đường bộ': '#EC4899',
};
export const FALLBACK_COLORS = ['#8B5CF6', '#F59E0B', '#06B6D4', '#10B981', '#EC4899', '#6366F1'];

export const styles = {
  thinBar: { height: 4 },
} as const;

export function splitKpi(v: number): { num: string; suffix: string } {
  const s = formatCompact(v);
  if (s.endsWith('k')) return { num: s.slice(0, -1), suffix: 'k' };
  const i = s.lastIndexOf(' ');
  if (i === -1) return { num: s, suffix: '' };
  return { num: s.slice(0, i), suffix: s.slice(i + 1) };
}

export function fmtMoM(current: number, previous: number | undefined | null): string {
  if (previous == null) return '—';
  if (previous === 0) return current > 0 ? 'Mới' : '0%';
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export interface DailySeriesPoint {
  /** Day of month — the chart's x-axis category. */
  day: number;
  /** Raw VND, not yet scaled to millions. */
  revenue: number;
  gross: number;
}

interface DailyTripLike {
  departureDate?: string | null;
  status?: string;
  revenue?: unknown;
  grossProfit?: unknown;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily chart series, one point per calendar day.
 *
 * The x-axis has to be unbroken: a day without trips is a real point (zero),
 * not a hole. Deriving the series from the trips that exist dropped those days
 * and the axis jumped 1…9, 11 — day 10 never rendered (kanban 101026101500).
 * The window is trimmed to the first and last day that has data, the same rule
 * the monthly view uses, so empty days at the edges stay out of the chart.
 */
export function buildDailySeries(trips: readonly DailyTripLike[]): DailySeriesPoint[] {
  const perDay = new Map<string, { revenue: number; gross: number }>();
  for (const trip of trips) {
    if (trip.status === 'CANCELED') continue;
    const dateKey = trip.departureDate?.slice(0, 10);
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    const point = perDay.get(dateKey) ?? { revenue: 0, gross: 0 };
    point.revenue += Number(trip.revenue) || 0;
    point.gross += Number(trip.grossProfit) || 0;
    perDay.set(dateKey, point);
  }

  const dataDays = [...perDay.entries()]
    .filter(([, point]) => point.revenue > 0 || point.gross > 0)
    .map(([dateKey]) => dateKey)
    .sort();
  if (dataDays.length === 0) return [];

  // Step in UTC: Date.parse('YYYY-MM-DD') is UTC midnight, so a fixed
  // 24h step lands on every day in between exactly once.
  const first = Date.parse(dataDays[0]);
  const last = Date.parse(dataDays[dataDays.length - 1]);
  const series: DailySeriesPoint[] = [];
  for (let time = first; time <= last; time += DAY_MS) {
    const dateKey = new Date(time).toISOString().slice(0, 10);
    const point = perDay.get(dateKey);
    series.push({
      day: Number(dateKey.slice(8, 10)),
      revenue: point?.revenue ?? 0,
      gross: point?.gross ?? 0,
    });
  }
  return series;
}

export interface PieSlice {
  label: string;
  value: number;
  color: string;
  pct: number;
}

export function buildPieSlices(
  slices: Array<{ label: string; value: number; color: string }>,
): { slicesWithPct: PieSlice[]; conicGradient: string; totalPie: number } {
  const visibleSlices = slices.filter(sl => sl.value > 0.5);
  const totalPie = visibleSlices.reduce((s, sl) => s + sl.value, 0) || 1;
  const p = (v: number) => Math.round((v / totalPie) * 100);
  let usedPct = 0;
  const slicesWithPct = visibleSlices.map((sl, i) => {
    const pct = i === visibleSlices.length - 1 ? Math.max(0, 100 - usedPct) : p(sl.value);
    usedPct += pct;
    return { ...sl, pct };
  });
  let cumPct = 0;
  const gradientStops = slicesWithPct.map(sl => {
    const start = cumPct;
    cumPct += sl.pct;
    return `${sl.color} ${start}% ${cumPct}%`;
  });
  const conicGradient = `conic-gradient(${gradientStops.join(', ')})`;
  return { slicesWithPct, conicGradient, totalPie };
}
