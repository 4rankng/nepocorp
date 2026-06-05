# Plan: UI/UX Foundation Improvements

## Problem

The tingting frontend has a mature feature set but inconsistent UX infrastructure:
- **No toast system** — 4 ad-hoc implementations, most pages have zero mutation feedback
- **No ErrorBoundary** — any unhandled render error crashes the entire app
- **No shared empty-state component** — 15+ pages each roll their own
- **No skeleton loading** — all loading states use spinners (no shape matching)
- **Driver pages use raw `fetch`** — inconsistent with admin TanStack Query pattern
- **Mixed inline styles + CSS classes** — especially TripDetailPage

## Scope

This plan focuses on **shared infrastructure** that raises UX quality across all pages. It does NOT redesign individual pages.

## Phase 1: Toast Notification System

**Why first:** Toasts are the single highest-impact UX improvement. Every CRUD action, payment recording, trip lock, dispatch, and config save currently has either no feedback or a page-specific ad-hoc implementation.

### Tasks

1. **Create `frontend/src/components/shared/Toast.tsx`**
   - Export `ToastProvider` (wraps app) + `useToast()` hook
   - `useToast()` returns `{ toast: (options) => string, dismiss: (id) => void }`
   - Options: `{ kind: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number }`
   - Max 3 visible toasts, auto-dismiss (default 4.5s), stack from bottom-right
   - Use existing CSS vars: `--success`, `--danger`, `--warning`, `--info` for background colors
   - Use `--z-toast: 500` z-index (already in tokens.css)
   - Add `<ToastProvider>` to `App.tsx` wrapping authenticated routes

2. **Create `frontend/src/components/shared/Toast.css`**
   - BEM classes: `.toast-container`, `.toast`, `.toast--success/error/warning/info`, `.toast__icon`, `.toast__message`, `.toast__close`
   - Slide-in animation using `--ease-spring` + `--t-spring` tokens
   - Responsive: full-width on mobile (< 640px)

3. **Verify:** After adding ToastProvider to App.tsx, confirm existing pages still render. Test `useToast()` in one page.

### Anti-patterns
- Do NOT use a third-party toast library (sonner, react-hot-toast) — we have a design system
- Do NOT create imperative global function (`toast.success()`) — React context + hook only

---

## Phase 2: ErrorBoundary + Skeleton Loading

**Why:** ErrorBoundary prevents white-screen crashes. Skeleton loading improves perceived performance on every data-heavy page.

### Tasks

1. **Create `frontend/src/components/shared/ErrorBoundary.tsx`**
   - Class component (React requirement)
   - `getDerivedStateFromError` + `componentDidCatch` (log to console)
   - Render: centered error card with Vietnamese message "Da xay ra loi" + retry button
   - Use existing `Panel` + `Btn` components for the fallback UI
   - Wrap each lazy-loaded route in its own ErrorBoundary (prevents full-app crash)

2. **Create `frontend/src/components/shared/Skeleton.tsx`**
   - Export `Skeleton` component: `{ width?, height?, radius?, className? }`
   - Uses CSS `--bg-3` background + shimmer animation
   - Export preset shapes: `SkeletonLine`, `SkeletonCard`, `SkeletonTable({ rows, cols })`
   - Replace DashboardPage spinner loading state (lines 130-148) with skeleton KPIs

3. **Create `frontend/src/components/shared/Skeleton.css`**
   - `.skeleton` base class with shimmer keyframe
   - `.skeleton--circle` (avatar shape), `.skeleton--line`, `.skeleton--card`
   - Use `--bg-3` for base, `--surface-2` for shimmer highlight

4. **Verify:** Test ErrorBoundary by throwing in a render. Test Skeleton in DashboardPage loading state.

---

## Phase 3: Shared Empty State Component

**Why:** 15+ pages each have their own empty-state markup with varying styles and no consistency.

### Tasks

1. **Create `frontend/src/components/shared/EmptyState.tsx`**
   - Props: `{ icon?: React.ComponentType, title: string, description?: string, action?: { label: string, onClick: () => void } }`
   - Centered layout: icon circle → title (semibold) → description (muted) → action button
   - Use `--fg-3` for icon, `--ink-2` for title, `--ink-3` for description
   - Use `Btn variant="secondary"` for action

2. **Create `frontend/src/components/shared/EmptyState.css`**
   - `.empty-state`, `.empty-state__icon`, `.empty-state__title`, `.empty-state__desc`, `.empty-state__action`

3. **Verify:** Grep for "Chưa có" / "Không tìm thấy" messages across pages. Confirm EmptyState covers these cases.

---

## Phase 4: Driver Pages — TanStack Query Migration

**Why:** Driver pages (DriverTripsPage, DriverTripDetailPage, DriverEarningsPage, DriverPenaltyPage) use raw `fetch` + `useState` for data fetching, while all admin pages use TanStack Query hooks. This creates inconsistent loading/error patterns and more code.

### Tasks

1. **Add driver-specific query hooks to `frontend/src/hooks/useQueries.ts`**
   - `useDriverTrips()` — GET `/driver/my-trips`
   - `useDriverTripDetail(id)` — GET `/driver/my-trips/:id`
   - `useDriverEarnings()` — GET `/driver/earnings`
   - `useDriverPenalties()` — GET `/driver/penalties`

2. **Migrate each driver page** (one at a time):
   - Replace `useState` + `useEffect` + `fetch` with TanStack Query hook
   - Use `Skeleton` for loading, `ErrorBoundary` for errors
   - Keep identical UI rendering

3. **Verify:** Each driver page loads correctly. Loading skeleton appears. Error boundary catches failures.

---

## Phase 5: TripDetailPage Inline Style Cleanup

**Why:** TripDetailPage has ~50 inline `style={{}}` objects scattered across the JSX. Every other page uses CSS classes from the design system. This is the worst offender.

### Tasks

1. **Create `frontend/src/pages/TripDetailPage.css`**
   - Extract inline styles from TripDetailPage into BEM classes
   - Classes: `.trip-detail-header`, `.trip-detail-actions`, `.info-row`, `.info-row__label`, `.info-row__value`
   - Photo grid, adjustment table, reassign overlay

2. **Replace inline styles** with CSS classes in TripDetailPage.tsx
   - Keep `infoRow()` helper but have it return class names instead of style objects

3. **Verify:** Visual regression check — TripDetailPage looks identical after refactor.

---

## Verification Checklist (All Phases)

- [ ] `npx tsc --noEmit` zero errors in frontend/
- [ ] Toast appears on a CRUD action and auto-dismisses
- [ ] ErrorBoundary catches a thrown error and shows retry UI
- [ ] Skeleton loading visible on DashboardPage refresh
- [ ] EmptyState renders on a page with no data
- [ ] Driver pages load data via TanStack Query
- [ ] TripDetailPage renders correctly with CSS classes instead of inline styles
- [ ] `prefers-reduced-motion: reduce` disables shimmer/slide animations

## Allowed APIs / Patterns

| What | Source | Pattern to Copy |
|------|--------|-----------------|
| BEM component | `UI.css` `.kpi`, `.panel` | Block__element--modifier naming |
| CSS vars | `tokens.css` | Use `--success`, `--danger`, `--z-toast`, `--ease-spring`, etc. |
| Component + hook | `useConfirm` in `UI.tsx:654-700` | Context + provider + hook pattern |
| Skeleton CSS | `DashboardPage.tsx:139-146` | Existing loading skeleton markup (inline) |
| TanStack Query hook | `useQueries.ts` `useDashboardStats` | `useQuery` with typed return |
| Page CSS file | `DashboardPage.css`, `TripListPage.css` | Co-located `.css` file with page-scoped classes |

## Anti-Patterns to Avoid

- Do NOT add third-party toast/skeleton/empty-state libraries
- Do NOT create imperative global functions — use React context + hooks
- Do NOT modify existing CSS variable values
- Do NOT change page layouts — only add shared infrastructure
- Do NOT use Tailwind utility classes in JSX — use custom CSS with design tokens
