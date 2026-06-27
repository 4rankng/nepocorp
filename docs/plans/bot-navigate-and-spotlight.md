# Plan — Bot-driven navigation + element highlight (pending approval)

**Status:** `pending approval` (ralplan consensus — Architect ITERATE applied; Critic pending)
**Date:** 2026-06-27
**Trigger:** Bot replied with plain text `"...trang Lốp xe tại /fleet/1/tires"` instead of navigating; user asked (a) why, (b) whether the bot should open the relevant component, and (c) whether to add a tutorial-style pinpoint animation.

---

## 0. Diagnostic — why it behaves like this today

The user saw:

> "Tôi đang ở chế độ CHỊ ĐỌC … Để thêm lốp xe, bạn vui lòng thao tác trực tiếp trên giao diện trang Lốp xe tại /fleet/1/tires."

That sentence is **not hardcoded — it is MiniMax-M3 talking.** Verified facts that reframe the request:

1. **Navigation already works end-to-end.** `ui.navigate` → `AgentDirective {kind:'navigate', routeKey, params, highlight?, animation?}` → `AgentDirectiveContext.send()` → react-router `navigate()`.
2. **The system prompt already forbids the behavior** (`orchestrator.ts:102`: *"LUÔN gọi ui.navigate … KHÔNG mô tả đường dẫn bằng text"*) — **but the rule is scoped to "mở trang/tìm/xem" (open/find/view), not write/delegation requests.** "thêm lốp xe" (a write) falls outside the rule, so the model emits prose.
3. **Critical: `ui.navigate` does not advertise its `highlight` capability.** `ui.ts:80` defines the tool params as `{routeKey, params}` only — `highlight` is omitted, so the LLM has no way to learn it can point at an element. **This is the actual "no spotlight" root cause.**
4. **The Tire page needs no new affordance.** Verified at `TruckTiresPage.tsx`: "Thêm lốp" is `<a href="#ttp-add-title">` (line 230) — an anchor, not a button. The target `<h2 id="ttp-add-title">` (line 241) sits on an **always-rendered** `<section className="ttp-panel--form">` (line 238). There is no modal to "open"; the form is permanently on screen. The page already exposes stable `ttp-*` ids everywhere.

**Root cause of Ask 1 (no redirect):** the model ignored navigation because (a) the prompt rule doesn't cover delegation/write, and (b) the tool description doesn't say "use me when you can't act, and point at the element."
**Root cause of Ask 2 (no pinpoint):** misdiagnosed as "needs a tour library." Really: `navigate` was never told to highlight `#ttp-add-title`. The existing `highlightElement` ring-pulse already scrolls + emphasizes the always-present form.

**Conclusion:** Ask 1 is a *prompt/tool-description* fix. Ask 2 is *already solvable with existing infra* once the `highlight` param is exposed. **No new library, no new directive kind, no new component needed for v1.**

---

## RALPLAN-DR summary (revised)

**Principles**
1. **Don't rebuild what exists.** Navigate pipeline + `highlightElement` + stable page ids all work.
2. **Read-only philosophy holds.** Bot points at the always-visible form ("người dùng tự lưu"). No auto-write.
3. **Distrust the model; add a deterministic net — but stay honest.** The guardrail must navigate *for real* (emit the directive + ack), never claim success it didn't earn.
4. **Fit the ethos.** No new dependency for v1. (Driver.js considered for *future* dense-page spotlights — see §4.)
5. **Verify anatomy before building.** The first draft assumed a hidden button/modal; the page is a single tall workbench. (Caught by Architect review + read.)

**Decision drivers (top 3)**
1. Bot must **reliably** navigate on delegation/write requests — measured, not hoped.
2. After navigating, the user must **see** the relevant form → `highlightElement` on the existing id is sufficient.
3. Minimal blast radius: backend prompt + tool-description + one guardrail; **no shared schema change, no new dep.**

**Viable options (revised)**

| | Option 1 — Expose `highlight` + prompt + honest guardrail *(recommended)* | Option 2 — Driver.js spotlight (original WS-B) | Option 3 — auto-open form (original WS-C) |
|---|---|---|---|
| Fit | Reuses existing ring on an always-visible section | New dep + popover pointing at a 200px-scroll anchor | Targets a modal that doesn't exist |
| Verdict | **Choose** | Defer (only for genuinely-hidden targets on dense pages later) | **Delete** for this page (no modal) |

---

## Workstreams

### WS-A — Reliability + reuse-existing-highlight (the whole fix)

- **A1. System prompt rewrite** (`orchestrator.ts` `buildSystemPrompt`): broaden the navigate rule from "mở trang/tìm/xem" to an explicit **delegation rule**: *"Khi người dùng yêu cầu tạo/sửa/xóa mà bot không được phép (v1 chỉ đọc): KHÔNG từ chối bằng text đường dẫn — LUÔN gọi `ui.navigate` với `highlight.targetId` trỏ vào phần tử cần thao tác, để đưa người dùng đến đúng chỗ."* Add **2 few-shot examples**, one of which points `highlight.targetId` at `ttp-add-title` for the "thêm lốp xe cho xe 1" case.
- **A2. Expose `highlight` in `ui.navigate`** (`ui.ts`): add `highlight: {targetId, durationMs?}` to the advertised params schema and to the description — *"Có thể kèm `highlight.targetId` để cuộn + tô sáng một phần tử trên trang đích (VD `ttp-add-title`)."* This is the fix that lets the model *discover and use* the existing ring-pulse. (No `shared/` schema change — `highlight` is already valid on `navigate`.)
- **A3. Honest deterministic guardrail** (`orchestrator.ts` `produceFinalAnswer`): if the terminal answer is `type:'text'`, **no** directive was emitted this turn, and the text contains a path-like token resolvable against `PAGE_CATALOG` **and differing from the current route**, then **emit a real `directive` SSE frame** (`emit({event:'directive', directive, requiresAck:true})`) — the same path the loop uses mid-turn — and compose the bubble via the existing **`directiveAckText()`** (`orchestrator.ts:125-137`), which honestly reports "Đã mở / không mở được". **Never synthesize a "Đã mở" bubble without an actual directive on the wire.** Guard the matcher: resolve against catalog path templates, require a numeric id for parametric routes, skip when target == `ctx.currentRouteKey`.
- **A4. Observability**: add `navigate_directive_emitted` + `guardrail_fired` booleans to the existing `agent_turn_metrics` row so compliance is measurable on the chatbot-monitoring page.

### Deferred — Driver.js spotlight (do NOT build now)
Only revisit when a target is *genuinely hidden* (e.g. a small KPI on a dense Dashboard/Profit page where a 2px ring is easy to miss). At that point **Driver.js** (MIT, zero-dep, ~5kb) is the recommended choice — see §4. Not needed for the Tire page.

### Out of scope (deleted)
- **WS-C (auto-open form via `open` directive):** structurally inapplicable — the Tire form is an always-rendered `<section>`, not a modal. (`open`/`prefill` remain valid for *future* modal-bearing pages, e.g. expense dialogs — leave the existing `useAgentOpenable` surface as-is.)
- **AGENT_TARGETS compile-time registry:** over-engineered for v1. The one known id (`ttp-add-title`) goes in the prompt example. Revisit only if a second page needs spotlighting.
- **New `spotlight` directive kind / shared schema change:** unnecessary; `navigate.highlight` already covers it.

---

## Answer to the library question (article: Driver.js / Intro.js / Shepherd / React Joyride)
For **this** complaint: **none — the existing ring-pulse + exposing the `highlight` param already gives "navigate + pinpoint the form."** The article's libraries solve *backdrop-popover* spotlights and *multi-step onboarding tours*, which the Tire page doesn't need (form is always visible). If/when a future page needs a real spotlight or a first-time-user tour: **Driver.js** is the best fit for TingTing (zero-dependency, MIT, framework-agnostic → matches the self-hosted/no-CDN ethos; can be driven imperatively from the existing `AgentDirective` pipeline and later reused for onboarding tours). Intro.js is **paid for commercial use → eliminated**. Shepherd.js (floating-ui dep) and React Joyride (heavier, harder to theme to Forest Sage) are overkill. The article's other patterns (hotspots, onboarding checklist, empty-state pointers) are a **separate product feature**, not part of this fix.

## Decision points to confirm at approval
1. **v1 scope** — confirm: prompt rewrite (A1) + expose `highlight` (A2) + honest guardrail (A3) + telemetry (A4). No new dep, no schema change. *(Recommended.)*
2. **Guardrail emission** — confirm the honest approach (emit real directive + ack + `directiveAckText`) over a faster-but-dishonest synthesized bubble.
3. **Future spotlight** — defer Driver.js until a genuinely-hidden target appears (Dashboard/Profit), yes?

## Acceptance criteria
- Asked *"thêm lốp xe cho xe 1"*, the bot calls `ui.navigate({routeKey:'fleetTires', params:{truckId:1}, highlight:{targetId:'ttp-add-title'}})`; the SPA navigates to `/fleet/1/tires` **and** the "Thêm lốp" form section scrolls into view with the ring-pulse. **No raw path in the bubble.**
- **Guardrail honesty:** if the LLM still emits text-with-path, the user is navigated via a real directive event, and the bubble truthfully reflects the ack (reusing `directiveAckText`). No false "Đã mở" when navigation didn't happen.
- **No false positives:** guardrail does not fire when the mentioned path == the page the user is already on.
- `tsc` clean across backend + frontend (no shared change → no rebuild needed); existing agent unit tests pass; new unit tests for (a) the A3 matcher (path→routeKey, current-route skip, parametric-id requirement) and (b) A3 routing through `directiveAckText` instead of synthesizing text.
- Telemetry (A4) exposes navigate-compliance on the chatbot-monitoring page.

## ADR
- **Decision:** Solve the user's complaint with a **prompt rewrite + exposing the existing `highlight` param + an honest deterministic guardrail**. No new dependency, no schema change, no new component.
- **Drivers:** navigate + highlight infra already exists; the Tire form is always visible (anchor + `<section>`, ids present) so a popover/tour is unnecessary; MiniMax-M3 unreliability needs a deterministic net, but the net must stay honest to the ack contract.
- **Alternatives considered:** Driver.js spotlight (deferred — only for future hidden targets), React Joyride/Shepherd (overkill), Intro.js (paid — eliminated), auto-open form via `open` directive (inapplicable — no modal), AGENT_TARGETS registry (over-engineered).
- **Consequences:** backend-only change (prompt + tool desc + guardrail + telemetry). Smallest possible blast radius.
- **Follow-ups:** if a dense page later needs a real spotlight, add Driver.js through the directive pipeline; consider onboarding tours/checklists as a separate feature; track navigate-compliance.

## Architect review status
ITERATE → applied. P0 fixes incorporated: (1) expose `highlight` in `ui.navigate` (the real spotlight mechanism); (2) A3 guardrail routes through real directive emission + `directiveAckText` (no lying bubble). P1: current-route guard. P2: WS-B/WS-C/registry deferred/deleted. Linchpin (anchor + always-visible section) verified by read.
