# Approval Queue Inventory

_Phase 0 deliverable for the "Cần duyệt" dashboard card. Generated 2026-06-03._

## Summary

- **Total distinct approval flows mapped: 4** (counting the two-stage advance settlement as one flow with two queue entries by stage, so 5 queue-row variants).
- **Roles that approve:** `ADMIN`, `MANAGER`, `ACCOUNTANT` (only for settlement checking).
- **Roles that only request:** `FORWARDER`, `DRIVER`.
- **Roles to filter out of the queue card:** `DRIVER`, `FORWARDER` — card should not render for them.

A generic helper already exists at `backend/src/services/approval.service.ts` (`transitionApproval`) that handles the `trip_expenses` + `debt_offsets` PENDING→APPROVED/REJECTED transition and enforces MANAGER/ADMIN. Advance flows live in `backend/src/services/advance.service.ts` with their own approve/reject pairs and richer business logic (ledger posting, self-approval guard).

## Flows

### 1. Ancillary fees — Phí phụ trợ (forwarder-created trip expenses)

- **Backend table:** `trip_expenses` (`backend/src/db/schema.ts:484-504`)
- **Status column:** `approval_status varchar(20) NOT NULL DEFAULT 'APPROVED'`
  - **Important gotcha:** default is `APPROVED`, not `PENDING`. Only forwarder-created rows land in `PENDING` (the forwarder create path sets it explicitly). Accountant/manager-created rows skip the queue entirely.
- **Create endpoint:** `POST /api/v1/forwarder/trips/:tripId/expenses` (forwarder portal)
- **Approve endpoint:** `POST /api/v1/trips/:id/expenses/:eid/approve` (`backend/src/routes/trips.ts:320-322`) — `requireRoles(MANAGER, ADMIN)`; calls `transitionApproval({ table: 'trip_expenses', ... })`
- **Reject endpoint:** `POST /api/v1/trips/:id/expenses/:eid/reject` (same shape, reject path)
- **Approver roles:** `MANAGER`, `ADMIN`
- **Pending query shape:**
  ```sql
  SELECT te.id, te.trip_id, te.expense_type, te.buy_amount, te.sell_amount,
         te.forwarder_id, te.created_at,
         t.trip_code, fet.name AS expense_type_name, u.full_name AS requester_name
  FROM trip_expenses te
  JOIN trips t ON t.id = te.trip_id
  LEFT JOIN forwarder_expense_types fet ON fet.code = te.expense_type
  LEFT JOIN users u ON u.id = te.forwarder_id
  WHERE te.approval_status = 'PENDING'
  ORDER BY te.created_at ASC
  ```
- **Item card mapping:**
  - `id`: `ancillaryFees:<te.id>`
  - **title** pattern: `"Phí {fet.name} {fmtVND(buy_amount)} cho {t.trip_code}"` e.g. _"Phí Customs 5.000.000₫ cho TRP-202605-0003"_
  - **subtitle** pattern: `"{u.full_name} · {timeAgo(te.created_at)}"` e.g. _"Phan Kim Phụng · 2 giờ trước"_
  - **amount** source: `te.buy_amount` (use buy because that's what was actually paid out by the forwarder)
  - **requestedAt**: `te.created_at` (no separate `requestedAt` field exists)
  - **href** pattern: `/trips/:tripId#fees` — anchor matches the section id in `AncillaryFeesCard.tsx`
- **Notes:**
  - Single-tenant — no multi-tenant scoping concerns.
  - The generic `transitionApproval` enforces MANAGER/ADMIN in service; route also gates via `requireRoles`. Defense in depth.
  - `forwarderId` is nullable. When null, the row was created by accountant/manager so it'd already be APPROVED and won't appear in queue.

### 2. Debt offsets — Bù trừ công nợ

- **Backend table:** `debt_offsets` (`backend/src/db/schema.ts:337-352`)
- **Status column:** `approval_status varchar(20) NOT NULL DEFAULT 'PENDING'`
- **Create endpoint:** `POST /api/v1/finance/debt-offsets` (accountant creates)
- **Approve endpoint:** `POST /api/v1/finance/debt-offsets/:id/approve` (`backend/src/routes/financial.ts:320-324`) — `requireRoles(MANAGER, ADMIN)`; calls `approveDebtOffset(id, userId, role)` → uses `transitionApproval`
- **Reject endpoint:** assumed `POST /api/v1/finance/debt-offsets/:id/reject` (verify when wiring; same shape)
- **Approver roles:** `MANAGER`, `ADMIN`
- **Pending query shape:**
  ```sql
  SELECT do.id, do.customer_id, do.supplier_id, do.amount, do.offset_date, do.created_by, do.created_at,
         c.name AS customer_name, sp.name AS supplier_name, u.full_name AS requester_name
  FROM debt_offsets do
  JOIN customers c ON c.id = do.customer_id
  JOIN suppliers sp ON sp.id = do.supplier_id
  LEFT JOIN users u ON u.id = do.created_by
  WHERE do.approval_status = 'PENDING'
  ORDER BY do.created_at ASC
  ```
- **Item card mapping:**
  - `id`: `debtOffsets:<do.id>`
  - **title**: `"Bù trừ {fmtVND(amount)} giữa {customer_name} & {supplier_name}"`
  - **subtitle**: `"{requester_name ?? 'Không rõ'} · {timeAgo(created_at)}"`
  - **amount** source: `do.amount`
  - **requestedAt**: `do.created_at`
  - **href**: `/debt#offsets` — there's no per-offset deep link today, the modal opens from the offsets section. Acceptable for v1; jumping into the section is enough.
- **Notes:**
  - `createdBy` is nullable in schema — fall back to "Không rõ" when null.
  - No `updatedAt` on this table (a quirk the generic helper handles via conditional patch).

### 3. Advance requests — Tạm ứng

- **Backend table:** `advance_requests` (`backend/src/db/schema.ts:514-524`)
- **Status column:** `status advance_request_status NOT NULL DEFAULT 'PENDING'` (typed enum, not `approval_status`)
- **Create endpoint:** `POST /api/v1/forwarder/advance-requests` (`backend/src/routes/forwarder.ts:117`) — forwarder/driver creates
- **Approve endpoint:** `POST /api/v1/advance-requests/:id/approve` (`backend/src/routes/financial.ts:255-258`) — `requireRoles(MANAGER, ADMIN)`; calls `approveAdvanceRequest(id, userId)`
- **Reject endpoint:** `POST /api/v1/advance-requests/:id/reject` (`backend/src/routes/financial.ts:261`) — `requireRoles(MANAGER, ADMIN)`
- **Approver roles:** `MANAGER`, `ADMIN`
  - **Threshold rule:** _none_. The service has no threshold logic — it's all-or-nothing per role. Self-approval is blocked (`requesterId === approvedBy → 403`).
- **Pending query shape:**
  ```sql
  SELECT ar.id, ar.requester_id, ar.amount, ar.reason, ar.created_at,
         u.full_name AS requester_name
  FROM advance_requests ar
  JOIN users u ON u.id = ar.requester_id
  WHERE ar.status = 'PENDING'
  ORDER BY ar.created_at ASC
  ```
- **Item card mapping:**
  - `id`: `advances:<ar.id>`
  - **title**: `"Tạm ứng {fmtVND(amount)} — {truncate(reason, 40)}"`
  - **subtitle**: `"{requester_name} · {timeAgo(created_at)}"`
  - **amount** source: `ar.amount`
  - **requestedAt**: `ar.created_at`
  - **href**: `/admin/advances?focus=<ar.id>` — `AdminAdvancesPage` exists; use `?focus=` query param. If the page doesn't already read `focus`, add a small effect that scrolls/highlights the row (a small Phase-2 follow-up).
- **Notes:**
  - Approving fires a ledger entry (`FORWARDER_ADVANCE`). The queue card doesn't need to mention this.
  - When current user is the requester, exclude from queue (matches the service self-approval guard).

### 4. Advance settlements — Phiếu thanh toán tạm ứng

This is a **two-stage** approval. The queue must split it into two entries based on which stage the user can act on.

- **Backend table:** `advance_settlements` (`backend/src/db/schema.ts:526-539`)
- **Status enum:** `PENDING → CHECKED_BY_ACCOUNTANT → APPROVED` (`REJECTED` terminal)

#### 4a. Settlements needing accountant check (stage 1)
- **Status:** `'PENDING'`
- **Check endpoint:** `POST /api/v1/advance-settlements/:id/check` (`backend/src/routes/financial.ts:275`) — `requireRoles(ACCOUNTANT, ADMIN)`
- **Approver roles:** `ACCOUNTANT`, `ADMIN`
- **Pending query:**
  ```sql
  SELECT s.id, s.forwarder_id, s.total_expense_amount, s.refund_amount, s.created_at,
         u.full_name AS requester_name
  FROM advance_settlements s
  JOIN users u ON u.id = s.forwarder_id
  WHERE s.status = 'PENDING'
  ORDER BY s.created_at ASC
  ```
- **Item mapping:**
  - `id`: `advanceSettlementsCheck:<s.id>`
  - **title**: `"Kiểm tra phiếu thanh toán {fmtVND(total + refund)} — {requester_name}"`
  - **subtitle**: `"Chờ kế toán kiểm tra · {timeAgo(created_at)}"`
  - **amount**: `total_expense_amount + refund_amount`
  - **href**: `/admin/settlements?focus=<s.id>`

#### 4b. Settlements needing manager approval (stage 2)
- **Status:** `'CHECKED_BY_ACCOUNTANT'`
- **Approve endpoint:** `POST /api/v1/advance-settlements/:id/approve` (`backend/src/routes/financial.ts:281`) — `requireRoles(MANAGER, ADMIN)`
- **Reject endpoint:** `POST /api/v1/advance-settlements/:id/reject` (`backend/src/routes/financial.ts:287`) — `requireRoles(MANAGER, ADMIN)` (covers both PENDING and CHECKED_BY_ACCOUNTANT)
- **Approver roles:** `MANAGER`, `ADMIN`
- **Pending query:** same SELECT shape as 4a but `WHERE s.status = 'CHECKED_BY_ACCOUNTANT'`, ORDER BY `s.checked_at ASC`
- **Item mapping:**
  - `id`: `advanceSettlementsApprove:<s.id>`
  - **title**: `"Duyệt phiếu thanh toán {fmtVND(total + refund)} — {requester_name}"`
  - **subtitle**: `"Đã kiểm tra · chờ giám đốc duyệt · {timeAgo(checked_at)}"` (use `checked_at` since that's when it became actionable for managers)
  - **amount**: `total_expense_amount + refund_amount`
  - **href**: `/admin/settlements?focus=<s.id>`

- **Notes for 4a + 4b:**
  - Self-approval guard: `forwarderId === approvedBy → 403`. Exclude self from queue.
  - Approving fires a ledger entry (`FORWARDER_SETTLEMENT`).

## No additional approval flows found

Wildcard search covered:
- `requiresApproval / approverId / approvedBy / approvedAt / awaitingApproval / needsApproval / approval_status / rejectedBy / rejected_at / rejection_reason`
- Trip lock, penalty deduction, review_request patterns

Every `approvedBy/approvedAt` hit traces back to one of the four flows above. **`PENDING_APPROVAL` (exact string) returns zero matches** in this codebase — the actual values to filter on are `'PENDING'` and (for stage 2 settlements) `'CHECKED_BY_ACCOUNTANT'`. The QA brief used `PENDING_APPROVAL` as shorthand.

Penalty deductions, trip locks, review requests — no matches in current schema. Not in scope.

## Dashboard card slot

- **File to edit:** `frontend/src/pages/DashboardPage.tsx`
- **Insertion point:** right rail (`.wf-col` containing fleet / cost-donut / attention cards), **immediately above** the `wf-att` ("Cần chú ý") card. Both are decision/action queues; pairing them is thematically sound and matches existing right-rail density.
- **CSS approach:** use existing `.dash-wf > .wf-card > .wf-card-h` chrome for the header. Add scoped block class `.approval-queue` for row internals to avoid collisions with other `.wf-*` rules. Define styles in `frontend/src/pages/DashboardPage.css` (same file the existing wf-* classes live in). **No `!important`**. No inline `style={{}}` for rules that vary by state.
- **Header structure (matches existing cards):**
  ```jsx
  <div className="wf-card-h">
    <div>
      <div className="ttl">Cần duyệt</div>
      <div className="sub">{count > 0 ? `${count} mục đang chờ` : 'Đã xử lý hết'}</div>
    </div>
    {count > 0 && <span className="approval-queue__count">{count}</span>}
  </div>
  ```
  Picked scoped `.approval-queue__count` because no existing `wf-card-h__count` class exists in the codebase (despite what the brief suggested).
- **Data hook:** **new** `frontend/src/features/dashboard/hooks/useApprovalQueue.ts` rather than extending `useDashboardData`. Reasons:
  - `useDashboardData` is month-scoped (`currentMonth`, `currentYear`); the approval queue is global pending state, not month-scoped — extending would muddy the API.
  - Approval queue benefits from shorter `staleTime` (30s per brief) than dashboard aggregate (2-5 min).
  - Separate hook keeps role-based hiding trivial (`if (!shouldSeeQueue(role)) return { data: null }`).
- **Backend endpoint:** **new** `GET /api/v1/dashboard/approval-queue` rather than extending the existing dashboard endpoint. Reasons:
  - Existing dashboard endpoint returns month-scoped financials; this returns user-specific pending lists.
  - Role-based response shape is fundamentally different — splitting keeps each endpoint cohesive and testable.
  - Independent staleness/polling cadence.
- **Empty-state SVG:** `frontend/public/assets/illustrations/empty-audit.svg` is the best thematic match (audit/approval). `empty-notifications.svg` is the runner-up. Reference path: `/assets/illustrations/empty-audit.svg`.
- **Density / gotchas:**
  - Right-rail cards keep header strip ≤56px; content uses 12px vertical rhythm.
  - Existing `wf-att` targets 5 rows max — match that density. If >5 items, group by type with subtle subhead, still cap visible at ~6 rows + "Xem tất cả" tail.
  - Mobile: at `<1180px` the grid collapses to single column — card stacks naturally between fleet and attention, no special handling.
  - Memory: "Global page title 22px 800w -0.02em" applies to page heads, not card titles — `.wf-card-h .ttl` is the right reference for the card title.

## Role-based filter rules

| Role         | Sees in queue                                                                                                |
|--------------|--------------------------------------------------------------------------------------------------------------|
| `ADMIN`      | All four flows: ancillary fees, debt offsets, advance requests, advance settlements (both stages)            |
| `MANAGER`    | Ancillary fees, debt offsets, advance requests, advance settlements (stage 2 only — `CHECKED_BY_ACCOUNTANT`) |
| `ACCOUNTANT` | Advance settlements (stage 1 only — `PENDING`) — that's their entire queue today                             |
| `DRIVER`     | Nothing — card should not render                                                                             |
| `FORWARDER`  | Nothing — card should not render                                                                             |

In all roles, **exclude rows where current user is the requester** (matches the service-level self-approval guards on advance flows).

## Open questions for the implementer

- `AdminAdvancesPage` / `AdminSettlementsPage` may not yet support `?focus=<id>` to scroll/highlight a row. Add that small affordance as part of Phase 2 so queue navigations land on the relevant row. Acceptable fallback for v1: just navigate to the list page without focus.
- The brief mentions `severity: 'urgent'` for items >7 days old. Apply uniformly across all 4 flows using `created_at` (or `checked_at` for stage 2 settlements). 1-7 days = `normal`, >7 days = `urgent`. No `warn` middle tier unless we see a need.
- Reject endpoint for debt offsets is implied but I didn't verify the route file line that defines it — confirm exists when wiring (not blocking inventory).
- API mount prefix: project CLAUDE.md says `/api/v1`. Audit-event registrations in `financial.ts:30-35` use `/api/...` (no `v1`). Both conventions appear in the codebase. Confirm with the actual `app.use(...)` mount in `backend/src/index.ts` when adding the new endpoint. The audit registrations are pattern strings for the audit registry, not the mount path.
