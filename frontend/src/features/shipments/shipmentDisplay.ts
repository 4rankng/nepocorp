/**
 * Pure display helpers for the Lô hàng (Shipment) pages — NEPO-61.
 * Kept free of React so the contract pins can import and assert them
 * directly (profit strip, write-role gate, cut-off urgency).
 */
import {
  SHIPMENT_CUTOFF_WARN_DAYS,
  SHIPMENT_WRITE_ROLES,
  TRIP_STATUS_COLORS,
  TRIP_STATUS_LABELS,
  TripFlowType,
  TripStatus,
} from '@tingting/shared';
import type { Role, ShipmentProfitSummary } from '@tingting/shared';

/* ─── Permissions (UI mirror of policy.csv + requireRoles) ────────────────── */

/** Lô create/edit + chứng từ + chi phí — same roles the backend requires. */
export function canWriteShipments(role: Role | null | undefined): boolean {
  return role != null && (SHIPMENT_WRITE_ROLES as readonly Role[]).includes(role);
}

/** Báo nợ đã phát hành chỉ ADMIN được sửa/xóa (backend 403 với vai khác). */
export function canManageBillingDocuments(role: Role | null | undefined): boolean {
  return role === 'ADMIN';
}

/**
 * NEPO-63 — Lập Báo nợ (billing-documents routes): the UI mirror of the server
 * guard `requireRoles(ADMIN, MANAGER, ACCOUNTANT)` on
 * /api/finance/billing-documents*. Kế toán MUST see the 'Lập Báo nợ lô' button
 * even though it cannot write the lô itself; FORWARDER/DISPATCHER must not be
 * offered a button the API answers 403.
 */
export function canCreateBillingDocuments(role: Role | null | undefined): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'ACCOUNTANT';
}

/**
 * NEPO-63 (QA 3b) — whole 'Giấy báo nợ theo lô' section visibility on the lô
 * detail: the same role set the server enforces (GET /api/shipments/:id
 * strips the embedded notes for everyone else). Giao nhận sees no Báo nợ.
 */
export function canSeeBillingDocuments(role: Role | null | undefined): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'ACCOUNTANT';
}

/* ─── Flow type ───────────────────────────────────────────────────────────── */

const FLOW_TYPE_LABELS: Record<TripFlowType, string> = {
  [TripFlowType.XUAT]: 'Hàng xuất',
  [TripFlowType.NHAP]: 'Hàng nhập',
};

export function flowTypeLabel(flowType: TripFlowType | null | undefined): string | null {
  return flowType ? FLOW_TYPE_LABELS[flowType] ?? null : null;
}

/* ─── Profit strip ────────────────────────────────────────────────────────── */

export interface ShipmentProfitRow {
  key: 'revenue' | 'collect' | 'pay' | 'tripCosts' | 'profit';
  label: string;
  value: number;
  /** Tooltip text (e.g. tripCosts flows in automatically from linked trips). */
  title?: string;
  /** CSS modifier for the value (profit positive/negative coloring). */
  valueClassName?: string;
}

/**
 * One row per profit-strip block, in display order:
 * Doanh thu → Thu khách → Chi trả NCC → Chi chạy xe → Lợi nhuận lô.
 * Profit = revenue − payTotal − tripCosts; collect is an informational split
 * of the revenue — never an extra source.
 */
export function profitRows(profit: ShipmentProfitSummary): ShipmentProfitRow[] {
  return [
    { key: 'revenue', label: 'Doanh thu', value: profit.revenueInclVat },
    { key: 'collect', label: 'Thu khách', value: profit.collectTotal },
    { key: 'pay', label: 'Chi trả NCC', value: profit.payTotal },
    { key: 'tripCosts', label: 'Chi chạy xe', value: profit.tripCosts, title: 'Tự động từ chuyến liên quan' },
    {
      key: 'profit',
      label: 'Lợi nhuận lô',
      value: profit.profit,
      valueClassName: profit.profit >= 0 ? 'is-positive' : 'is-negative',
    },
  ];
}

/* ─── Cut-off urgency ─────────────────────────────────────────────────────── */

/** Whole days from `today` to the cut-off date (negative = already past). */
export function cutoffDaysLeft(cutoffDate: string | null | undefined, today: Date = new Date()): number | null {
  if (!cutoffDate) return null;
  const cutoff = new Date(`${cutoffDate}T00:00:00`);
  if (Number.isNaN(cutoff.getTime())) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((cutoff.getTime() - startOfToday.getTime()) / 86_400_000);
}

/**
 * Cut-off is urgent when it falls within SHIPMENT_CUTOFF_WARN_DAYS of today —
 * or has already passed while the lô is still open, which is worse.
 */
export function isCutoffUrgent(cutoffDate: string | null | undefined, today: Date = new Date()): boolean {
  const days = cutoffDaysLeft(cutoffDate, today);
  return days != null && days <= SHIPMENT_CUTOFF_WARN_DAYS;
}

/* ─── Route / trips / documents ───────────────────────────────────────────── */

/** "POL → POD", a single port when only one is set, null when neither. */
export function routeText(pol: string | null | undefined, pod: string | null | undefined): string | null {
  const from = pol?.trim();
  const to = pod?.trim();
  if (from && to) return `${from} → ${to}`;
  return from || to || null;
}

export function tripStatusLabel(status: string): string {
  return TRIP_STATUS_LABELS[status as TripStatus] ?? status;
}

export function tripStatusColor(status: string): string {
  return TRIP_STATUS_COLORS[status as TripStatus] ?? 'var(--fg-3)';
}

/** Compact file size ("1.2 MB"); null stays null so SubLine renders nothing. */
export function formatFileSize(size: number | null | undefined): string | null {
  if (size == null) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
