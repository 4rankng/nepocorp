import { useState, useRef, useEffect, useId } from 'react';
import { formatCurrency } from '../../lib/format';

/**
 * Daily revenue bars + gross-profit line for the dashboard hero card.
 *
 * NEPO-15 (consult verdict, deepseek 24/10): the old default plotted a
 * cumulative running sum for the still-open month — on day 23/31 it always
 * reads "steadily climbing" and hides the daily rhythm and outliers. This
 * view plots each day's revenue as a bar with the gross-profit line over it;
 * the cumulative view stays available via the card's "Cộng dồn" toggle.
 *
 * Pattern + interaction conventions mirror RevenueTrendChart: inline SVG,
 * invisible per-day hit areas, crosshair, HTML overlay tooltip.
 *
 * NEPO-26 (consult verdict, deepseek 25/10): series pair is solid #005A2D
 * bars + #C2780B gross line on a white casing (the blue #2563EB fought the
 * green and sits ~1.6:1 over the bars; #C2780B alone is ~2.4:1 over emerald,
 * so the casing is what carries WCAG non-text contrast). Days without
 * displayable figures are gaps — no zero bar, line broken — never a plotted
 * 0 that reads as a crash, including days whose trips are still unbilled
 * (CREATED/IN_TRANSIT). Tooltip adds gross-margin % and
 * the day-over-day revenue delta; a dashed month-average reference and a
 * "Hôm nay" marker orient the scan.
 */

export interface DailyBarsChartProps {
  /** Day-of-month labels (e.g. ['1', '2', … '31']) */
  labels: string[];
  /** Revenue values per day — plotted in millions */
  revenue: number[];
  /** Gross profit values per day — plotted in millions */
  gross: number[];
  /** Formatter for y-axis labels; receives values in millions */
  formatY?: (v: number) => string;
  /** Formatter for tooltip values; receives values in millions */
  formatTooltip?: (v: number) => string;
  /** Max grid steps above zero — gridlines = maxTicks + 1 including 0.
   *  Default 4 (the historical ¼ ladder); the dashboard hero passes 3 for
   *  the consultant's 3–4-tick y-axis (NEPO-25). */
  maxTicks?: number;
  /** Parallel to `revenue` — false where the day has no displayable figures
   *  (bar skipped, line broken, tooltip says "Không có số liệu"). Undefined
   *  = every day has data. */
  hasData?: boolean[];
  /** Index of today in the series — draws the "Hôm nay" marker. */
  todayIdx?: number;
  /** Custom SVG dimensions — defaults to Dashboard standard 760×280 */
  width?: number;
  height?: number;
}

export function DailyBarsChart({
  labels,
  revenue,
  gross,
  formatY,
  formatTooltip,
  maxTicks,
  hasData,
  todayIdx,
  width: initialW = 760,
  height: initialH = 280,
}: DailyBarsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: initialW, height: initialH });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setDimensions({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = dimensions.width;
  const H = dimensions.height;
  const chartTitleId = useId();
  const chartDescriptionId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const activeIdx = hoverIdx;

  const mL = W < 420 ? Math.min(116, Math.max(104, W * 0.34)) : 116;
  const mR = 18, mT = 14, mB = 30;
  const pW = W - mL - mR, pH = H - mT - mB;

  // Auto-scale y-axis against the taller of the two series. The step ladder
  // keeps tick values round; maxTicks caps the grid steps above zero (the
  // NEPO-25 hero passes 3 → 4 gridlines incl. 0).
  const peak = Math.max(...revenue, ...gross, 1);
  const span = Math.max(1, maxTicks ?? 4);
  const niceSteps = [1, 2, 3, 5, 10, 15, 25, 30, 50, 75, 100, 150, 250, 300, 500, 750, 1000];
  const step = niceSteps.find(s => s * span >= peak) ?? 1000;
  const yMax = Math.ceil(peak / step) * step || step;

  const n = revenue.length;
  // One slot per day; bars never fill the whole slot nor exceed a readable width.
  const slot = n > 0 ? pW / n : pW;
  const barW = Math.max(2, Math.min(20, slot * 0.58));
  const barX = (i: number) => mL + slot * i + (slot - barW) / 2;
  const lineX = (i: number) => mL + slot * i + slot / 2;
  const Y = (v: number) => mT + pH * (1 - v / yMax);

  const dayHasData = (i: number) => !hasData || hasData[i] !== false;

  // Gross line broken into segments — a day with no trips is a gap, not a
  // plotted 0 (NEPO-26): the old continuous path dove to the axis and read
  // as a crash (day 22).
  const grossPaths: string[] = [];
  let seg: string[] = [];
  let prevIdx = -2;
  for (let i = 0; i < gross.length; i++) {
    if (!dayHasData(i)) continue;
    if (seg.length > 0 && i - prevIdx > 1) {
      if (seg.length > 1) grossPaths.push(seg.join(' '));
      seg = [];
    }
    seg.push((seg.length ? 'L' : 'M') + lineX(i).toFixed(1) + ' ' + Y(gross[i]).toFixed(1));
    prevIdx = i;
  }
  if (seg.length > 1) grossPaths.push(seg.join(' '));

  // Month-average reference over the days that have data — the same "TB/ngày"
  // figure the card header shows, so bars get a baseline to be read against.
  const dataIdxs = revenue.map((_, i) => i).filter(dayHasData);
  const monthAvg = dataIdxs.length > 0
    ? dataIdxs.reduce((sum, i) => sum + (revenue[i] || 0), 0) / dataIdxs.length
    : 0;
  const lastDataIdx = dataIdxs.length > 0 ? dataIdxs[dataIdxs.length - 1] : -1;

  const gridValues = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  const ax = activeIdx !== null ? lineX(activeIdx) : 0;
  const ay = activeIdx !== null ? Y(revenue[activeIdx] || 0) : 0;
  const ayGp = activeIdx !== null ? Y(gross[activeIdx] || 0) : 0;

  const fmtY = formatY ?? ((v: number) => formatCurrency(Math.round(v * 1_000_000)));
  const fmtTip = formatTooltip ?? ((v: number) => formatCurrency(Math.round(v * 1_000_000)));
  const chartTitle = 'Doanh thu theo ngày và lợi nhuận gộp';
  const lastIndex = Math.max(0, Math.min(labels.length, revenue.length, gross.length) - 1);
  const chartDescription = labels.length > 0
    ? `${labels.length} ngày. Ngày ${labels[lastIndex]}: doanh thu (chưa VAT) ${fmtTip(revenue[lastIndex] || 0)}, lợi nhuận gộp ${fmtTip(gross[lastIndex] || 0)}.`
    : 'Chưa có dữ liệu theo ngày.';
  const tooltipWidth = Math.min(250, Math.max(0, W - 16));
  const tooltipLeft = Math.min(
    Math.max(ax, tooltipWidth / 2 + 8),
    W - tooltipWidth / 2 - 8,
  );
  // 31 day labels at ~900px width collide; thin them out, keep every 5th + last.
  const labelStep = n <= 16 ? 1 : n <= 24 ? 2 : 5;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg
        role="img"
        aria-labelledby={`${chartTitleId} ${chartDescriptionId}`}
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', flex: 1 }}
      >
        <title id={chartTitleId}>{chartTitle}</title>
        <desc id={chartDescriptionId}>{chartDescription}</desc>

        {/* Y-axis grid lines + labels */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line x1={mL} y1={Y(v)} x2={W - mR} y2={Y(v)} stroke="#EEF1EF" strokeWidth="1" />
            <text x={mL - 10} y={Y(v) + 3.5} textAnchor="end" fontFamily="JetBrains Mono, monospace" fill="#56655C">
              <tspan fontSize={W < 420 ? '9' : '10'}>{fmtY(v)}</tspan>
            </text>
          </g>
        ))}

        {/* X-axis day labels (thinned on long months) */}
        {labels.map((d, i) => (
          (i % labelStep === 0 || i === n - 1) ? (
            <text key={i} x={lineX(i)} y={H - 10} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11"
                  fill={i === activeIdx ? '#005A2D' : '#8A988F'}
                  fontWeight={i === activeIdx ? '700' : '400'}>
              {d}
            </text>
          ) : null
        ))}

        {/* Daily revenue bars — solid emerald (opacity .85 dulled the fill
            against white, consult NEPO-26); no-data days draw no bar. */}
        {revenue.map((v, i) => {
          if (!dayHasData(i)) return null;
          const y = Y(v);
          const h = Math.max(0, Y(0) - y);
          return (
            <rect
              key={i}
              className="wf-day-bar"
              x={barX(i)}
              y={y}
              width={barW}
              height={h}
              rx={Math.min(3, barW / 2)}
              fill="#005A2D"
              opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
            />
          );
        })}

        {/* Month-average reference — dashed, matches the header TB/ngày KPI */}
        {monthAvg > 0 && (
          <g>
            <line x1={mL} y1={Y(monthAvg)} x2={W - mR} y2={Y(monthAvg)} stroke="#8A988F" strokeWidth="1" strokeDasharray="2 4" opacity={0.7} />
            <text x={W - mR} y={Y(monthAvg) - 4} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#8A988F">TB/ngày</text>
          </g>
        )}

        {/* Today marker — orients the scan without stealing ink from the data */}
        {todayIdx != null && todayIdx >= 0 && todayIdx < n && (
          <g>
            <line x1={lineX(todayIdx)} y1={mT} x2={lineX(todayIdx)} y2={mT + pH} stroke="#56655C" strokeWidth="1" strokeDasharray="2 3" opacity={0.5} />
            <text x={lineX(todayIdx)} y={mT + 9} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#56655C">Hôm nay</text>
          </g>
        )}

        {/* Gross profit line — #C2780B over a white casing: the amber alone
            is ~2.4:1 over emerald bars, the casing carries the contrast
            (consult NEPO-26). Blue #2563EB fought the green. */}
        {grossPaths.map((d, i) => (
          <path key={`casing-${i}`} d={d} fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        ))}
        {grossPaths.map((d, i) => (
          <path key={`gp-${i}`} d={d} fill="none" stroke="#C2780B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* Direct end-of-line label — legend becomes reinforcement, not the
            only key (consult NEPO-26) */}
        {lastDataIdx >= 0 && (
          <text x={lineX(lastDataIdx)} y={Y(gross[lastDataIdx] || 0) - 9} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700" fill="#C2780B">LN gộp</text>
        )}

        {/* Hover crosshair + dots — dots only where the day has figures;
            a gap day would otherwise plot the GP dot below the axis */}
        {activeIdx !== null && (
          <>
            <line x1={ax} y1={mT} x2={ax} y2={mT + pH} stroke="#005A2D" strokeWidth="1" strokeDasharray="3 4" opacity={0.45} />
            {dayHasData(activeIdx) && (
              <>
                <circle cx={ax} cy={ayGp} r="3.5" fill="#fff" stroke="#C2780B" strokeWidth="2" />
                <circle cx={ax} cy={ay} r="4" fill="#fff" stroke="#005A2D" strokeWidth="2.6" />
              </>
            )}
          </>
        )}

        {/* Invisible hit areas — one per day slot */}
        {labels.map((d, i) => (
          <rect
            key={i}
            x={mL + slot * i}
            y={mT}
            width={slot}
            height={pH}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHoverIdx(i)}
            onPointerDown={() => setHoverIdx(i)}
            onFocus={() => setHoverIdx(i)}
            onBlur={() => setHoverIdx(null)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setHoverIdx(i);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Ngày ${d}${dayHasData(i) ? `: doanh thu (chưa VAT) ${fmtTip(revenue[i] || 0)}, lợi nhuận gộp ${fmtTip(gross[i] || 0)}` : ': không có số liệu'}`}
          />
        ))}
      </svg>

      {/* HTML tooltip overlay — same conventions as RevenueTrendChart */}
      {activeIdx !== null && (() => {
        const hasDay = dayHasData(activeIdx);
        const dayRev = revenue[activeIdx] || 0;
        const dayGross = gross[activeIdx] || 0;
        const marginPct = dayRev > 0 ? (dayGross / dayRev) * 100 : null;
        let prevIdx: number | null = null;
        for (let i = activeIdx - 1; i >= 0; i--) {
          if (dayHasData(i)) { prevIdx = i; break; }
        }
        const prevRev = prevIdx != null ? (revenue[prevIdx] || 0) : null;
        const dayDelta = prevRev != null && prevRev > 0 && dayRev > 0
          ? ((dayRev - prevRev) / prevRev) * 100
          : null;
        return (
        <div
          data-testid="daily-bars-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltipLeft}px`,
            top: `${(Math.min(ay, ayGp) / H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 12px))',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #E2E8E5',
            padding: '10px 14px',
            pointerEvents: 'none',
            width: `${tooltipWidth}px`,
            maxWidth: 'calc(100% - 16px)',
            boxSizing: 'border-box',
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 600, color: '#56655C', marginBottom: '8px' }}>
            Ngày {labels[activeIdx]}{activeIdx === todayIdx ? ' · Hôm nay' : ''}
          </div>
          <div style={{ height: 1, background: '#EEF1EF', margin: '0 -14px 8px -14px' }} />
          {!hasDay ? (
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: '#8A988F', textAlign: 'center', padding: '2px 0' }}>
              Không có số liệu
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: '#56655C', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#005A2D' }} />
                  Doanh thu (chưa VAT)
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12.5px', fontWeight: 700, color: '#005A2D', whiteSpace: 'nowrap' }}>
                  {fmtTip(dayRev)}
                  {dayDelta != null && (
                    <span style={{ fontSize: '10.5px', fontWeight: 500, color: dayDelta >= 0 ? '#0B8745' : '#C7372F', marginLeft: 6 }}>
                      {dayDelta >= 0 ? '▲' : '▼'} {Math.abs(dayDelta).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: '#56655C', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C2780B' }} />
                  LN gộp
                </div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12.5px', fontWeight: 700, color: '#C2780B', whiteSpace: 'nowrap' }}>
                  {fmtTip(dayGross)}
                </div>
              </div>
              {marginPct != null && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: '12px', alignItems: 'center' }}>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: '#8A988F', whiteSpace: 'nowrap' }}>
                    Biên LN gộp
                  </div>
                  <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', fontWeight: 600, color: '#56655C', whiteSpace: 'nowrap' }}>
                    {marginPct.toFixed(1)}%
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        );
      })()}
    </div>
  );
}
