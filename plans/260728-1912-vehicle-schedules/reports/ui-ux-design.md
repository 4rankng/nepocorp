# UI/UX implementation design — Lịch nhắc việc phương tiện

## Design direction

Flat operational alerting, not a new dashboard subsystem. Reuse the current
TransTing type, spacing, status-strip, button, overlay, and semantic tokens.
No new font, icon set, component package, shadow layer, gradient treatment, or
nested decorative card.

Primary user job: office staff sees what is already due, identifies the exact
tractor/trailer, then completes or updates the obligation with minimum travel.
One server ordering must drive both surfaces: overdue first, then nearest
`dueAt`, then plate/title for deterministic ties.

## Role and surface contract

- Render query, banners, badges, and management trigger only for
  `ADMIN | MANAGER | ACCOUNTANT`.
- Render nothing and make no schedule request for `DRIVER | FORWARDER`.
- Surfaces remain only `/dashboard` and `/fleet`; no bell, portal page, or
  global layout injection.
- Every trigger and query identity carries both
  `vehicleComponent: "TRUCK" | "TRAILER"` and `vehicleId`.

## Exact placement

### Dashboard

Insert `VehicleScheduleBanner` immediately before the existing
`Việc cần xử lý` section inside `.wf-bento`, as a direct
`.wf-bento-full` sibling. This keeps the operational reminder in the first
decision scan path while preserving the existing page-top >90-day receivables
banner as a separate financial alert. Do not put the schedule banner inside the
priority-board card and do not merge schedule items into `decisionItems`.

Dashboard display:

- Header row: calendar/alert icon, `Lịch phương tiện cần xử lý`, total active
  count, `Xem tại Đội xe`.
- Show at most 3 ordered items; final summary row says
  `Còn {n} lịch khác cần xử lý` when applicable.
- Each item: `StatusStrip`, explicit state text, component label + plate,
  schedule title, and due time. The whole item is not clickable; use a real
  `<Link>`/button for navigation.
- Link to a deep-linkable Fleet state such as
  `/fleet?schedule={scheduleId}&component={TRUCK|TRAILER}&vehicleId={id}`.
  Fleet opens the correct plate-scoped manager and restores focus to the
  originating trigger on close.

### Đội xe

Place the same `VehicleScheduleBanner` after `.kpi-grid` and before
`TruckCard`. It therefore precedes both vehicle catalogs but does not interrupt
the page header/KPI summary. Do not duplicate it above each panel.

Add a `Lịch nhắc việc` column to both desktop tables:

- Tractor: after `Lốp`.
- Trailer: after `Lốp`.
- Cell contains a 44 px trigger. With active items:
  `AlertTriangle`/`Clock3` + `{count} lịch` and a text state
  (`Quá hạn` or `Đến hạn`). With none: `CalendarPlus` + `Thêm lịch`.
- Update empty-row `colSpan` from 5 to 6.

On mobile cards, add one row after `Lốp`:

- Label `Lịch nhắc việc`.
- Right side is the same 44 px trigger, wrapping rather than truncating.
- Stop propagation so opening the manager does not also open vehicle detail.
- Keep the existing whole-card detail interaction unchanged.

Also add a secondary `Lịch nhắc việc` action to the tractor/trailer detail
modal footer so keyboard and mobile users have a second discoverable path.

## Component composition

```text
VehicleScheduleBanner
├─ VehicleScheduleBannerHeader
├─ VehicleScheduleAlertItem × max 3
│  ├─ StatusStrip
│  ├─ explicit state + component + Plate
│  └─ title + formatted due time
└─ Fleet deep link / remaining-count summary

VehicleScheduleTrigger
└─ icon + count/state text

VehicleScheduleManager (shared Drawer)
├─ vehicle identity header: component + Plate
├─ active/history segmented controls
├─ schedule list
│  └─ ScheduleRow + actions
└─ ScheduleForm (create/edit mode)
```

Use the existing shared `Drawer`, not a new overlay dependency. On desktop it
is a right rail (target 560 px); at `<=640px` it becomes full viewport width
with `max-height: 100dvh`. Header and footer stay visible; only the body
scrolls. Use `overscroll-behavior: contain` and bottom padding including
`env(safe-area-inset-bottom)`.

Do not use the dismissible shared `Banner` behavior for active schedules.
Schedule warnings remain until completion/cancellation. Either compose a
feature-local non-dismissible banner shell or use `Banner nonDismissable`
with `sticky={false}` and feature-local layout classes; never set a
`dismissKey`.

## Vietnamese interface copy

### Banner and state labels

| Context | Copy |
|---|---|
| Banner title | `Lịch phương tiện cần xử lý` |
| Overdue | `Quá hạn` |
| Reminder reached, not overdue | `Đến hạn nhắc` |
| Component | `Xe đầu kéo` / `Rơ-moóc` |
| Due metadata | `Hạn {HH:mm, dd/MM/yyyy}` |
| Dashboard action | `Xem tại Đội xe` |
| Remaining count | `Còn {n} lịch khác cần xử lý` |

Example item: `Quá hạn · Xe đầu kéo 51C-123.45` /
`Đăng kiểm định kỳ · Hạn 08:00, 28/07/2026`.

### Manager

- Title: `Lịch nhắc việc`
- Subtitle: `Xe đầu kéo 51C-123.45` or `Rơ-moóc 51R-678.90`
- Tabs: `Đang theo dõi` / `Đã xử lý`
- Primary create action: `Thêm lịch`
- Row actions: `Sửa`, `Hoàn thành`, `Hủy lịch`
- Create submit: `Tạo lịch`
- Edit submit: `Lưu thay đổi`
- Secondary form action: `Bỏ qua`
- Completion confirmation:
  `Đánh dấu “{title}” là đã hoàn thành? Lịch này sẽ không còn xuất hiện trong cảnh báo.`
- Cancellation confirmation:
  `Hủy lịch “{title}”? Lịch sẽ được giữ trong lịch sử và không còn cảnh báo.`
- Empty active: `Chưa có lịch đang theo dõi cho phương tiện này.`
- Empty history: `Chưa có lịch đã xử lý.`

### Form

Visible labels; do not rely on placeholders.

| Field | Label | Control / behavior |
|---|---|---|
| type | `Loại lịch` | select: `Bảo trì` / `Giấy tờ` |
| title | `Nội dung nhắc` | text, required; example placeholder `Ví dụ: Đăng kiểm định kỳ…` |
| remindAt | `Thời điểm nhắc` | `datetime-local`, required |
| dueAt | `Hạn hoàn thành` | `datetime-local`, required |
| documentNumber | `Số giấy tờ` | text, optional; show for `Giấy tờ`, preserve existing value while editing |
| notes | `Ghi chú` | textarea, optional |

Helper under date fields:
`Theo giờ Việt Nam (Asia/Ho_Chi_Minh)`. Validate on blur/submit:
`Thời điểm nhắc phải trước hoặc trùng hạn hoàn thành.` Focus the first invalid
field. Inputs must have `name`, `autocomplete="off"`, associated `<label>`,
and mobile font size at least 16 px.

## States

- **Hidden before reminder:** not in banners/badges; still listed under
  `Đang theo dõi` as `Sắp tới`.
- **Due:** clock icon + `Đến hạn nhắc`; semantic warning token.
- **Overdue:** alert-triangle icon + `Quá hạn`; danger token plus text and
  status strip. Never communicate this with red alone.
- **Completed:** check icon + `Đã hoàn thành`; read-only in history.
- **Cancelled:** ban icon + `Đã hủy`; read-only in history.
- **Loading banners:** reserve one compact row with skeleton blocks so page
  content does not jump.
- **Loading manager:** 3 schedule-row skeletons; keep identity header visible.
- **Empty active query:** render no banner and a zero-state manager message.
- **Banner query error:** do not show stale success. Render a compact
  `Không tải được lịch phương tiện` status with `Thử lại`; avoid blocking the
  rest of Dashboard/Fleet.
- **Mutation pending:** disable the affected action only and show
  `Đang lưu…` / `Đang cập nhật…`; prevent double submit.
- **Mutation error:** inline form/row error with recovery action; retain all
  entered values.
- **Mutation success:** update both banner and badges from the same query cache;
  announce with `aria-live="polite"`.

## Accessibility and interaction

- All interactive targets minimum 44×44 px with at least 8 px separation.
- Buttons for actions; `<Link>` for Fleet navigation. Do not add clickable
  `div` rows.
- Drawer: `role="dialog"`, `aria-modal`, labelled title, Escape close, focus
  trap, initial focus on title or first meaningful control, return focus to
  opener, and unsaved-change confirmation.
- Schedule item state uses icon + Vietnamese text + `StatusStrip`; component
  uses text + plate prefix, never color alone.
- Decorative Lucide icons use `aria-hidden="true"`; icon-only close has
  `aria-label`.
- Use `Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ... })`;
  use tabular figures/`var(--font-mono)` for plates and timestamps.
- Titles, notes, plates, and document numbers use `overflow-wrap:anywhere`;
  no truncation and no horizontal scroll.
- Focus-visible outline: 2 px `var(--accent-2)` with 2 px offset.
- Keep transitions to explicit `background`, `border-color`, `color`, and
  `opacity` at 120–180 ms; honor `prefers-reduced-motion`.
- Destructive cancellation is separated from completion/save and always
  confirmed. Completion is not styled as destructive.

## CSS and token contract

Feature-local classes:

```text
.vehicle-schedule-banner
.vehicle-schedule-banner__head
.vehicle-schedule-banner__list
.vehicle-schedule-alert
.vehicle-schedule-alert__state
.vehicle-schedule-alert__identity
.vehicle-schedule-alert__meta
.vehicle-schedule-trigger
.vehicle-schedule-trigger--overdue
.vehicle-schedule-manager
.vehicle-schedule-manager__tabs
.vehicle-schedule-list
.vehicle-schedule-row
.vehicle-schedule-row__actions
.vehicle-schedule-form
.vehicle-schedule-form__grid
.vehicle-schedule-form__field
.vehicle-schedule-form__footer
```

Use `--surface`, `--surface-2`, `--surface-3`, `--ink`, `--ink-2`,
`--ink-3`, `--line`, `--line-2`, `--brand`, `--brand-hover`,
`--accent-soft`, `--warning`, `--warning-soft`, `--warning-text`,
`--danger`, `--danger-soft`, `--danger-text`, `--success`,
`--success-soft`, `--info`, `--info-soft`, `--r-sm`, `--r`,
`--control-h`, `--font-body`, `--font-mono`, and the existing type scale.
No raw status hex, `!important`, full-height alert background, box shadow, or
gradient.

Banner: white surface, 1 px border, 12 px radius, 10–12 px internal gap.
Urgency belongs to the item status strip/icon/text, not a solid red/yellow
banner fill. This avoids competing with the existing critical receivables
banner.

Responsive behavior:

- **320/375:** one alert per row; state/identity and metadata stack; banner
  action is full-width 44 px. Form is one column. Drawer footer buttons stack
  or use two equal columns only when both labels fit. Use 12 px page-local
  padding and `min-width:0` on every flex/grid child.
- **768:** banner list remains one column; form becomes 2 columns with title
  and notes spanning both; drawer target width 560 px.
- **Desktop:** banner items may use 2 columns only when the container is at
  least 900 px; preserve source ordering. Form stays 2 columns. Never create a
  wide schedule table inside the drawer.

## Test selectors

Prefer role/name queries; add stable selectors only for composite identity and
cross-surface assertions:

```text
data-testid="vehicle-schedule-banner-dashboard"
data-testid="vehicle-schedule-banner-fleet"
data-testid="vehicle-schedule-alert-{scheduleId}"
data-testid="vehicle-schedule-trigger-TRUCK-{vehicleId}"
data-testid="vehicle-schedule-trigger-TRAILER-{vehicleId}"
data-testid="vehicle-schedule-manager"
data-testid="vehicle-schedule-row-{scheduleId}"
data-testid="vehicle-schedule-form"
```

Form controls use stable names:
`scheduleType`, `title`, `remindAt`, `dueAt`, `documentNumber`, `notes`.
Do not encode array index in selectors.

## UI acceptance matrix

| Check | Expected |
|---|---|
| ADMIN/MANAGER/ACCOUNTANT | Same banners, badges, and manager actions |
| DRIVER/FORWARDER | No request, banner, badge, trigger, or manager |
| TRUCK id 7 + TRAILER id 7 | Independent trigger, list, mutation, cache invalidation |
| `remindAt > now` | No banner/badge; manager shows `Sắp tới` |
| `remindAt <= now <= dueAt` | `Đến hạn nhắc` with clock + warning treatment |
| `dueAt < now` | `Quá hạn` with text + icon + status strip |
| completed/cancelled | Removed from both banners; retained in history |
| long title/plate/document | Wraps without clipping or horizontal overflow |
| 320/375/768/desktop | No page/drawer horizontal overflow; all actions reachable |
| keyboard | Logical tab order, visible focus, Escape close, focus restored |
| loading/error/retry | Stable layout, specific recovery text, no false empty state |
| create/edit/complete/cancel | Pending guard, success announcement, both surfaces refresh |

## Implementation cautions

- Existing desktop truck/trailer rows are already keyboard-operable but mobile
  cards are clickable `div`s. The schedule trigger must be a nested real button
  with stopped propagation; do not expand that existing accessibility debt in
  this feature.
- The shared dismissible banner defaults to sticky and persists dismissal.
  Explicitly opt out for schedule reminders.
- Keep the existing vehicle detail modal and CRUD forms separate from schedule
  authority; opening schedule management must not change vehicle edit state.
- Direct imports and one shared active-reminders query avoid duplicate
  requests/re-render waterfalls. Derive count maps with `useMemo` keyed by the
  composite component/id string.

Status: DONE
Summary: Responsive, role-scoped implementation design completed for tractor and trailer schedule banners, badges, and plate-scoped management workflow.
Concerns/Blockers: Existing mobile fleet cards are non-semantic clickable divs; keep new schedule controls semantic and isolated.
