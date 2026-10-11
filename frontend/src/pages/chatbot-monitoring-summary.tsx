import { SkeletonKPIs } from '../components/shared/Skeleton';
import type { ChatbotMetricSummary, ChatbotLatencyBreakdown, ChatbotToolStat } from '@tingting/shared';
import './ChatbotMonitoringPage.css';
import {
  fmtMs, fmtRate, fmtNum, fmtAvg, fmtCompactMs,
  p95BandTone, healthCopy, isProseValue, mainBottleneck, toolLabel, slaHint,
} from './chatbot-monitoring-format';

export function RangeToggle({ range, onChange }: { range: string; onChange: (range: string) => void }) {
  return <div className="cbm-seg cbm-seg--range" role="tablist" aria-label="Khoảng thời gian">
    {(['7d', '30d'] as const).map(option => <button key={option} type="button" role="tab"
      aria-selected={range === option} className={`cbm-seg__btn${range === option ? ' is-active' : ''}`}
      onClick={() => onChange(option)}>{option === '7d' ? '7 ngày' : '30 ngày'}</button>)}
  </div>;
}

export const BOT_OPS_ILLUSTRATION = '/assets/illustrations/chatbot-monitoring-ops.png';
export const BOT_ICON = '/assets/icons/35-assistant-tro-ly-tingting.png';

// The Vietnamese label maps, formatting helpers, SLA-band + health-copy helpers
// live in ./chatbot-monitoring-format so this module exports only components
// (React Fast Refresh).

export function BotHealthHero({
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
            <strong className={isProseValue(bottleneck.label) ? 'cbm-value--text' : undefined}>{bottleneck.label}</strong>
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

export function OperationalInsights({
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

export function SummaryKpis({
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
      label: 'Token đầu tiên (TTFT) p95',
      value: fmtCompactMs(summary.ttft?.p95Ms ?? null),
      meta: 'Thời gian đến token/đáp ứng đầu tiên — cảm nhận nhanh nhất.',
      hint: 'Time-to-first-token: thời gian từ lúc gửi đến khi nội dung đầu tiên xuất hiện. p95 thấp = bot phản hồi nhanh cảm nhận.',
      tone: (summary.ttft?.p95Ms ?? null) != null && (summary.ttft!.p95Ms! <= 2000) ? 'green' : (summary.ttft?.p95Ms ?? null) != null && summary.ttft!.p95Ms! <= 5000 ? 'amber' : 'red',
      progress: summary.ttft?.p95Ms ? Math.min(1, summary.ttft.p95Ms / 5000) : 0,
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
          <span className={`cbm-kpi__value${isProseValue(c.value) ? ' cbm-value--text' : ''}`}>{c.value}</span>
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

/* ─── Intent-lane distribution (P0) ──────────────────────────────────────────
 * Shows how many turns each execution lane handled. The headline for
 * route-before-reasoning: a healthy system shifts volume out of
 * 'react_fallback' into 'faq'/'nav'/'lookup'/'summary'. Vietnamese labels so
 * raw bucket codes never surface to the user.
 */
const INTENT_BUCKET_LABELS: Record<string, string> = {
  faq: 'FAQ (không LLM)',
  nav: 'Điều hướng (không LLM)',
  lookup: 'Tra cứu nhanh',
  summary: 'Tóm tắt hàng ngày',
  financial: 'Tổng quan tài chính',
  report: 'Báo cáo nhanh',
  aborted: 'Đã huỷ',
  react_fallback: 'Phân tích (ReAct)',
  unknown: 'Khác (cũ)',
};

export function IntentDistribution({
  buckets,
  totalTurns,
  loading,
}: {
  buckets: ChatbotMetricSummary['intentBuckets'] | undefined;
  totalTurns: number;
  loading: boolean;
}) {
  if (loading) return null;
  if (!buckets || buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className="cbm-intent">
      {buckets.map((b) => {
        const pct = totalTurns > 0 ? (b.count / totalTurns) : 0;
        const widthPct = (b.count / max) * 100;
        const label = INTENT_BUCKET_LABELS[b.bucket] ?? 'Nhóm khác';
        return (
          <div className="cbm-intent__row" key={b.bucket}>
            <span className="cbm-intent__label" title={label}>
              {label}
            </span>
            <svg className="cbm-bar__track" viewBox="0 0 100 14" preserveAspectRatio="none" role="img"
              aria-label={`${label}: ${b.count} lượt`}>
              <rect x="0" y="4" width="100" height="6" rx="3" className="cbm-bar__bg" />
              <rect x="0" y="4" width={widthPct} height="6" rx="3"
                className={`cbm-bar__fill${b.bucket === 'react_fallback' || b.bucket === 'unknown' || b.bucket === 'aborted' ? ' cbm-bar__fill--none' : ''}`} />
            </svg>
            <span className="cbm-intent__count" title={`Fallback ${fmtRate(b.fallbackRate)} · ${fmtAvg(b.avgIterations)} vòng`}>
              {fmtNum(b.count)} ({fmtRate(pct)}) · p95 {fmtCompactMs(b.p95Ms)} · TB {fmtAvg(b.avgTokens)} token/lượt
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * Section 2 — Latency breakdown (inline-SVG bars)
 * ========================================================================== */
