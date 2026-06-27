/**
 * ADMIN-only chatbot performance dashboard ("Giám sát Chatbot").
 *
 * Five sections, all fed by the @tingting/shared chatbot-metrics API (read in
 * via useChatbotMetrics.ts hooks — see those for the 60s staleTime rationale):
 *   1. Health summary — p50 / p95 / p99, error/fallback/abort rates, turns/day
 *   2. Latency breakdown — inline-SVG bars per pipeline stage (LLM/tools/final/ack/persist)
 *   3. Slowest tools — table (calls / p95 / error rate)
 *   4. ReAct efficiency — avg iterations, fallback rate, tool calls/turn, tokens/turn
 *   5. Recent turns — table with role + errorKind mapped to Vietnamese, traceId link
 *
 * SLA bands (green/amber/red) are read from the API's `summary.sla` object —
 * never hardcoded here (the thresholds live in backend config).
 *
 * ADMIN has full access to raw turns by design; non-ADMIN roles never reach
 * this page (the `strictAdminOnly` guard in App.tsx redirects them).
 */
import { useState } from 'react';
import { Panel } from '../components/UI';
import { EmptyState } from '../components/shared';
import { SkeletonKPIs, SkeletonLine, SkeletonTable } from '../components/shared/Skeleton';
import { useAuth } from '../hooks/useAuth';
import {
  useChatbotMetricsSummary,
  useChatbotLatencyBreakdown,
  useChatbotTools,
  useChatbotTimeseries,
  useChatbotRecent,
} from '../hooks/useChatbotMetrics';
import { formatNumber, formatDateTimeVN } from '../lib/format';
import type {
  ChatbotMetricSummary,
  ChatbotLatencyBreakdown,
  ChatbotToolStat,
  ChatbotMetricDay,
  ChatbotRecentTurn,
} from '@tingting/shared';
import './ChatbotMonitoringPage.css';

const BOT_OPS_ILLUSTRATION = '/assets/illustrations/chatbot-monitoring-ops.png';
const BOT_ICON = '/assets/icons/35-assistant-tro-ly-tingting.png';

/* ─── Vietnamese label maps ────────────────────────────────────────────────
 * The raw metrics rows carry enum-ish strings (role, errorKind). Per the
 * no-raw-IDs rule they must never surface as-is. These maps are the single
 * place to translate them; unknown values fall back to a sensible label.
 */
const ERROR_KIND_LABELS: Record<string, string> = {
  timeout: 'Hết giờ',
  http: 'Lỗi máy chủ',
  parse: 'Lỗi phân tích',
  no_key: 'Thiếu key',
  tool: 'Lỗi công cụ',
};
const ROLE_LABELS_VN: Record<string, string> = {
  ADMIN: 'Quản trị',
  MANAGER: 'Giám đốc',
  ACCOUNTANT: 'Kế toán',
  DRIVER: 'Lái xe',
  FORWARDER: 'Giao nhận',
};

function errorKindLabel(kind: string | null): string {
  if (kind == null || kind === '') return 'OK';
  return ERROR_KIND_LABELS[kind] ?? kind;
}
function roleLabel(role: string): string {
  return ROLE_LABELS_VN[role] ?? (role || '—');
}

/* ─── Formatting helpers ─────────────────────────────────────────────────── */

/** Latency in ms → "1.234 ms" with thousands separators. Null → "—". */
function fmtMs(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${formatNumber(Math.round(v))} ms`;
}
/** 0..1 rate → "12,3 %" with one decimal and a Vietnamese decimal comma. */
function fmtRate(v: number | null | undefined): string {
  if (v == null) return '—';
  const pct = v * 100;
  return `${pct.toFixed(1).replace('.', ',')} %`;
}
/** Plain number with thousands separators, "—" for null/undefined. */
function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—';
  return formatNumber(v);
}
/** One-decimal average with thousands separators, "—" for null. */
function fmtAvg(v: number | null | undefined, suffix = ''): string {
  if (v == null) return '—';
  const rounded = Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(1));
  return `${formatNumber(rounded)}${suffix}`;
}
function fmtCompactMs(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}s`;
  return `${Math.round(v)}ms`;
}

/* ─── SLA band colour from the API's thresholds ────────────────────────────
 * p95 < p95GreenMs → healthy (emerald); between green and amber → warning;
 * above amber → critical. Null p95 → neutral.
 */
function p95BandTone(p95Ms: number | null, sla: { p95GreenMs: number; p95AmberMs: number } | undefined):
  | 'green'
  | 'amber'
  | 'red'
  | 'neutral' {
  if (p95Ms == null) return 'neutral';
  if (!sla) return 'neutral';
  if (p95Ms < sla.p95GreenMs) return 'green';
  if (p95Ms <= sla.p95AmberMs) return 'amber';
  return 'red';
}

function healthCopy(summary: ChatbotMetricSummary | undefined):
  { tone: 'green' | 'amber' | 'red' | 'neutral'; label: string; detail: string } {
  if (!summary || summary.turns === 0) {
    return { tone: 'neutral', label: 'Đang chờ dữ liệu', detail: 'Chưa có lượt bot trong khoảng thời gian này.' };
  }
  const p95Tone = p95BandTone(summary.userPerceived.p95Ms, summary.sla);
  if (summary.errorRate >= 0.2 || p95Tone === 'red') {
    return { tone: 'red', label: 'Cần xử lý', detail: 'Độ trễ hoặc lỗi đang vượt ngưỡng vận hành.' };
  }
  if (summary.fallbackRate >= 0.2 || p95Tone === 'amber') {
    return { tone: 'amber', label: 'Cần theo dõi', detail: 'Bot vẫn trả lời được, nhưng đang phải fallback nhiều hoặc p95 sát ngưỡng.' };
  }
  return { tone: 'green', label: 'Ổn định', detail: 'Độ trễ, lỗi và fallback đang trong vùng an toàn.' };
}

function mainBottleneck(breakdown: ChatbotLatencyBreakdown | undefined): { label: string; value: number | null } {
  if (!breakdown) return { label: 'Chưa rõ', value: null };
  const rows = [
    { label: 'LLM', value: breakdown.llmMs },
    { label: 'Công cụ', value: breakdown.toolsMs },
    { label: 'Trả lời cuối', value: breakdown.finalMs },
    { label: 'ACK chờ', value: breakdown.ackMs },
    { label: 'Ghi DB', value: breakdown.persistMs },
  ].filter((r): r is { label: string; value: number } => r.value != null);
  return rows.sort((a, b) => b.value - a.value)[0] ?? { label: 'Chưa rõ', value: null };
}

function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    'ui.navigate': 'Điều hướng trang',
    'ui.search_pages': 'Tìm trang',
    'approvals.queue': 'Hàng chờ duyệt',
    'fleet.catalog': 'Dữ liệu đội xe',
    'customers.list': 'Danh sách khách',
  };
  return labels[name] ?? name;
}

function BotHealthHero({
  summary,
  breakdown,
  range,
  rangeDays,
  loading,
  onRangeChange,
}: {
  summary: ChatbotMetricSummary | undefined;
  breakdown: ChatbotLatencyBreakdown | undefined;
  range: string;
  rangeDays: number;
  loading: boolean;
  onRangeChange: (r: string) => void;
}) {
  const health = healthCopy(summary);
  const turns = summary?.turns ?? 0;
  const bottleneck = mainBottleneck(breakdown);
  const tokensPerTurn = summary && summary.turns > 0 ? (summary.tokensIn + summary.tokensOut) / summary.turns : null;
  const p95Tone = p95BandTone(summary?.userPerceived.p95Ms ?? null, summary?.sla);

  return (
    <section className={`cbm-hero cbm-hero--${health.tone}`}>
      <div className="cbm-hero__copy">
        <div className="cbm-eyebrow">
          <span className={`cbm-live-dot cbm-live-dot--${health.tone}`} />
          Bot ops cockpit
        </div>
        <h1>Giám sát Chatbot</h1>
        <p>
          Theo dõi thời gian từ lúc người dùng gửi tin nhắn đến khi câu trả lời xuất hiện,
          cùng tỷ lệ lỗi, fallback và hành vi điều hướng của bot.
        </p>
        <div className="cbm-hero__actions">
          <RangeToggle range={range} onChange={onRangeChange} />
          <span className="cbm-window-note">{rangeDays} ngày gần nhất</span>
        </div>
      </div>

      <div className="cbm-hero__visual" aria-hidden="true">
        <img src={BOT_OPS_ILLUSTRATION} alt="" />
      </div>

      <div className="cbm-command-card">
        <div className="cbm-command-card__top">
          <img src={BOT_ICON} alt="" />
          <div>
            <span className="cbm-command-card__label">Tình trạng hiện tại</span>
            <strong>{loading ? 'Đang tải' : health.label}</strong>
          </div>
        </div>
        <p>{health.detail}</p>
        <div className="cbm-command-grid">
          <div>
            <span>Lượt ghi nhận</span>
            <strong>{fmtNum(turns)}</strong>
          </div>
          <div>
            <span>Chờ p95</span>
            <strong className={`cbm-tone-${p95Tone}`}>{fmtCompactMs(summary?.userPerceived.p95Ms)}</strong>
          </div>
          <div>
            <span>Nút thắt</span>
            <strong>{bottleneck.label}</strong>
          </div>
          <div>
            <span>Token/lượt</span>
            <strong>{fmtAvg(tokensPerTurn)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function OperationalInsights({
  summary,
  breakdown,
  tools,
}: {
  summary: ChatbotMetricSummary | undefined;
  breakdown: ChatbotLatencyBreakdown | undefined;
  tools: ChatbotToolStat[] | undefined;
}) {
  if (!summary) return null;
  const bottleneck = mainBottleneck(breakdown);
  const topTool = (tools ?? []).slice().sort((a, b) => b.calls - a.calls)[0];
  const toolCalls = tools?.reduce((sum, t) => sum + t.calls, 0) ?? 0;
  const cards = [
    {
      title: 'Ưu tiên tối ưu',
      value: bottleneck.label,
      detail: bottleneck.value == null ? 'Chưa đủ dữ liệu giai đoạn.' : `${fmtMs(bottleneck.value)} trung bình, chiếm phần lớn thời gian phản hồi.`,
    },
    {
      title: 'Hành vi người dùng',
      value: summary.navigateRate > 0.4 ? 'Thiên về mở trang' : 'Thiên về hỏi đáp',
      detail: `${fmtRate(summary.navigateRate)} lượt có điều hướng. Tỷ lệ cao nghĩa là bot đang dẫn người dùng tới đúng màn hình thao tác.`,
    },
    {
      title: 'Công cụ bận nhất',
      value: topTool ? toolLabel(topTool.name) : 'Chưa có',
      detail: topTool ? `${fmtNum(topTool.calls)} / ${fmtNum(toolCalls)} lượt gọi công cụ trong kỳ.` : 'Chưa ghi nhận tool call.',
    },
  ];
  return (
    <section className="cbm-insights" aria-label="Tóm tắt vận hành bot">
      {cards.map((card) => (
        <article className="cbm-insight" key={card.title}>
          <span>{card.title}</span>
          <strong>{card.value}</strong>
          <p>{card.detail}</p>
        </article>
      ))}
    </section>
  );
}

/* ============================================================================
 * Section 1 — Health summary
 * ========================================================================== */

function SummaryKpis({
  summary,
  rangeDays,
  loading,
}: {
  summary: ChatbotMetricSummary | undefined;
  rangeDays: number;
  loading: boolean;
}) {
  if (loading || !summary) {
    return <SkeletonKPIs count={6} />;
  }

  // turnsPerDay divides the range's total turns by the number of days in the
  // selected window. rangeDays comes from the parent (7 or 30) and the hooks
  // refetch on range change, so this stays accurate for either window.
  const turnsPerDay = summary.turns > 0 ? summary.turns / rangeDays : 0;

  const p95Tone = p95BandTone(summary.userPerceived.p95Ms, summary.sla);

  const tokensPerTurn = summary.turns > 0 ? (summary.tokensIn + summary.tokensOut) / summary.turns : 0;
  const reliability = 1 - summary.errorRate;

  const cards: { label: string; value: string; meta: string; tone?: string; hint?: string; progress?: number }[] = [
    {
      label: 'Tốc độ thường gặp',
      value: fmtCompactMs(summary.userPerceived.p50Ms),
      meta: '50% lượt hiện câu trả lời nhanh hơn mốc này.',
      progress: summary.userPerceived.p50Ms && summary.sla ? Math.min(1, summary.userPerceived.p50Ms / summary.sla.p95AmberMs) : 0,
    },
    {
      label: 'Thời gian chờ p95',
      value: fmtCompactMs(summary.userPerceived.p95Ms),
      meta: slaHint(summary.sla),
      tone: p95Tone,
      hint: slaHint(summary.sla),
      progress: summary.userPerceived.p95Ms && summary.sla ? Math.min(1, summary.userPerceived.p95Ms / summary.sla.p95AmberMs) : 0,
    },
    {
      label: 'Độ tin cậy',
      value: fmtRate(reliability),
      meta: `${fmtRate(summary.errorRate)} lượt lỗi trong kỳ.`,
      tone: reliability >= 0.95 ? 'green' : reliability >= 0.8 ? 'amber' : 'red',
      progress: reliability,
    },
    {
      label: 'Fallback',
      value: fmtRate(summary.fallbackRate),
      meta: 'Bot phải sửa dạng trả lời hoặc dùng nhánh dự phòng.',
      tone: summary.fallbackRate >= 0.2 ? 'amber' : 'green',
      progress: summary.fallbackRate,
    },
    {
      label: 'Điều hướng',
      value: fmtRate(summary.navigateRate),
      meta: 'Lượt bot đưa người dùng tới đúng trang hoặc nút.',
      progress: summary.navigateRate,
    },
    {
      label: 'Token mỗi lượt',
      value: fmtAvg(tokensPerTurn),
      meta: `${fmtNum(summary.tokensIn + summary.tokensOut)} token tổng cộng.`,
      progress: Math.min(1, tokensPerTurn / 80_000),
    },
    {
      label: 'Lượt mỗi ngày',
      value: fmtAvg(turnsPerDay),
      meta: `${fmtNum(summary.turns)} lượt trong ${rangeDays} ngày.`,
      progress: Math.min(1, turnsPerDay / 10),
    },
    {
      label: 'Huỷ khi lưu',
      value: fmtRate(summary.abortRate),
      meta: 'Người dùng đóng kết nối trước khi bot lưu xong.',
      hint: 'Số lượt người dùng đóng kết nối trước khi bot lưu xong — không phải lượt nào cũng được ghi nhận.',
      progress: summary.abortRate,
    },
  ];

  return (
    <div className="cbm-kpi-grid">
      {cards.map((c) => (
        <div key={c.label} className={`cbm-kpi${c.tone ? ` cbm-kpi--${c.tone}` : ''}`}>
          <span className="cbm-kpi__label" title={c.hint ?? c.label}>
            {c.label}
          </span>
          <span className="cbm-kpi__value">{c.value}</span>
          <span className="cbm-kpi__meta">{c.meta}</span>
          {typeof c.progress === 'number' && (
            <span className="cbm-kpi__meter" aria-hidden="true">
              <i style={{ width: `${Math.max(3, Math.min(100, c.progress * 100))}%` }} />
            </span>
          )}
          {c.tone && (
            <span className={`cbm-kpi__dot cbm-kpi__dot--${c.tone}`} aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

function slaHint(sla: { p95GreenMs: number; p95AmberMs: number } | undefined): string {
  if (!sla) return '';
  return `SLA: ${sla.p95GreenMs} ms (xanh) · ${sla.p95AmberMs} ms (vàng).`;
}

/* ============================================================================
 * Section 2 — Latency breakdown (inline-SVG bars)
 * ========================================================================== */

function LatencyBreakdownBars({
  breakdown,
  loading,
}: {
  breakdown: ChatbotLatencyBreakdown | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLine key={i} width="100%" />
        ))}
      </div>
    );
  }
  if (!breakdown) return null;

  const stages: { key: keyof ChatbotLatencyBreakdown; label: string }[] = [
    { key: 'llmMs', label: 'LLM' },
    { key: 'toolsMs', label: 'Công cụ' },
    { key: 'finalMs', label: 'Trả lời cuối' },
    { key: 'ackMs', label: 'ACK chờ' },
    { key: 'persistMs', label: 'Ghi DB' },
  ];

  const values = stages.map((s) => breakdown[s.key] ?? 0);
  const max = Math.max(...values, 1);

  return (
    <div className="cbm-bars">
      {stages.map((s) => {
        const v = breakdown[s.key];
        const ratio = v == null ? 0 : Math.max(0.02, (v / max)); // min 2% so a 0/null bar is still visible as a sliver
        const widthPct = v == null ? 0 : ratio * 100;
        return (
          <div className="cbm-bar" key={s.key}>
            <span className="cbm-bar__label">{s.label}</span>
            <svg
              className="cbm-bar__track"
              viewBox="0 0 100 14"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${s.label}: ${v == null ? 'không có dữ liệu' : `${Math.round(v)} ms`}`}
            >
              <rect x="0" y="4" width="100" height="6" rx="3" className="cbm-bar__bg" />
              <rect
                x="0"
                y="4"
                width={widthPct}
                height="6"
                rx="3"
                className={`cbm-bar__fill${v == null ? ' cbm-bar__fill--none' : ''}`}
              />
            </svg>
            <span className="cbm-bar__value">{fmtMs(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * Section 2b — Latency trend + volume (inline-SVG, hand-rolled, no Recharts)
 * ========================================================================== */

function LatencyTrendChart({ days, loading }: { days: ChatbotMetricDay[] | undefined; loading: boolean }) {
  if (loading) {
    return <SkeletonLine width="100%" />;
  }
  const data = days ?? [];
  if (data.length === 0) return null;

  const W = 760;
  const H = 200;
  const mL = 44;
  const mR = 16;
  const mT = 12;
  const mB = 28;
  const pW = W - mL - mR;
  const pH = H - mT - mB;

  const p95Vals = data.map((d) => d.p95Ms ?? 0);
  const avgVals = data.map((d) => d.avgMs ?? 0);
  const peak = Math.max(...p95Vals, ...avgVals, 1);
  // nice round top so the gridlines are readable
  const niceSteps = [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 30000];
  const yMax = niceSteps.find((s) => s >= peak) ?? Math.ceil(peak / 1000) * 1000;

  const X = (i: number) => mL + pW * (i / Math.max(1, data.length - 1));
  const Y = (v: number) => mT + pH * (1 - v / yMax);

  const linePath = (arr: number[]) =>
    arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');

  const gridVals = [0, yMax / 2, yMax];
  const maxTurns = Math.max(...data.map((d) => d.turns), 1);
  const barW = data.length > 1 ? Math.min(18, (pW / data.length) * 0.5) : 18;

  // Short day-of-month label for the x-axis
  const labelFor = (iso: string) => {
    const parts = iso.split('-');
    const day = parts[2];
    return `${day}/${parts[1]}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cbm-trend" role="img" aria-label="Xu hướng độ trễ và số lượt theo ngày">
      {/* gridlines + y labels */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={mL} y1={Y(v)} x2={W - mR} y2={Y(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={mL - 8} y={Y(v) + 3.5} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="var(--ink-3)">
            {Math.round(v)}
          </text>
        </g>
      ))}

      {/* volume bars (turns/day) on a secondary implied scale */}
      {data.map((d, i) => {
        const h = (d.turns / maxTurns) * (pH * 0.45);
        return (
          <rect
            key={`bar-${i}`}
            x={X(i) - barW / 2}
            y={mT + pH - h}
            width={barW}
            height={h}
            rx="2"
            className="cbm-trend__bar"
          />
        );
      })}

      {/* avg line */}
      <path d={linePath(avgVals)} fill="none" stroke="var(--ink-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* p95 line (primary) */}
      <path d={linePath(p95Vals)} fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      {/* x labels */}
      {data.map((d, i) => (
        <text
          key={`x-${i}`}
          x={X(i)}
          y={H - 8}
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
          fontSize="10"
          fill="var(--ink-3)"
        >
          {labelFor(d.date)}
        </text>
      ))}
    </svg>
  );
}

/* ============================================================================
 * Section 3 — Slowest tools table
 * ========================================================================== */

function ToolsTable({ tools, loading }: { tools: ChatbotToolStat[] | undefined; loading: boolean }) {
  if (loading) {
    return <SkeletonTable rows={4} cols={4} />;
  }
  const rows = (tools ?? []).slice().sort((a, b) => {
    // p95 desc, null p95 last (honest "—" until per-call instrumentation lands)
    if (a.p95Ms == null && b.p95Ms == null) return b.calls - a.calls;
    if (a.p95Ms == null) return 1;
    if (b.p95Ms == null) return -1;
    return b.p95Ms - a.p95Ms;
  });

  if (rows.length === 0) {
    return <EmptyState illustration="ops" title="Chưa có dữ liệu công cụ" description="Chưa có lượt gọi công cụ nào trong khoảng thời gian này." />;
  }
  const totalCalls = Math.max(1, rows.reduce((sum, t) => sum + t.calls, 0));

  return (
    <div className="cbm-table-wrap">
      <table className="cbm-table">
        <thead>
          <tr>
            <th>Tên công cụ</th>
            <th>Ý nghĩa</th>
            <th className="cbm-num">Tần suất</th>
            <th className="cbm-num">p95</th>
            <th className="cbm-num">Tỷ lệ lỗi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const share = t.calls / totalCalls;
            return (
              <tr key={t.name}>
                <td className="cbm-cell-name">
                  <strong>{toolLabel(t.name)}</strong>
                  <span>{t.name}</span>
                </td>
                <td>{toolMeaning(t.name)}</td>
                <td className="cbm-num cbm-share-cell">
                  <span>{fmtNum(t.calls)} lượt</span>
                  <span className="cbm-share-meter" aria-hidden="true"><i style={{ width: `${Math.max(5, share * 100)}%` }} /></span>
                </td>
                <td className="cbm-num">{t.p95Ms == null ? '—' : fmtMs(t.p95Ms)}</td>
                <td className="cbm-num">{fmtRate(t.errorRate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function toolMeaning(name: string): string {
  const meanings: Record<string, string> = {
    'ui.navigate': 'Đưa người dùng tới màn hình cần thao tác.',
    'ui.search_pages': 'Tìm route phù hợp khi người dùng nói bằng ngôn ngữ tự nhiên.',
    'approvals.queue': 'Đọc hàng chờ phê duyệt để trả lời câu hỏi vận hành.',
    'fleet.catalog': 'Đọc danh mục xe, rơ-moóc và tài xế.',
    'customers.list': 'Tra cứu khách hàng, công nợ hoặc hồ sơ liên quan.',
  };
  return meanings[name] ?? 'Công cụ dữ liệu nội bộ được bot gọi trong lượt trả lời.';
}

/* ============================================================================
 * Section 4 — ReAct efficiency
 * ========================================================================== */

function ReactEfficiency({
  summary,
  loading,
}: {
  summary: ChatbotMetricSummary | undefined;
  loading: boolean;
}) {
  if (loading || !summary) {
    return <SkeletonKPIs count={4} />;
  }
  const turns = Math.max(1, summary.turns);
  const tokensPerTurn = (summary.tokensIn + summary.tokensOut) / turns;

  const cards: { label: string; value: string }[] = [
    { label: 'Số vòng TB / lượt', value: fmtAvg(summary.avgIterations) },
    { label: 'Tỷ lệ fallback', value: fmtRate(summary.fallbackRate) },
    { label: 'Lượt gọi công cụ / lượt', value: fmtAvg(summary.avgToolCallsPerTurn) },
    { label: 'Token / lượt', value: fmtAvg(tokensPerTurn) },
  ];

  return (
    <div className="cbm-kpi-grid cbm-kpi-grid--tight">
      {cards.map((c) => (
        <div className="cbm-kpi cbm-kpi--flat" key={c.label}>
          <span className="cbm-kpi__label">{c.label}</span>
          <span className="cbm-kpi__value">{c.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * Section 5 — Recent turns table
 * ========================================================================== */

function RecentTurnsTable({
  turns,
  loading,
  sort,
  onSortChange,
}: {
  turns: ChatbotRecentTurn[] | undefined;
  loading: boolean;
  sort: string;
  onSortChange: (s: 'recent' | 'slowest') => void;
}) {
  if (loading) {
    return <SkeletonTable rows={6} cols={6} />;
  }
  const rows = turns ?? [];

  if (rows.length === 0) {
    return <EmptyState illustration="ops" title="Chưa có lượt trò chuyện" description="Chưa ghi nhận lượt bot nào trong khoảng thời gian này." />;
  }

  return (
    <div className="cbm-table-wrap">
      <div className="cbm-table-toolbar">
        <div className="cbm-seg" role="tablist" aria-label="Sắp xếp lượt gần đây">
          <button
            type="button"
            role="tab"
            aria-selected={sort === 'recent'}
            className={`cbm-seg__btn${sort === 'recent' ? ' is-active' : ''}`}
            onClick={() => onSortChange('recent')}
          >
            Gần nhất
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sort === 'slowest'}
            className={`cbm-seg__btn${sort === 'slowest' ? ' is-active' : ''}`}
            onClick={() => onSortChange('slowest')}
          >
            Chậm nhất
          </button>
        </div>
      </div>
      <table className="cbm-table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Người dùng</th>
            <th>Vai trò</th>
            <th className="cbm-num">Thời gian chờ</th>
            <th>Trạng thái</th>
            <th>Mô hình</th>
            <th>Trace</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const hasErr = t.errorKind != null && t.errorKind !== '';
            return (
              <tr key={t.messageId}>
                <td className="cbm-cell-time">{formatDateTimeVN(t.createdAt)}</td>
                <td className="cbm-cell-user">
                  <span className="cbm-cell-user__q" title={t.userContent}>{t.userContent || '—'}</span>
                </td>
                <td>{roleLabel(t.role)}</td>
                <td className="cbm-num">{fmtMs(t.latencyUserPerceivedMs)}</td>
                <td>
                  <span className={`cbm-pill${hasErr ? ' cbm-pill--err' : t.fallbackUsed ? ' cbm-pill--warn' : ' cbm-pill--ok'}`}>
                    {errorKindLabel(t.errorKind)}
                    {t.fallbackUsed && !hasErr ? ' · fallback' : ''}
                  </span>
                </td>
                <td className="cbm-cell-model">{t.model || '—'}</td>
                <td className="cbm-cell-trace">
                  {t.traceId ? (
                    <span className="cbm-trace" title={t.traceId}>{t.traceId}</span>
                  ) : (
                    <span className="cbm-trace cbm-trace--none" title="Không có trace backend">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
 * Range toggle + page shell
 * ========================================================================== */

function RangeToggle({ range, onChange }: { range: string; onChange: (r: string) => void }) {
  return (
    <div className="cbm-seg cbm-seg--range" role="tablist" aria-label="Khoảng thời gian">
      {(['7d', '30d'] as const).map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={range === r}
          className={`cbm-seg__btn${range === r ? ' is-active' : ''}`}
          onClick={() => onChange(r)}
        >
          {r === '7d' ? '7 ngày' : '30 ngày'}
        </button>
      ))}
    </div>
  );
}

export default function ChatbotMonitoringPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<string>('7d');
  const [recentSort, setRecentSort] = useState<'recent' | 'slowest'>('recent');

  // ADMIN sees everything by design — the guard already enforced this. The
  // hooks each take `range` so the whole dashboard refetches together.
  const summaryQ = useChatbotMetricsSummary(range);
  const latencyQ = useChatbotLatencyBreakdown(range);
  const toolsQ = useChatbotTools(range);
  const timeseriesQ = useChatbotTimeseries(range);
  const recentQ = useChatbotRecent({ range, sort: recentSort, limit: 20 });

  const turns = summaryQ.data?.turns ?? 0;
  const isWholeEmpty = !summaryQ.isLoading && turns === 0;
  const rangeDays = range === '30d' ? 30 : 7;

  return (
    <div className="cbm-page">
      <BotHealthHero
        summary={summaryQ.data}
        breakdown={latencyQ.data}
        range={range}
        rangeDays={rangeDays}
        loading={summaryQ.isLoading}
        onRangeChange={setRange}
      />

      {isWholeEmpty ? (
        <div className="cbm-empty-card">
          <img src={BOT_OPS_ILLUSTRATION} alt="" />
          <EmptyState
            illustration="ops"
            title="Chưa có dữ liệu bot"
            description="Trong khoảng thời gian này chưa có lượt trò chuyện nào được ghi nhận."
          />
        </div>
      ) : (
        <>
          <OperationalInsights summary={summaryQ.data} breakdown={latencyQ.data} tools={toolsQ.data} />

          {/* Section 1 — Health summary */}
          <section className="cbm-section">
            <SummaryKpis summary={summaryQ.data} rangeDays={rangeDays} loading={summaryQ.isLoading} />
          </section>

          {/* Section 2 — Latency breakdown + trend */}
          <section className="cbm-section cbm-grid-2">
            <Panel className="cbm-panel cbm-panel--latency" title="Độ trễ nằm ở đâu?" subtitle="Phân rã trung bình mỗi lượt: model, tool, trả lời cuối, ACK và ghi DB.">
              <LatencyBreakdownBars breakdown={latencyQ.data} loading={latencyQ.isLoading} />
            </Panel>
            <Panel className="cbm-panel cbm-panel--trend" title="Nhịp vận hành theo ngày" subtitle="Số lượt, trung bình và p95 để nhìn spike theo thời gian.">
              <div className="cbm-trend-wrap">
                <LatencyTrendChart days={timeseriesQ.data} loading={timeseriesQ.isLoading} />
                <div className="cbm-legend">
                  <span className="cbm-legend__item"><i className="cbm-legend__sw cbm-legend__sw--bar" /> Số lượt</span>
                  <span className="cbm-legend__item"><i className="cbm-legend__sw cbm-legend__sw--avg" /> Trung bình</span>
                  <span className="cbm-legend__item"><i className="cbm-legend__sw cbm-legend__sw--p95" /> p95</span>
                </div>
              </div>
            </Panel>
          </section>

          {/* Section 3 — Slowest tools */}
          <section className="cbm-section">
            <Panel className="cbm-panel" title="Bản đồ công cụ bot đang dùng" subtitle="Tần suất gọi và ý nghĩa vận hành của từng tool. p95 sẽ hiện khi có đo thời gian từng lượt gọi.">
              <ToolsTable tools={toolsQ.data} loading={toolsQ.isLoading} />
            </Panel>
          </section>

          {/* Section 4 — ReAct efficiency */}
          <section className="cbm-section">
            <Panel className="cbm-panel" title="Hiệu quả suy luận" subtitle="Bot mất bao nhiêu vòng, gọi bao nhiêu tool, và tiêu tốn bao nhiêu token cho một lượt.">
              <ReactEfficiency summary={summaryQ.data} loading={summaryQ.isLoading} />
            </Panel>
          </section>

          {/* Section 5 — Recent turns */}
          <section className="cbm-section">
            <Panel
              className="cbm-panel"
              title="Lượt gần đây"
              subtitle={`20 lượt mới nhất · vai trò: ${roleLabel(user?.role ?? 'ADMIN')} (toàn quyền xem)`}
            >
              <RecentTurnsTable
                turns={recentQ.data}
                loading={recentQ.isLoading}
                sort={recentSort}
                onSortChange={setRecentSort}
              />
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}
