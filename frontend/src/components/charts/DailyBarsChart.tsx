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

  const grossPath = gross
    .map((v, i) => (i ? 'L' : 'M') + lineX(i).toFixed(1) + ' ' + Y(v).toFixed(1))
    .join(' ');

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

        {/* Daily revenue bars */}
        {revenue.map((v, i) => {
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
              opacity={activeIdx === null || activeIdx === i ? 0.85 : 0.35}
            />
          );
        })}

        {/* Gross profit line (drawn over the bars) */}
        <path d={grossPath} fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover crosshair + dots */}
        {activeIdx !== null && (
          <>
            <line x1={ax} y1={mT} x2={ax} y2={mT + pH} stroke="#005A2D" strokeWidth="1" strokeDasharray="3 4" opacity={0.45} />
            <circle cx={ax} cy={ayGp} r="3.5" fill="#fff" stroke="#2563EB" strokeWidth="2" />
            <circle cx={ax} cy={ay} r="4" fill="#fff" stroke="#005A2D" strokeWidth="2.6" />
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
            aria-label={`Ngày ${d}: doanh thu (chưa VAT) ${fmtTip(revenue[i] || 0)}, lợi nhuận gộp ${fmtTip(gross[i] || 0)}`}
          />
        ))}
      </svg>

      {/* HTML tooltip overlay — same conventions as RevenueTrendChart */}
      {activeIdx !== null && (
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
            Ngày {labels[activeIdx]}
          </div>
          <div style={{ height: 1, background: '#EEF1EF', margin: '0 -14px 8px -14px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: '12px', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: '#56655C', whiteSpace: 'nowrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#005A2D' }} />
              Doanh thu (chưa VAT)
            </div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12.5px', fontWeight: 700, color: '#005A2D', whiteSpace: 'nowrap' }}>
              {fmtTip(revenue[activeIdx] || 0)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', color: '#56655C', whiteSpace: 'nowrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />
              LN gộp
            </div>
            <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12.5px', fontWeight: 700, color: '#2563EB', whiteSpace: 'nowrap' }}>
              {fmtTip(gross[activeIdx] || 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
