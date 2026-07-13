/**
 * Onboarding checklist task catalog (Phase 6).
 *
 * The closed, role-scoped set of activation tasks shown in the floating
 * "Bắt đầu sử dụng NEPO Logistics" panel. Each task completes when its
 * `completionEvent` (a PRODUCT_EVENTS member) fires — NOT when a tooltip is
 * viewed. An item with a `tourId` launches that curated tour on click.
 *
 * Adding a task is a deliberate, PR-visible edit here. The catalog test asserts
 * every completionEvent is a known product event, every tourId is a known tour,
 * no duplicate ids per role, and only office roles appear.
 */
import { Role } from '../constants';
import type { ProductEventName } from './events';
import type { TourId } from '../tours';

export interface OnboardingTask {
  /** Stable slug, unique within a role. */
  id: string;
  /** Vietnamese title shown in the checklist. */
  title: string;
  /** The role this task belongs to (one task = one role). */
  role: Role.ADMIN | Role.MANAGER | Role.ACCOUNTANT;
  /** The product event that completes this task (business-event-driven). */
  completionEvent: ProductEventName;
  /** Optional curated tour to launch when the user clicks the item. */
  tourId?: TourId;
  /** Display order within the role's checklist. */
  sortOrder: number;
}

/**
 * Manager activation checklist. Ordered from orientation → real work.
 *
 *   1. Visit the dashboard (orientation)
 *   2. Open the trip list
 *   3. Create the first trip  ← launches the create-trip tour; completes on
 *      trip.created (the canonical interaction step from Phase 3)
 *   4. Lock a trip
 *
 * (A future "fleet awareness" step tied to a live fleet dashboard view is
 * deferred until that dashboard ships; it is intentionally not in the array.)
 *
 * The dashboard/list "visit" tasks complete on the `*.dashboard_viewed` events.
 * Those events are wired by Phase 6's hook on first paint of the role pages;
 * until then the items remain completable via the manual check (best-effort).
 */
export const ONBOARDING_TASKS: readonly OnboardingTask[] = [
  // ── MANAGER ────────────────────────────────────────────────────────────
  {
    id: 'manager-visit-dashboard',
    title: 'Xem tổng quan hệ thống',
    role: Role.MANAGER,
    completionEvent: 'fleet.dashboard_viewed',
    sortOrder: 1,
  },
  {
    id: 'manager-open-trip-list',
    title: 'Mở danh sách chuyến xe',
    role: Role.MANAGER,
    completionEvent: 'fleet.dashboard_viewed',
    sortOrder: 2,
  },
  {
    id: 'manager-create-first-trip',
    title: 'Tạo chuyến xe đầu tiên',
    role: Role.MANAGER,
    completionEvent: 'trip.created',
    tourId: 'create-trip',
    sortOrder: 3,
  },
  {
    id: 'manager-lock-first-trip',
    title: 'Khóa chuyến đầu tiên',
    role: Role.MANAGER,
    completionEvent: 'trip.locked',
    tourId: 'lock-trip-and-payment',
    sortOrder: 4,
  },

  // ── ACCOUNTANT ─────────────────────────────────────────────────────────
  {
    id: 'accountant-visit-dashboard',
    title: 'Xem tổng quan kế toán',
    role: Role.ACCOUNTANT,
    completionEvent: 'accounting.dashboard_viewed',
    sortOrder: 1,
  },
  {
    id: 'accountant-lock-first-trip',
    title: 'Khóa chuyến đầu tiên',
    role: Role.ACCOUNTANT,
    completionEvent: 'trip.locked',
    tourId: 'lock-trip-and-payment',
    sortOrder: 2,
  },
  {
    id: 'accountant-record-first-receipt',
    title: 'Ghi nhận thanh toán đầu tiên',
    role: Role.ACCOUNTANT,
    completionEvent: 'receivable.payment_recorded',
    sortOrder: 3,
  },
  {
    id: 'accountant-fuel-config',
    title: 'Nhập định mức nhiên liệu',
    role: Role.ACCOUNTANT,
    completionEvent: 'config.fuel_saved',
    tourId: 'fuel-config',
    sortOrder: 4,
  },
];

/** Tasks visible to a given role, in display order. */
export function tasksForRole(
  role: Role,
): readonly OnboardingTask[] {
  return ONBOARDING_TASKS.filter((t) => t.role === role).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Lookup by id (returns undefined for an unknown id). */
export function getTask(id: string): OnboardingTask | undefined {
  return ONBOARDING_TASKS.find((t) => t.id === id);
}
