import { useState, useRef, useEffect, useId } from 'react';

/**
 * Daily AI OCR requests for the current month — the chart inside the
 * "OCR — Chụp ảnh cont/seal" dashboard tile.
 *
 * Design decisions (owner spec + webchat consult 28/10 + house conventions):
 *
 * - BARS, not a cumulative area. The owner needs to spot daily bursts (a port
 *   backlog, a broken camera rig on one shift); a cumulative curve flattens
 *   exactly that signal. The monthly allowance is NOT drawn as a line across
 *   the daily axis — a 10.000 cap on a 0–600 daily scale would flatten every
 *   bar. The cap lives in the 3px micro-meter above the chart instead.
 * - ZERO DAYS ARE MEASURED ZEROS, not gaps. The revenue hero chart gaps days
 *   with no billable data, but OCR is a 24/7 internal service: a day without
 *   scans is a real 0. The calendar cadence stays continuous (1 → last day of
 *   the month) and the day still occupies its slot.
 * - DAYS THAT HAVE NOT HAPPENED YET draw a faint empty tick, not a zero bar —
 *   "not measured yet" is a different state from "measured zero".
 * - HOVER is a crosshair + tooltip, same conventions as DailyBarsChart /
 *   RevenueTrendChart: inline SVG, invisible per-day hit areas, HTML overlay
 *   tooltip, keyboard-reachable day cells.
 *
 * The bars are read-only. There is no per-day OCR log page in the product, so
 * a click target would be a dead promise — the tooltip carries the detail.
 */

export interface OcrUsageChartDay {
  /** 'YYYY-MM-DD' */
  date: string;
  count: number;
}

export interface OcrUsageChartProps {
  /** Measured days, in date order (zero-filled, stops at today). */
  daily: OcrUsageChartDay[];
  /** The period the series belongs to ('YYYY-MM'). */
  period: string;
  /** Days elapsed in the month — the last measured day. */
  elapsedDays: number;
  /** Total days in the month — the future days are drawn as empty ticks. */
  daysInMonth: number;
  /** Requests per elapsed day — the tooltip's comparison baseline. */
  dailyAverage: number;
  /** Height of the chart canvas in px. */
  height?: number;
}

const GRID = '#EEF1EF';
const MUTED = '#8A988F';
const SUBTLE = '#56655C';
const BAR = '#005A2D';
const BAR_DIM = 'rgba(0, 90, 45, 0.28)';
const FUTURE = '#DDE3E0';

export function OcrUsageChart({
  daily,
  period,
  elapsedDays,
  daysInMonth,
  dailyAverage,
  height: initialH = 160,
}: OcrUsageChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setWidth(rect.width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = width || 560;
  const H = initialH;
  const chartTitleId = useId();
  const chartDescriptionId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const mL = 30, mR = 6, mT = 10, mB = 20;
  const pW = Math.max(1, W - mL - mR);
  const pH = Math.max(1, H - mT - mB);

  const n = Math.max(1, daysInMonth);
  const slot = pW / n;
  const barW = Math.max(2, Math.min(10, slot * 0.55));
  const barX = (i: number) => mL + slot * i + (slot - barW) / 2;

  const counts = daily.map((d) => d.count);
  const total = counts.reduce((sum, n) => sum + n, 0);
  const peak = Math.max(...counts, 0);
  const hasData = peak > 0;
  // An empty month gets a flat 0 baseline — a 0–1 axis would be noise.
  const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 150, 200, 250, 300, 500, 750, 1000];
  const step = hasData ? (niceSteps.find((s) => s * 3 >= peak) ?? 1000) : 1;
  const yMax = hasData ? Math.ceil(peak / step) * step || step : 0;
  const Y = (v: number) => (yMax > 0 ? mT + pH * (1 - v / yMax) : mT + pH);
  const gridValues = hasData
    ? Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step)
    : [0];

  /** day index (0-based) → measured count, or null when the day is in the future. */
  const countAt = (i: number): number | null => {
    if (i >= elapsedDays) return null;
    return daily[i]?.count ?? 0;
  };

  const dayLabel = (i: number) => String(i + 1).padStart(2, '0');
  const activeIdx = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < n ? hoverIdx : null;
  const activeCount = activeIdx !== null ? countAt(activeIdx) : null;

  // "Ngày 18/10/2026" from the period + the day index — the daily array only
  // holds the measured days, so a future day's date has to be built here.
  const isoDate = (i: number) => `${period}-${dayLabel(i)}`;
  const formatLongDate = (i: number) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate(i));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : dayLabel(i);
  };

  const chartTitle = 'Số request OCR theo ngày';
  const chartDescription = hasData
    ? `Trong tháng, ${daily.length} ngày đã ghi nhận, tổng ${total} lượt.`
    : 'Chưa có request OCR nào trong tháng.';
  const tooltipWidth = Math.min(210, Math.max(0, W - 16));
  const tooltipLeft = activeIdx !== null
    ? Math.min(Math.max(mL + slot * activeIdx + slot / 2, tooltipWidth / 2 + 8), W - tooltipWidth / 2 - 8)
    : 0;

  // Day labels thin out on long months (31 labels never fit a 560px chart).
  const labelStep = n <= 16 ? 1 : n <= 24 ? 2 : 5;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: `${H}px` }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg
        role="img"
        aria-labelledby={`${chartTitleId} ${chartDescriptionId}`}
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}
      >
        <title id={chartTitleId}>{chartTitle}</title>
        <desc id={chartDescriptionId}>{chartDescription}</desc>

        {/* Horizontal grid + y labels */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line x1={mL} y1={Y(v)} x2={W - mR} y2={Y(v)} stroke={GRID} strokeWidth="1" />
            <text x={mL - 6} y={Y(v) + 3} textAnchor="end" fill={MUTED} fontSize="9.5">
              {v}
            </text>
          </g>
        ))}

        {/* Bars — measured days only. A measured zero is a 1px muted baseline
            mark (it happened, it was zero); a future day is a fainter tick. */}
        {Array.from({ length: n }, (_, i) => {
          const count = countAt(i);
          const isFuture = count === null;
          const isActive = activeIdx === i;
          if (isFuture) {
            return (
              <line
                key={`future-${i}`}
                x1={barX(i) + barW / 2}
                y1={Y(0) - 1}
                x2={barX(i) + barW / 2}
                y2={Y(0)}
                stroke={FUTURE}
                strokeWidth="1.5"
              />
            );
          }
          if (count === 0) {
            return (
              <rect
                key={`zero-${i}`}
                x={barX(i)}
                y={Y(0) - 1}
                width={barW}
                height={1}
                fill={isActive ? BAR : '#C3CCC8'}
              />
            );
          }
          const y = Y(count);
          return (
            <rect
              key={`bar-${i}`}
              x={barX(i)}
              y={y}
              width={barW}
              height={Math.max(1, Y(0) - y)}
              rx={Math.min(2, barW / 2)}
              fill={isActive ? BAR : (activeIdx === null ? BAR : BAR_DIM)}
            />
          );
        })}

        {/* "Hôm nay" marker — orients the scan without stealing ink */}
        {elapsedDays > 0 && elapsedDays <= n && (
          <line
            x1={mL + slot * (elapsedDays - 1) + slot / 2}
            y1={mT - 2}
            x2={mL + slot * (elapsedDays - 1) + slot / 2}
            y2={Y(0)}
            stroke={SUBTLE}
            strokeWidth="1"
            strokeDasharray="2 3"
            opacity={0.55}
          />
        )}

        {/* X-axis day numbers */}
        {Array.from({ length: n }, (_, i) => (
          (i % labelStep === 0 || i === n - 1) ? (
            <text
              key={`x-${i}`}
              x={mL + slot * i + slot / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize="9.5"
              fill={activeIdx === i ? BAR : MUTED}
              fontWeight={activeIdx === i ? '700' : '400'}
            >
              {dayLabel(i)}
            </text>
          ) : null
        ))}

        {/* No requests yet this month — say so instead of drawing an axis
            around nothing. The day cadence stays visible underneath. */}
        {!hasData && (
          <text
            x={mL + pW / 2}
            y={mT + pH / 2}
            textAnchor="middle"
            fontSize="11"
            fill={MUTED}
          >
            Chưa có request OCR nào trong tháng
          </text>
        )}

        {/* Hover crosshair */}
        {activeIdx !== null && (
          <line
            x1={mL + slot * activeIdx + slot / 2}
            y1={mT}
            x2={mL + slot * activeIdx + slot / 2}
            y2={Y(0)}
            stroke={BAR}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity={0.4}
          />
        )}

        {/* Invisible hit areas — one per day slot */}
        {Array.from({ length: n }, (_, i) => {
          const count = countAt(i);
          const future = count === null;
          return (
            <rect
              key={`hit-${i}`}
              x={mL + slot * i}
              y={mT}
              width={slot}
              height={pH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onPointerDown={() => setHoverIdx(i)}
              onFocus={() => setHoverIdx(i)}
              onBlur={() => setHoverIdx(null)}
              tabIndex={0}
              role="button"
              aria-label={
                future
                  ? `Ngày ${dayLabel(i)}: chưa tới`
                  : `Ngày ${dayLabel(i)}: ${count} lượt OCR${count > 0 && dailyAverage > 0 ? `, ${Math.round((count / dailyAverage) * 100)}% so với trung bình ngày` : ''}`
              }
            />
          );
        })}
      </svg>

      {/* HTML tooltip overlay — same conventions as DailyBarsChart */}
      {activeIdx !== null && (
        <div
          data-testid="ocr-usage-chart-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltipLeft}px`,
            top: `${(activeIdx !== null && activeCount !== null && activeCount > 0 ? Y(activeCount) / H : 0.5) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 10px))',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #E2E8E5',
            padding: '8px 12px',
            pointerEvents: 'none',
            width: `${tooltipWidth}px`,
            maxWidth: 'calc(100% - 16px)',
            boxSizing: 'border-box',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '11px', color: MUTED, marginBottom: '4px' }}>
            Ngày {formatLongDate(activeIdx)}
            {activeIdx === elapsedDays - 1 ? ' · hôm nay' : ''}
          </div>
          {activeCount === null ? (
            <div style={{ fontSize: '12px', color: MUTED }}>Chưa tới ngày này</div>
          ) : activeCount === 0 ? (
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: SUBTLE }}>
              0 lượt (không phát sinh)
            </div>
          ) : (
            <>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#14261D' }}>
                {activeCount} lượt chụp
              </div>
              {dailyAverage > 0 && (
                <div style={{ fontSize: '11px', color: SUBTLE, marginTop: '2px' }}>
                  {Math.round((activeCount / dailyAverage) * 100)}% so với TB ngày
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
