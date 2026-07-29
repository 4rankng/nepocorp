# Advance Settlement Reimbursement Bug Fix

**Date**: 2026-07-29 17:06
**Severity**: High
**Component**: Advance settlements, export, ledger
**Status**: Resolved

## What Happened

The screenshot symptom was blunt: the settlement summary/print view showed the cash direction as if it were always a forwarder refund, even when the case was actually company reimbursement. That made the browser output look balanced only by accident, while the underlying model still had no clean way to say "the company owes more" versus "the forwarder owes back."

## The Brutal Truth

We collapsed two different accounting directions into one field and then acted surprised when the UI lied. That is a bad model, full stop. It was maddening because the browser exposed the problem immediately, but the real fix lived in the data contract, not in another label tweak.

## Technical Details

- `advance_settlements` now persists mutually exclusive `refundAmount` and `reimbursementAmount` fields.
- The validator rejects rows where both sides are positive and enforces the balance rule: `advance + reimbursement = expense + refund`.
- Create ignores client-supplied `totalExpenseAmount` and always derives the persisted total from validated linked expenses, including zero.
- Approval and export code now use the same invariant, and approval still clears the original linked advances before writing the immutable settlement ledger row.
- The follow-through from review mattered: approval notifications now name the cash direction instead of pretending every case is just total expense, and the print/XLSX paths use the role-correct GET endpoints so previews and exports cannot drift from the same balance check.
- The TDD case is exact: `50,000,000` advance against `55,513,200` expense with `5,513,200` reimbursement. That must render and approve as `Công ty hoàn thêm`, not `Hoàn lại`.
- Browser coverage was checked in the responsive settlement screens on desktop and mobile, and the dedicated backend/frontend regressions now carry this reimbursement case at the suite level instead of leaving it as a one-off browser observation.
- The unrelated vehicle-schedules UI contract baseline is separate and should not be read as part of this settlement fix.

## What We Tried

- Infer the direction from the final delta in the UI. Rejected, because it keeps the model ambiguous and lets the browser and export path drift again.
- Reuse `refundAmount` for both cases. Rejected, because that reintroduces the same lie under a different name.
- Persist a distinct reimbursement field and make the invariant explicit. That was the only durable option.

## Root Cause Analysis

The root cause was a bad domain shortcut: we treated reimbursement as a variant of refund instead of a separate cash direction. That broke the contract between form, persistence, export, and ledger posting. Once the model was wrong, every downstream renderer inherited the wrong assumption.

## Lessons Learned

- If two business directions are not interchangeable, they do not belong in one field.
- Balance checks must live beside persistence, not only in the UI.
- Settlement changes need model-first regression cases, especially when the browser screenshot looks "almost right."

## Next Steps

- Keep the reimbursement regression test in the backend suite.
- Keep the responsive browser check for the settlement screens on both desktop and mobile.
- Treat any future settlement math change as a schema and invariant change first, UI change second.
