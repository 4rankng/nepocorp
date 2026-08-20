# Ops Period Filters and Carry-Forward Settlement Fix

**Date**: 2026-08-20
**Severity**: High
**Component**: Ops trips, advances, expenses, fuel allocation, settlements
**Status**: Resolved

## Customer Requests

Ops needed monthly lists to stay separated, expense summaries/exports to follow the selected month, trip detail/edit screens to return to the filtered list, fuel allocations to show three accounting rows, and settlement surplus to remain an Ops advance rather than return to the company.

## Durable Decisions

- The shared calendar-month range is passed to Ops trip, advance, and settlement queries. Free-text trip search may intentionally broaden the trip list, while the selected month remains the default operational scope.
- Expense transport uses the backend contract `fromDate`/`toDate`; the current filtered monthly result is also the source for expense export and summary values.
- Trip list filter state is carried through detail and edit navigation so returning does not reset the operator's working month/search/filter context.
- Fuel allocation presents fixed Petro, Long Hưng, and Cây ngoài rows while preserving unknown legacy supplier rows during normalization. Existing stored data is not discarded.
- On approval, a positive settlement surplus is posted as an approved `Ops tạm ứng chuyển kỳ sau` request with a matching immutable `FORWARDER_ADVANCE` ledger entry. It is not treated as a company refund. Previously approved historical settlements are not bulk-rewritten without an explicit settlement code and reconciliation decision.

## Root Cause

The affected screens had independent or missing date propagation, the expense client used page terminology instead of the API boundary names, navigation discarded list state, fuel normalization only understood legacy/custom rows, and settlement surplus still represented the old reimbursement direction instead of a carry-forward advance.

## Validation

- Backend TypeScript and frontend TypeScript builds pass.
- Frontend Vitest suite passes: 66 files, 277 tests.
- Focused backend export tests pass.
- Calendar-period regression covers July/August/September boundaries for advances and settlements.
- Settlement workflow regression verifies the carry-forward request, outstanding balance, eligibility for the next settlement, ledger credit, and idempotent approval.
- Fuel normalization regression verifies the three fixed rows and preservation of an unknown legacy supplier.
- Expense query regression verifies `fromDate`/`toDate` serialization.

## Follow-up

For an already approved historical settlement shown in customer screenshots, reconcile by its exact settlement code before creating any financial carry-forward entry. No production deployment or historical data mutation is included in this change.

Status: DONE
Summary: Documented the customer-requested period filtering, navigation, fuel-row compatibility, expense export contract, and Ops carry-forward settlement behavior.
Evidence: `backend/src/tests/advance-period-filter.test.ts`, `backend/src/tests/forwarder-settlement-workflow.test.ts`, `frontend/src/components/trip/FuelAllocationEditor.test.ts`, `frontend/src/features/expenses/expense-list-query.test.ts`; TypeScript checks, focused export test, and frontend Vitest suite passed.
Concerns/Blockers: Historical approved settlements require explicit code-level reconciliation; they are intentionally not bulk-migrated.
