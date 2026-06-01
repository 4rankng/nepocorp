# Implement Forwarder (Nhân viên giao nhận) Role

This document outlines the plan to implement the `FORWARDER` role, allowing them to manage container/seal numbers, input trip-related operational expenses, and manage advance payments (tạm ứng / hoàn ứng) while restricting their access to sensitive financial information like freight rates and profits.

## User Review Required

> [!WARNING]
> **Database Schema Changes**
> We will be adding several new tables to track containers, forwarder expenses, advance requests, and settlements. This will require a database migration (`drizzle-kit generate` and `migrate`). 

> [!IMPORTANT]
> **Ledger Integration**
> We need to align on how advance payments affect the ledger. Usually:
> 1. Director approves advance payment -> Debit Company Cash, Credit Forwarder Liability (or similar).
> 2. Director approves settlement -> Reconcile the advance against actual expenses. The actual expenses might become Company Expenses (Vendor Expenses or Cost of Goods Sold).

## Open Questions

> [!CAUTION]
> Please clarify the following business rules before we proceed:
> 1. **Ledger impact**: Should "Advance Requests" (Tạm ứng) and "Trip Expenses" (Chi phí giao nhận) be recorded in the immutable `ledger` table upon Director approval? If yes, should the entity be the Forwarder (Driver-like) or the Company?
> 2. **Trip Expenses connection to Settlements**: Can one Settlement (Thanh toán tạm ứng) cover multiple trips and multiple expenses, or is it strictly 1 Settlement per 1 Advance Request? 
> 3. **Expense Types**: Are there any additional predefined expense types besides Nâng hạ, Làm tờ khai, Cân hàng, Kiểm hoá?

## Proposed Changes

---

### Shared Library & Enums

#### [MODIFY] [shared/src/constants/index.ts](file:///Users/dev/Documents/projects/nepocorp/shared/src/constants/index.ts)
- Add `FORWARDER` to `Role` enum.
- Add label for `FORWARDER` in `ROLE_LABELS` ('Nhân viên giao nhận').
- Add `ForwarderExpenseType` enum (`LIFTING`, `CUSTOMS`, `WEIGHING`, `INSPECTION`, `OTHER`).
- Add `AdvanceRequestStatus` enum (`PENDING`, `APPROVED`, `REJECTED`).
- Add `AdvanceSettlementStatus` enum (`PENDING`, `CHECKED_BY_ACCOUNTANT`, `APPROVED`, `REJECTED`).

#### [MODIFY] Types & Schemas
- Define Zod schemas and TypeScript interfaces for the new entities: `TripContainer`, `TripExpense`, `AdvanceRequest`, `AdvanceSettlement`.

---

### Backend (Database & API)

#### [MODIFY] [backend/src/db/schema.ts](file:///Users/dev/Documents/projects/nepocorp/backend/src/db/schema.ts)
- Add `roleEnum` update to include `FORWARDER`.
- **[NEW TABLE]** `trip_containers`: `id`, `trip_id`, `container_number`, `seal_number`, `notes`, timestamps.
- **[NEW TABLE]** `trip_expenses`: `id`, `trip_id`, `forwarder_id`, `expense_type`, `amount`, `note`, timestamps.
- **[NEW TABLE]** `advance_requests`: `id`, `requester_id` (User ID), `amount`, `reason`, `status`, `approved_by`, `approved_at`, timestamps.
- **[NEW TABLE]** `advance_settlements`: `id`, `advance_request_id`, `total_expense_amount`, `refund_amount`, `status`, `checked_by`, `approved_by`, timestamps.

#### [MODIFY] [backend/src/casbin/policy.csv](file:///Users/dev/Documents/projects/nepocorp/backend/src/casbin/policy.csv)
- Add RBAC rules for `FORWARDER`:
  - `p, FORWARDER, trips, read`
  - `p, FORWARDER, forwarder_portal, read`
  - `p, FORWARDER, forwarder_portal, write`

#### [NEW] [backend/src/routes/forwarder.ts](file:///Users/dev/Documents/projects/nepocorp/backend/src/routes/forwarder.ts)
- Implement endpoints for the forwarder operations:
  - `GET /api/forwarder/trips`: Returns trips assigned to/visible to the forwarder, **excluding** all financial fields (`revenue`, `grossProfit`, `driverSalary`, etc.).
  - `POST /api/forwarder/trips/:id/containers`: Manage cont/seal numbers.
  - `POST /api/forwarder/trips/:id/expenses`: Submit lifting/customs fees.
  - `POST /api/forwarder/advance-requests`: Create advance request.
  - `POST /api/forwarder/advance-settlements`: Create settlement request linking previously submitted expenses.

#### [MODIFY] Backend Approvals (Manager/Accountant APIs)
- Add routes for Accountant to mark settlements as `CHECKED_BY_ACCOUNTANT`.
- Add routes for Director/Manager to approve/reject `advance-requests` and `advance-settlements`.
- Implement corresponding ledger logic on approval (pending answers to Open Questions).

---

### Frontend (UI & Pages)

#### [MODIFY] [frontend/src/components/Layout.tsx](file:///Users/dev/Documents/projects/nepocorp/frontend/src/components/Layout.tsx)
- Update Sidebar navigation. If role is `FORWARDER`, show menus for: "Chuyến hàng" (Trips), "Tạm ứng" (Advance Payments).

#### [NEW] Forwarder Trip Pages
- Create `ForwarderTripList.tsx` and `ForwarderTripDetail.tsx`.
- **Trip Detail View**: Read-only trip info, plus forms to add `Số Cont / Số Seal` and `Chi phí phát sinh` (Expenses).

#### [NEW] Advance Payment Pages
- **`AdvanceRequestForm.tsx`**: UI to create advance request (Amount, Reason).
- **`AdvanceSettlementForm.tsx`**: UI to create settlement. It will allow the forwarder to select the Advance Request and link multiple `trip_expenses` to show how the money was spent.

#### [MODIFY] Management/Accountant Views
- Add a new "Duyệt Tạm Ứng" (Advance Approvals) page for Directors/Accountants to review pending requests and settlements.

## Verification Plan

### Automated Tests
- n/a (No automated test suite for this scope described, but will ensure type checks and linting pass if available).

### Manual Verification
1. **Forwarder Restriction**: Log in as Forwarder. Verify trip list loads successfully but `revenue`, `costs`, and `profit` are hidden from the UI and the network payload.
2. **Container/Seal Entry**: As a Forwarder, add container and seal numbers to a trip.
3. **Expense Entry**: Add lifting/customs fees to a trip.
4. **Advance Request Flow**: 
   - Forwarder creates Advance Request.
   - Director logs in and Approves.
5. **Settlement Flow**:
   - Forwarder submits Settlement based on expenses.
   - Accountant logs in and Checks.
   - Director logs in and Approves.
