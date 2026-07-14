# Curriculum research: comprehensive role onboarding

## Recommendation in one sentence

Replace the current generic four-item checklists with a small role curriculum: five activation outcomes for MANAGER, five for ACCOUNTANT, and three governance outcomes for ADMIN. Keep the wider product as an on-demand help library, not as required onboarding.

## Evidence reviewed

Primary product and domain sources:

- `README.md` and `CONTEXT.md`
- `shared/src/onboarding/tasks.ts`, `shared/src/onboarding/events.ts`
- `shared/src/tours/catalog.ts`, `shared/src/tours/schema.ts`
- `frontend/src/components/onboarding/OnboardingChecklist.tsx`
- `frontend/src/components/Layout.tsx`
- Flow guides `00-OVERVIEW_VA_PHAN_QUYEN.md`, `01-TRIP_LIFECYCLE.md`, `03-DASHBOARD_VA_BAO_CAO.md`, `04-CONG_NO_VA_THANH_TOAN.md`, `07-DOI_XE_VA_FLEET.md`, `09-CAU_HINH_HE_THONG.md`, and `10-QUAN_TRI_HE_THONG.md`

Supporting implementation checks were made against the product-event emitters, page routes, and current permission gates. These checks matter because several written role matrices conflict with one another.

## Current-state inventory and gaps

### Checklist coverage

| Role | Current tasks | Guided tasks | Main problem |
|---|---:|---:|---|
| MANAGER | 4 | 2 | Two items are page visits; the lock tour combines two separate jobs (locking and payment). |
| ACCOUNTANT | 4 | 2 | Matches the screenshot: only “Khóa chuyến đầu tiên” and “Nhập định mức nhiên liệu” have a `tourId`. More seriously, two tasks are currently unreachable. |
| ADMIN | 0 | 0 | ADMIN can run all three catalog tours but has no checklist at all. |

The current catalog has only three tours:

1. `create-trip`: a good single-job pattern, with its final step waiting for `trip.created`.
2. `lock-trip-and-payment`: crosses two pages and two distinct business outcomes. It has no action-waiting step, so finishing the tour is not proof that either action happened.
3. `fuel-config`: focused and has stable spotlight targets, but its final step does not wait for `config.fuel_saved`; only the checklist separately listens for that event.

### Completion-integrity defects

- `accountant-visit-dashboard` waits for `accounting.dashboard_viewed`, but no production page emits that event. `DashboardPage` emits only `fleet.dashboard_viewed`. The accountant item therefore cannot complete.
- `accountant-lock-first-trip` waits for `trip.locked`, but the current trip-detail permission calculation exposes locking only to MANAGER/ADMIN. This agrees with `01-TRIP_LIFECYCLE.md` and conflicts with the broader statement in `CONTEXT.md` that ACCOUNTANT can trigger all transitions. Until policy is resolved, locking must not be an accountant activation requirement.
- `trip.completed` is declared in the event catalog but has no production emitter.
- The accountant payment action has a real, correctly placed success event (`receivable.payment_recorded`) but no tour. This is the clearest gap represented by the screenshot.
- `Layout.tsx` presents essentially the same broad navigation to all three office roles even though their responsibilities and write permissions differ. The onboarding curriculum therefore has to do the role filtering that the navigation does not.

### What the documented workflows say is essential

- The trip lifecycle is the operational spine: create, dispatch, complete/finalize figures, and lock (`CONTEXT.md`; flow 01).
- MANAGER owns trip creation/dispatch/locking and uses dashboard, fleet status, and P&L for decisions (flows 01, 03, 07).
- ACCOUNTANT's distinctive activation work is entering/verifying trip financial figures, maintaining fuel inputs, monitoring receivables, recording payments, and reading P&L (domain context; flows 01, 03, 04, 09).
- ADMIN is described in `CONTEXT.md` as developer/support rather than a business operator. Its core curriculum should therefore cover readiness, access, and auditability—not repeat the manager's trip workflow (flows 09 and 10).

## Curriculum design model

### Checklist rules

- Show only core activation outcomes: ideally 3–5 per role. Do not turn every sidebar item into a requirement.
- Except for one orientation item per role, complete tasks only from a successful real action event—not from viewing a tooltip or manually advancing a tour.
- A tour should teach one coherent job. Split “chốt chuyến” and “ghi nhận thanh toán.”
- Use a 3–6 step shape: navigate, explain the decision, focus the necessary fields, submit, then wait for the success event.
- Keep manual “Tôi đã làm xong” as an accessibility/recovery fallback, but record it separately from verified action completion.
- Put advanced and infrequent capabilities in the on-demand “Hướng dẫn nhanh” catalog rather than the activation checklist.

### Recommended content fields

The current task shape (`id`, `title`, `role`, one `completionEvent`, optional `tourId`, order) is too small for prerequisite-aware onboarding. Add curriculum metadata conceptually equivalent to:

- `objective`: the skill/outcome the task teaches.
- `completion`: primary success event, optionally `anyOf` alternatives for already-configured installations.
- `prerequisites`: machine-checkable state, not prose only.
- `blockedMessageVi` and `blockedCta`: explain the real upstream dependency and who can resolve it.
- `availability`: always, only when data exists, or only when setup is missing.
- `tier`: `core` checklist versus `reference` on-demand guide.
- `version`: per-role curriculum version so corrected tasks do not inherit misleading old progress.

Preflight checks should run before a mutating tour. If required data is absent, the tour should stop before the form, show the missing dependency, and offer a real route or responsible role. It must never create sample customers, trips, users, payments, or configuration values.

## Recommended MANAGER curriculum

| # | Vietnamese task title | Tour objective | Completion event | Prerequisite and empty-data handling |
|---:|---|---|---|---|
| 1 | **Đọc tổng quan vận hành tháng này** | Explain the current-period KPIs, action queue, receivables signal, and links into trips/fleet. | Proposed `manager.dashboard_viewed` after dashboard data successfully loads. Page-ready is acceptable for this single orientation task. | No data required. When empty, explain what will populate each area instead of inventing values. |
| 2 | **Tạo chuyến vận chuyển đầu tiên** | Select the valid customer/route and dispatch mode, understand auto-filled pricing, and create a real CREATED trip. Reuse and tighten `create-trip`. | Existing `trip.created`. | Preflight the options required by the actual form (and OWN versus EXTERNAL mode). If missing, link to the relevant catalog or ask ADMIN to prepare it; leave task pending. |
| 3 | **Cho chuyến đầu tiên khởi hành** | Find a CREATED trip in Điều vận, verify truck/driver assignment, and dispatch it. New `dispatch-trip` tour. | Proposed `trip.dispatched`, emitted only after successful dispatch. | Needs a CREATED trip with valid assignment. Empty queue points back to task 2; invalid fleet data points to Đội xe/configuration. |
| 4 | **Kiểm tra và khóa một chuyến hoàn thành** | Review final revenue/cost/photo requirements and lock a COMPLETED trip. New focused `lock-trip` tour; remove payment steps. | Existing `trip.locked`; also use it on the final tour step. | Needs a COMPLETED trip with required final data and photo evidence. If none exists, explain the lifecycle state needed and link to the trip list. Do not suggest bypassing requirements. |
| 5 | **Đọc báo cáo lãi lỗ theo kỳ** | Choose a period and interpret revenue ex-VAT, costs incl-VAT, gross/net profit, and the per-truck breakdown. New `review-pnl` tour. | Proposed `finance.report_viewed` after a report request succeeds (optionally require a period selection). | A zero-data period is a valid report state and may complete the orientation; the tour must explain why values are zero and what trip state feeds the report. |

This set covers the manager's activation loop—observe, create, dispatch, close, review—without adding separate fleet CRUD, penalties, salaries, profit distribution, or every report.

## Recommended ACCOUNTANT curriculum

| # | Vietnamese task title | Tour objective | Completion event | Prerequisite and empty-data handling |
|---:|---|---|---|---|
| 1 | **Xem công nợ và việc kế toán cần xử lý** | Orient the accountant to dashboard financial signals and the receivables aging view. New `accounting-overview` tour. | Fix and use existing `accounting.dashboard_viewed`, emitted only after the role dashboard data loads. | No data required. Empty aging buckets should be explained as a valid state. |
| 2 | **Hoàn thiện số liệu tài chính một chuyến** | Open an IN_TRANSIT/COMPLETED trip, verify fuel/actual price, road money, tickets and other permitted figures, then save. New `update-trip-figures` tour. | Proposed `trip.figures_saved`, emitted after the actuals API succeeds. | Needs an editable IN_TRANSIT or COMPLETED trip. If none exists, identify that a MANAGER must create/dispatch one; do not substitute a fake trip. |
| 3 | **Ghi nhận thanh toán khách hàng đầu tiên** | Read FIFO suggestions, enter the receipt code and amounts, then post a real receipt. New `record-receivable-payment` tour. | Existing `receivable.payment_recorded`; use it on the final tour step. | Needs a customer with open receivable trips. If none exists, explain that no payment should be entered and link to the debt list; task remains pending until real debt exists. |
| 4 | **Đối chiếu báo cáo lãi lỗ theo kỳ** | Select a period, trace the major revenue/cost lines and understand the VAT convention and per-truck totals. Reuse role-adjusted `review-pnl`. | Proposed `finance.report_viewed` (or a more explicit `finance.period_reviewed`). | Zero data is valid. Explain source states and do not require changing financial records. |
| 5 | **Cập nhật định mức và đơn giá nhiên liệu** | Keep the existing `fuel-config` tour, clarify the difference between norms, supplement, configured price, history, and per-trip actual price. | Existing `config.fuel_saved`; attach it to the tour's final step. | Preload current values. Never propose example values as values to save. If ACCOUNTANT is meant to be read-only, replace this with **Kiểm tra đơn giá nhiên liệu hiện hành** and a non-mutating `config.fuel_viewed` event. |

Remove **Khóa chuyến đầu tiên** from the accountant checklist unless the product owner explicitly restores ACCOUNTANT lock permission and the UI/API are changed consistently. The accountant instead needs the currently missing “save final figures” activation outcome.

## Recommended ADMIN curriculum

| # | Vietnamese task title | Tour objective | Completion event | Prerequisite and empty-data handling |
|---:|---|---|---|---|
| 1 | **Kiểm tra dữ liệu nền sẵn sàng vận hành** | Explain the documented dependency order across customers, routes, fleet/drivers, pricing, fuel, and road allowances; report what is missing. New `system-readiness` tour/check. | Proposed `config.readiness_checked` after a real read-only readiness check completes. | No seed data. Missing catalogs are the expected output and should link to the exact configuration page. |
| 2 | **Kiểm tra tài khoản và phân quyền** | Review office/driver accounts, roles, status, and safe deactivation/reset behavior. New `manage-users` tour. | Proposed `users.permissions_reviewed`; if no non-admin account exists, an explicitly conditional task may instead complete on `user.created`. | Do not force creation of an unnecessary or fake user. The content model needs the conditional alternative. |
| 3 | **Kiểm tra nhật ký người dùng** | Filter audit events by trip/config/finance and verify that a real recent action is traceable. New `review-audit-log` tour. | Proposed `audit.filter_applied` or `audit.event_opened`. | Empty audit history is valid but should not pretend auditability was verified; explain that events appear after real mutations. |

ADMIN intentionally gets only three core tasks. Creating trips, taking payments, monitoring fleet performance, chatbot monitoring, and AI-provider setup are either business-role work or specialist support references, not universal admin activation.

## Tour catalog changes implied by the curriculum

- Keep and refine: `create-trip`, `fuel-config`.
- Split and retire: `lock-trip-and-payment` → `lock-trip` + `record-receivable-payment`.
- Add: `manager-dashboard-overview`, `dispatch-trip`, `review-pnl`, `accounting-overview`, `update-trip-figures`, `system-readiness`, `manage-users`, `review-audit-log`.
- Use role-specific wording/steps even when two roles share a page. A manager reviews/locks; an accountant verifies allowed figures and payments.
- Add the action completion event to the last actionable step of every mutation tour, not only to the checklist task.

## Explicitly out of scope for core onboarding

- DRIVER and FORWARDER curricula. Their portals and workflows are distinct, and the requested evidence does not justify expanding them in this initiative.
- Exhaustive tours for all configuration cards, every sidebar destination, fleet/tires CRUD, penalties, salary periods, advances/settlements, accounts payable, debt adjustments/netting, profit distribution, chatbot monitoring, or AI-provider settings.
- Destructive/exception operations: cancellation, deletion, unlock/reversal, password resets, credit/debit adjustments, and concurrency recovery. These belong in reference guides or contextual help.
- Creating demo/sample records to unblock a tour.
- Replacing the detailed Vietnamese flow manuals and QA checklists. Onboarding should link to them for deeper reference, not reproduce them.

## Risks

1. **Role-policy drift:** `CONTEXT.md`, flows 00/01/09/10, navigation, and current UI gates disagree about ACCOUNTANT lock, fuel configuration, users, and audit access. A tour catalog cannot safely paper over these conflicts.
2. **Dead-end prerequisites:** action-based tasks can remain pending in a new/empty tenant. Preflight and honest blocked states are required.
3. **Unsafe activation incentives:** requiring a mutation can cause unnecessary users, payments, or config changes. Conditional/read-only completion is necessary for ADMIN and empty installations.
4. **Frontend-only event trust:** current completion events are emitted at UI success call sites. Actions made through another client will not complete the checklist, and a misplaced emitter could create false completion.
5. **Tour target fragility:** only the fuel tour currently has stable spotlight targets throughout. New tours need stable target IDs and target-missing telemetry.
6. **Curriculum overload:** expanding beyond the recommended 13 core outcomes will turn onboarding into documentation and reduce completion.
7. **Financial source ambiguity:** docs disagree on whether COMPLETED or LOCKED trips feed receivables/reporting. Tour wording must follow verified runtime behavior.

## Unresolved questions before implementation

1. Is ACCOUNTANT definitively allowed to lock trips? Current UI and flow 01 say no; `CONTEXT.md` says yes.
2. Is ACCOUNTANT allowed to save fuel configuration? The domain text and current page imply yes, while flow 09's role matrix says read-only.
3. Should ACCOUNTANT see `/audit-logs` and full `/users`? Current routes differ from parts of flows 00 and 10.
4. What exact state posts customer receivables and feeds P&L in production: COMPLETED or LOCKED?
5. Should existing users receive the new curriculum, or only users with no prior onboarding history? A per-role curriculum version/reset policy is needed.
6. Is a successfully loaded empty report sufficient to complete a report-orientation task, or should a non-empty period be required?
7. Who owns missing master data during a manager/accountant tour, and should the blocked CTA route to ADMIN configuration or only explain whom to contact?

## Acceptance criteria for the eventual implementation

- Every core task is reachable for its role under current UI/API permission checks.
- Every mutating task completes only after its success event; visiting or finishing tooltips does not complete it.
- Every tour has a preflight and a truthful empty-data path.
- The accountant can complete all tasks without creating or locking a trip.
- ADMIN is never asked to create fake users or business records.
- The catalog remains role-scoped; DRIVER/FORWARDER are unchanged.
- Focused tests prove event emission, prerequisite blocking, role visibility, and the split lock/payment tours.
