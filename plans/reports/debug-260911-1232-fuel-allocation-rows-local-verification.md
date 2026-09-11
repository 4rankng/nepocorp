# Investigation Report — "Phân bổ nơi đổ dầu" missing rows (customer re-report, 2026-09-11)

**Trigger:** Customer re-reported the "Phân bổ nơi đổ dầu" section showing only "Cây dầu ngoài" (no Petrolimex / Long Hưng). Same symptom as BUG-REG-001, fixed 2026-09-07 (`4ec93de9` + `0ced9a90`). User ask: replicate in local dev; close the case if clean.

## Verdict: NOT A LOCAL REGRESSION — CASE CLOSED

Every layer verified healthy in local dev:

| Layer | Check | Result |
|---|---|---|
| DB (`tingting` @ :5440) | `suppliers WHERE status='ACTIVE' AND is_fuel_supplier` | ✅ Petrolimex (id 10), Long Hưng (id 11) — both ACTIVE |
| API | `GET /api/catalogs/bootstrap` (admin JWT) | ✅ 27 suppliers, both fuel suppliers present with `status: ACTIVE, isFuelSupplier: true` |
| Code | `FuelAllocationEditor.tsx` normalize effect + `fuelAllocationRows.ts` | ✅ both fixes in tree (`rowKeys` dep + reseed-site normalize) |
| UI — edit flow | `/trips/304/edit` (IN_TRANSIT, no saved allocations) | ✅ 3 rows: Petrolimex / Long Hưng / Cây dầu ngoài |
| UI — edit + saved data | `/trips/297/edit` (COMPLETED, 96 l saved at Petrolimex) | ✅ 3 rows, saved 96 l merged into Petrolimex row — the exact customer scenario (reseed-merge path) |
| UI — create flow | `/trips/new`, fuel accordion expanded | ✅ 3 rows in DOM |

Evidence: `/tmp/fuel-rows-verified.png`, `/tmp/fuel-create-verified.png` (session closed after verification).

## Why the customer still sees it

The fix (`4ec93de9`, Sep 7) is **committed but not deployed**: demo image was built 2026-09-03
(`9123b6c1`), prod image 2026-08-22 — both predate the fix. CI auto-deploy was removed Sep 3
(`2371af3f`); deploys are manual (`make demo` / `make deploy`). Until deployed, demo/prod run the
buggy bundle and the customer will keep seeing the symptom — a deploy decision for the user, not a
code problem.

## Side findings (no action needed beyond what was done)

1. **Local admin password reverted to seed default.** `admin/admin123` (seed default from
   `backend/src/seed.ts`) — the 09-07 `Abc123` reset didn't survive a local DB reseed. Abc123 works
   on demo only. Canonical table: `testplan/testaccounts.txt` (new, uncommitted, per user request).
2. **UI automation gotcha (not a bug):** the create wizard's accordion ignores synthetic clicks that
   don't scroll-into-view first — `scrollIntoView({block:'center'})` + JS click works (consistent with
   the 09-07 UI test recipe).

## Unresolved questions

- None for the investigation. Open decision for the user: **deploy** the Sep-7 fix (`make demo` and/or
  `make deploy`) so the customer stops seeing the missing rows.
