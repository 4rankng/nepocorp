---
phase: 3
title: Migration integration and QA
status: completed
effort: medium
---

# Phase 3: Migration integration and QA

## Overview

Converge the two legacy reminder sources into the new operational authority,
preserve compatibility, update domain docs, and complete release-grade QA.

## Implementation Steps

1. **Red — migration/backfill invariants**
   - Test repeated backfill execution, same numeric ID across component types,
     legacy dates with nulls, multiple renewable expenses, and later-valid
     expense precedence.
2. **Green — idempotent backfill**
   - Backfill the three legacy truck dates (inspection, insurance, oil service)
     into component-aware schedules with stable source keys.
   - Backfill latest renewable `validTo` for inspection/insurance/road-fee
     categories for both trucks and trailers when no equivalent schedule
     exists. Treat expenses as financial evidence, not the ongoing operational
     authority.
   - Ensure reruns cannot duplicate rows; log/skips must be inspectable.
3. **Compatibility projection**
   - Preserve `/driver/me/vehicle-alerts` behavior without expanding the new UI
     to drivers. Either read legacy-compatible categories from schedules or
     transactionally project schedule changes to the three legacy truck fields.
   - Remove the legacy date inputs from the Fleet truck form once the schedule
     editor is available, so users cannot write two truths.
   - Keep the finance renewal report available for accounting evidence, but do
     not merge it into the new Dashboard/Đội xe banner after backfill.
4. **Documentation**
   - Update `CONTEXT.md` and Fleet/expense flow docs with the authority boundary,
     supported roles/surfaces, time semantics, and explicit exclusions.
5. **QA and review**
   - Run focused red→green tests, full backend tests, full frontend tests,
     TypeScript/build, migration dry-run on a disposable database,
     `git diff --check`, and adversarial review.
   - Capture desktop/tablet/375/320 evidence for both pages and long-content,
     empty, due, overdue, and completed states.

## Success Criteria

- [ ] Backfill is idempotent and resolves both vehicle component types safely.
- [ ] Existing driver alert behavior has no regression.
- [ ] Operational banners read only the new schedule authority.
- [ ] Financial expense history/reporting remains unchanged.
- [ ] Docs describe the implemented authority and scope accurately.
- [ ] All required automated and responsive gates pass with evidence.

## Rollback

- UI/API can be disabled while leaving the additive table intact.
- Revert application reads to legacy sources before dropping any new data.
- The first release must not drop legacy truck columns; removal requires a
  later migration after production parity is proven.
