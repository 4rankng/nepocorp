# Brainstorm Summary — UI/UX Polish with Untitled UI PRO

- **Date:** 2026-10-10
- **Status:** Decision agreed, scope refinements pending final sign-off
- **Decision owner:** Product owner (user)
- **Advisor role:** CTO-level advisory — no implementation performed in this session

---

## 1. Problem statement

Request: *"polish UI UX with Untitled UI PRO — must use Untitled PRO, don't use free."*

The request as stated is a mood, not a specification. The NEPO / TransTing frontend is a
mature React 19 + Vite 6 + Tailwind v4 + daisyUI 5 application with 124 route pages,
three layers of hand-built UI primitives, ~38,500 lines of co-located CSS across 129 files,
and two enforced contracts (`check-ui-contract.mjs`, `check-brand-contract.mjs`).
Executing the request literally would mean importing a fourth UI system into a codebase
that already has a governing ADR restricting UI kits to reference-catalog use.

**True objective (as clarified):** deploy Untitled UI **PRO** material to improve real
user experience on high-pain surfaces, without destroying the existing design system,
brand contract, or accountant data density.

---

## 2. Constraints discovered (scout findings)

| Fact | Detail |
|---|---|
| Untitled UI in codebase | None — no `@untitledui/*`, no `components.json`, no UUI source |
| `@untitledui/react` on npm | **404** — UUI is source-distributed via its own CLI, not a public npm package |
| `untitledui` CLI | Installed, v0.1.69, `/opt/homebrew/bin/untitledui` |
| **PRO license** | **Confirmed present** in `~/.untitledui/config.json`. Searches return `PRO`-tagged application components and templates. Hard blocker cleared. (Credential value redacted; must never enter the repo.) |
| UUI MCP server | Not registered in `.mcp.json` or `opencode.jsonc` |
| Governing ADR | **0043 Accepted** — "Tailkit MCP is a reference catalog, **not a dependency**", after an audit where 23/30 NEPO primitives beat the kit's |
| Hard contracts | `check-ui-contract.mjs` bans `font-size: Npx` outside `styles/tokens.css`; `check-brand-contract.mjs` bans legacy "TingTing"/"NEPO Logistics" labels in scoped runtime files |
| Brand | TransTing, light-only. `--color-primary #005A2D`, `--color-accent #10B956`, daisyUI `nepo` theme, `d-` prefix |
| UI verification | Rung 0–3 claim ladder enforced; rung 3 requires screenshot + DOM assertion + DB proof + driver log **per claim** |

---

## 3. Approaches evaluated

### Option A — PRO as reference catalog (audit + retokenized copy-in)
Mirror ADR 0043. Audit every NEPO primitive against its UUI PRO nearest-neighbour. Keep
NEPO where it wins. Adopt PRO only where genuinely superior. Retokenize to `var(--*)`.

| Complexity | Cost | Latency | Maintainability | Regression risk |
|---|---|---|---|---|
| Medium | Low | Medium | High | Low |

**Second-order effects:** Audit is up-front work with no visible output. Team sees no
change for a while. Long-term this is the cheapest and safest.

### Option B — PRO as the component source (full adoption)
Install UUI via CLI/MCP, make it primary, migrate surfaces wholesale.

| Complexity | Cost | Latency | Maintainability | Regression risk |
|---|---|---|---|---|
| Very high | High | Slow | **Poor** | **Severe** (124 pages) |

**Second-order effects:** Fails `check-ui-contract` on first paste; introduces a fourth
parallel system; fights the TransTing emerald scale; invalidates ADR 0043 (needs a
superseding ADR); rung-3 evidence requirement across every touched page is days of QA.
**Rejected.** Over-engineering the request.

### Option C — Targeted PRO polish on high-traffic surfaces ✅ **SELECTED**
Use PRO material on a small set of surfaces with evidenced user pain, retokenized to NEPO
tokens. Contained, reversible, fast to evidence.

| Complexity | Cost | Latency | Maintainability | Regression risk |
|---|---|---|---|---|
| Low | Low | Fast | High | Low — contained |

**Second-order effects:** Touches the smallest blast radius. Still requires the retokenize
step on every landing. Leaves the existing system intact (ADR 0043 satisfied).

**Recommended and adopted: Option C.** Simplest viable option that still genuinely deploys
PRO material into the product. Grows into Option A's audit discipline naturally.

---

## 4. Scope refinement — the "all of them" correction

The user requested "all of them" (all three surface bundles + all four metrics). This was
challenged as containing a direct contradiction:

- **(b) information density** (accountant scans 200 rows without scrolling) is **actively
  opposed** to **(c) airy/modern/spacious** (Untitled UI PRO's default aesthetic).
- A single surface cannot be both denser and more spacious.

### Resolution adopted

**All four metrics are covered across the campaign — one job per surface.** Not all
metrics smeared on every surface. This is the only coherent reading.

| Surface | Non-blank LOC | Primary metric | UUI PRO material |
|---|---|---|---|
| `pages/DashboardPage.tsx` | 416 | **(c)** hierarchy + **(d)** states | `dashboards-02` template, KPI/metrics |
| `pages/TripListPage.tsx` | 578 | **(b)** density + **(d)** empty/error | application data table |
| `pages/TripEditPage.tsx` + `TripCreate` | 549 | **(a)** fewer clicks + **(d)** validation | form/input patterns |
| `pages/DebtDetailPage.tsx` | 538 | **(b)** density | compact table rows / settings |
| `pages/DebtListPage.tsx` | 501 | **(b)** density | compact table rows |
| `pages/PayableDetailPage.tsx` | 544 | **(b)** density | compact table rows |
| `pages/FinancePage.tsx` | 360 | **(b)** density | compact metrics + table |
| `pages/LoginPage.tsx` | 107 | **(c)** hierarchy | auth split-screen |
| `components/Layout.tsx` | 492 | **(c)** — **carved out, phase 3 only** | nav patterns |

**Total: ~4,085 non-blank lines across 9 files**, plus co-located CSS.

### Explicitly forbidden anti-pattern

Untitled UI PRO's spacious marketing defaults must **not** be applied to the four
accountant surfaces (`DebtDetail`, `DebtList`, `PayableDetail`, `Finance`). Those get
compact-density retokenized overrides, or they get no PRO material at all. **Density wins
there.** This is the single most likely way for this project to silently regress.

### Hard carve-outs (independent of "all of them")

- `frontend/src/styles/responsive.css` — **NOT TOUCHED.** 35 churn, global; one change
  regresses 124 pages and demands app-wide rung-3 evidence.
- `frontend/src/components/Layout.tsx` — **phase 3 only**, after the route-level pipeline
  is proven. Global shell, 492 lines, 29 churn.

---

## 5. Phasing — mandatory sequencing, not parallel

Each phase gates on rung-3 click-through evidence from the previous one.

| Phase | Surfaces | Gate |
|---|---|---|
| **Phase 1** | `DashboardPage`, `LoginPage` | Prove the pipeline: retrieve → retokenize → `pnpm run check:ui` green → rung-3 evidence |
| **Phase 2** | `TripListPage`, `TripCreate`, `TripEdit` | Density + click-efficiency verified |
| **Phase 3** | `DebtDetail`, `DebtList`, `PayableDetail`, `Finance`, then `Layout.tsx` | Accountant density verified; shell last |

**Stop condition:** if Phase 1 produces poor results (contract failures, visual regression,
or PRO material that can't be retokenized cleanly), halt and reassess. One phase lost, not
three.

---

## 6. Implementation considerations & risks

1. **Retokenize step is mandatory on every landing.** UUI PRO source ships literal type
   sizes and its own brand scale. Without retokenizing to `var(--fs-*)` / `var(--color-*)`
   from `frontend/src/styles/tokens.css`, `pnpm run check:ui` fails and the TransTing
   emerald identity breaks.
2. **PRO source must not be committed as a dependency.** ADR 0043 is honoured by
   copy-in source only. No `components.json`, no `cn()` helper, no UUI npm dep. PRO source
   and license material must never enter the repository or any public doc.
3. **Credential hygiene.** `~/.untitledui/config.json` holds the license. It must never be
   copied into the repo, committed, or echoed into reports.
4. **QA cost scales linearly with surfaces.** 9 surfaces × 4 rung-3 artifacts
   (screenshot + DOM assertion + DB proof + driver log). Budget for it or the claims are
   unverifiable.
5. **TripEdit carries business logic** (fuel 3-mode calc, road allowance formula). Changes
   there are **presentation-only**. No logic, no calculation, no schema touched.
6. **UUI MCP registration is a config change** (`.mcp.json` / `opencode.jsonc`) that
   requires explicit approval. Preferred discovery layer for the skill; CLI works as
   fallback if declined.
7. **daisyUI (`d-` prefix), Radix, and homegrown primitives all remain.** This adds a
   fourth system in the tree — accepted debt under ADR 0043's reference-catalog model,
   and only sustainable if we never install UUI as a dependency.

---

## 7. Success metrics & validation criteria

One metric per surface (see §4 table). Validation per surface:

| Metric | Measured how |
|---|---|
| **(a)** Fewer clicks | Count interaction steps to complete trip entry, before vs after |
| **(b)** Density | Rows/columns visible at 1440×900 without scrolling, before vs after |
| **(c)** Hierarchy | Screenshot comparison + reviewer ranking of "which is clearer" |
| **(d)** Fewer errors | Empty/error/validation states present and explicit; form error rate |

**Universal gate:** every claim carries a rung label. Rung 3 (`UI DRIVEN`) requires all four
artifacts on disk and referenced by path. No rung-3 claim without artifacts. The
"Not covered" column in the verification report must never be empty.

**Contract gates (must be green before any phase merges):**
- `cd frontend && pnpm run check:ui`
- `cd frontend && pnpm run check:brand`
- `pnpm lint`
- `pnpm --dir frontend test`

---

## 8. Open items requiring sign-off before implementation

| # | Item | Status |
|---|---|---|
| 1 | Option C selected | ✅ Agreed |
| 2 | All three bundles in scope, sequenced 3 phases | ✅ Stated by user ("all of them") |
| 3 | One metric per surface (the contradiction resolution) | ⚠️ **Needs explicit confirm** — derived by advisor, not stated by user |
| 4 | `responsive.css` / `Layout.tsx` carve-outs | ⚠️ **Needs explicit confirm** |
| 5 | Register Untitled UI MCP server in project config | ⚠️ **Needs explicit approve/decline** |
| 6 | Honoring ADR 0043 (reference catalog, no UUI dependency) | ⚠️ **Needs explicit confirm** |

---

## 9. Next steps

1. Confirm or correct items 3–6 in §8.
2. On confirmation, generate the implementation plan (`/ck:plan`) with this summary as
   context, phase files under `plans/261010-ui-ux-polish-untitled-pro/`.
3. Phase 1 execution: `DashboardPage` + `LoginPage` only, full retokenize + rung-3
   evidence, then gate review before Phase 2.

---

## 10. Verification coverage

| Claim | Rung | Evidence | Not covered |
|---|---|---|---|
| PRO license is authenticated and PRO material is retrievable | `DB/API VERIFIED` | `untitledui search` returned `PRO`-tagged application components + templates; license present in `~/.untitledui/config.json` (redacted) | No UI driven; no component *installed* yet; PRO retrieval not yet exercised via `add` |
| Existing UI/brand contracts would reject unmodified UUI source | `CODE-READ ONLY` | `frontend/scripts/check-ui-contract.mjs` (font-size px ban), `check-brand-contract.mjs` | Not executed; UUI source not yet pasted to prove the failure |
| Surface churn ranking (which files hurt most) | `CODE-READ ONLY` | `git log --since="4 months ago" --name-only` frequency counts | Churn ≠ user pain; no user interviews or analytics consulted |
| No Untitled UI currently in the codebase | `CODE-READ ONLY` | grep across `*.{ts,tsx,json,md,css,mjs}` returned zero matches | Deep node_modules not scanned |
| Any UI/UX improvement claim | `NOT TESTED` | — | Everything. No implementation has occurred. |
