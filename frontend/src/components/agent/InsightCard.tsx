// InsightCard — renders a structured agent answer (title + cause summary +
// typed widgets + action chips). Widgets are dependency-free: KPI grid reuses
// the shared money/number formatters; bar chart is CSS flex; line chart is a
// tiny inline SVG; tables/callouts/anomaly lists are plain markup. (Recharts
// is not a dependency in this repo and "Simplicity First" says keep it that
// way — these widgets cover every card the LLM emits.)
import { formatCurrency } from '../../lib/format';
import type {
  AgentActionChip,
  AgentDirective,
  AgentResponse,
  AgentWidget,
} from '@tingting/shared';

function formatValue(value: number, format: 'vnd' | 'percent' | 'number' | 'days'): string {
  switch (format) {
    case 'vnd':
      return formatCurrency(value);
    case 'percent':
      return `${value.toLocaleString('vi-VN')}%`;
    case 'days':
      return `${value.toLocaleString('vi-VN')} ngày`;
    case 'number':
    default:
      return value.toLocaleString('vi-VN');
  }
}

function KpiGrid({ items }: Extract<AgentWidget, { type: 'kpi_grid' }>) {
  return (
    <div className="agent-kpi-grid">
      {items.map((it, i) => (
        <div className="agent-kpi" key={i}>
          <div className="agent-kpi__label">{it.label}</div>
          <div className="agent-kpi__value">{formatValue(it.value, it.format)}</div>
          {it.delta !== undefined && (
            <div className={`agent-kpi__delta ${it.delta < 0 ? 'is-down' : 'is-up'}`}>
              {it.delta < 0 ? '▼' : '▲'} {formatValue(Math.abs(it.delta), it.format)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BarChart({ data, format }: Extract<AgentWidget, { type: 'bar_chart' }>) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <div className="agent-bar-list">
      {data.map((d, i) => (
        <div className="agent-bar-row" key={i}>
          <span className="agent-bar-row__name">{d.name}</span>
          <div className="agent-bar-row__track">
            <div
              className="agent-bar-row__fill"
              style={{ width: `${(Math.abs(d.value) / max) * 100}%` }}
            />
          </div>
          <span className="agent-bar-row__value">{format ? formatValue(d.value, format) : d.value.toLocaleString('vi-VN')}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ series }: Extract<AgentWidget, { type: 'line_chart' }>) {
  // Minimal inline SVG — one polyline per series, shared scale.
  const W = 320;
  const H = 120;
  const pad = 6;
  const allPoints = series.flatMap((s) => s.points);
  const xs = allPoints.map((p) => Number(p.x)).filter((n) => !Number.isNaN(n));
  const ys = allPoints.map((p) => p.y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX || 1)) * (W - pad * 2);
  const sy = (y: number) => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - pad * 2);
  return (
    <svg className="agent-line" viewBox={`0 0 ${W} ${H}`} role="img">
      {series.map((s, i) => {
        const pts = s.points
          .map((p) => `${sx(Number(p.x))},${sy(p.y)}`)
          .join(' ');
        return <polyline key={i} points={pts} fill="none" strokeWidth={2} stroke={`var(--series-${i}, var(--accent))`} />;
      })}
    </svg>
  );
}

function DataTable({ columns, rows }: Extract<AgentWidget, { type: 'table' }>) {
  return (
    <div className="agent-table-wrap">
      <table className={`agent-table agent-table--cols-${columns.length}`}>
        <thead>
          <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} data-label={columns[ci] ?? ''}>{String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ variant, text }: Extract<AgentWidget, { type: 'callout' }>) {
  return <div className={`agent-callout agent-callout--${variant}`}>{text}</div>;
}

function AnomalyList({ items }: Extract<AgentWidget, { type: 'anomaly_list' }>) {
  return (
    <ul className="agent-anomaly-list">
      {items.map((it, i) => (
        <li key={i} className={`agent-anomaly agent-anomaly--${it.severity}`}>
          <span className="agent-anomaly__label">{it.label}</span>
          <span className="agent-anomaly__detail">{it.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function renderWidget(w: AgentWidget): React.ReactNode {
  switch (w.type) {
    case 'kpi_grid': return <KpiGrid {...w} />;
    case 'bar_chart': return <BarChart {...w} />;
    case 'line_chart': return <LineChart {...w} />;
    case 'table': return <DataTable {...w} />;
    case 'callout': return <Callout {...w} />;
    case 'anomaly_list': return <AnomalyList {...w} />;
  }
}

export interface InsightCardProps {
  card: Extract<AgentResponse, { type: 'insight_card' }>;
  onAction?: (d: AgentDirective) => void;
}

export function InsightCard({ card, onAction }: InsightCardProps) {
  return (
    <div className="agent-card">
      <div className="agent-card__title">{card.title}</div>
      <div className="agent-card__summary">{card.summary}</div>
      <div className="agent-card__widgets">
        {card.widgets.map((w, i) => (
          <div className="agent-card__widget" key={i}>{renderWidget(w)}</div>
        ))}
      </div>
      {card.actions && card.actions.length > 0 && (
        <div className="agent-card__actions">
          {card.actions.map((a: AgentActionChip, i) => (
            <button
              type="button"
              className="agent-action-chip"
              key={i}
              onClick={() => onAction?.(a.directive)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
