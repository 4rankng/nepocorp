// Vietnamese label maps + formatting helpers for the chatbot monitoring
// dashboard. Split out of `chatbot-monitoring-summary.tsx` so that module
// exports only components (React Fast Refresh).

import { formatNumber } from '../lib/format';
import type { ChatbotMetricSummary, ChatbotLatencyBreakdown } from '@tingting/shared';

/* ─── Vietnamese label maps ────────────────────────────────────────────────
 * The raw metrics rows carry enum-ish strings (role, errorKind). Per the
 * no-raw-IDs rule they must never surface as-is. These maps are the single
 * place to translate them; unknown values fall back to a sensible label.
 */
export const ERROR_KIND_LABELS: Record<string, string> = {
  timeout: 'Hết giờ',
  http: 'Lỗi máy chủ',
  parse: 'Lỗi phân tích',
  no_key: 'Thiếu key',
  tool: 'Lỗi công cụ',
};
export const ROLE_LABELS_VN: Record<string, string> = {
  ADMIN: 'Quản trị',
  MANAGER: 'Giám đốc',
  ACCOUNTANT: 'Kế toán',
  DRIVER: 'Lái xe',
  FORWARDER: 'Giao nhận',
};

export function errorKindLabel(kind: string | null): string {
  if (kind == null || kind === '') return 'OK';
  return ERROR_KIND_LABELS[kind] ?? kind;
}
export function roleLabel(role: string): string {
  return ROLE_LABELS_VN[role] ?? (role || '—');
}

/* ─── Formatting helpers ─────────────────────────────────────────────────── */

/** Latency in ms → "1.234 ms" with thousands separators. Null → "—". */
export function fmtMs(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${formatNumber(Math.round(v))} ms`;
}
/** 0..1 rate → "12,3 %" with one decimal and a Vietnamese decimal comma. */
export function fmtRate(v: number | null | undefined): string {
  if (v == null) return '—';
  const pct = v * 100;
  return `${pct.toFixed(1).replace('.', ',')} %`;
}
/** Plain number with thousands separators, "—" for null/undefined. */
export function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—';
  return formatNumber(v);
}
/** One-decimal average with thousands separators, "—" for null. */
export function fmtAvg(v: number | null | undefined, suffix = ''): string {
  if (v == null) return '—';
  const rounded = Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(1));
  return `${formatNumber(rounded)}${suffix}`;
}
export function fmtCompactMs(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}s`;
  return `${Math.round(v)}ms`;
}

/* ─── SLA band colour from the API's thresholds ────────────────────────────
 * p95 < p95GreenMs → healthy (emerald); between green and amber → warning;
 * above amber → critical. Null p95 → neutral.
 */
export function p95BandTone(p95Ms: number | null, sla: { p95GreenMs: number; p95AmberMs: number } | undefined):
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

export function healthCopy(summary: ChatbotMetricSummary | undefined):
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

/**
 * True when a KPI value is prose rather than a number/identifier. The mono font
 * stretches Vietnamese text ("Chưa rõ") into something that reads as broken
 * spacing, so prose values render in the body font (kanban 20260921_10).
 */
export function isProseValue(value: string): boolean {
  return /[^\d\s.,%–—-]/.test(value);
}

export function mainBottleneck(breakdown: ChatbotLatencyBreakdown | undefined): { label: string; value: number | null } {
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

export function toolLabel(name: string): string {
  const labels: Record<string, string> = {
    'ui.navigate': 'Điều hướng trang',
    'ui.search_pages': 'Tìm trang',
    'approvals.queue': 'Hàng chờ duyệt',
    'fleet.catalog': 'Dữ liệu đội xe',
    'customers.list': 'Danh sách khách',
  };
  return labels[name] ?? name;
}

export function slaHint(sla: { p95GreenMs: number; p95AmberMs: number } | undefined): string {
  if (!sla) return '';
  return `SLA: ${sla.p95GreenMs} ms (xanh) · ${sla.p95AmberMs} ms (vàng).`;
}
