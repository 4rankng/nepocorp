---
title: "Verification and ship"
status: todo
---

# Phase 6: Verification and ship

## Overview

End-to-end proof against the acceptance criteria, reviewer pass, then ship (single commit/push — CI's first demo deploy is the wiring's live test).

## Requirements

- [ ] Leak scan re-run against the LIVE demo DB (not just local): 0 original-identifier occurrences
- [ ] Visual check: login, customers/trips/finance pages show fake names + "Công ty vận tải TingTing"; no broken image floods (photo tables emptied)
- [ ] Regression check: `https://nepo.tingting.vip/api/health` + `https://vantai.tingting.vip/api/health` green; `/opt/vantai` unmodified
- [ ] Box health: `docker stats` + `free -h` — no memory pressure; swap usage noted
- [ ] `code-reviewer` subagent pass on the diff (acceptance criteria, regressions, contracts, patterns)
- [ ] Commit (conventional, no AI refs), push, watch CI deploy nepo+demo green
- [ ] Journal + memory update (servers table: demo.tingting.vip; vantai = silversea-reserved, transting images)

## Implementation Steps

1. Run verification checklist, capture evidence.
2. Spawn code-reviewer with scout summary + acceptance criteria; fix findings.
3. Commit + push; watch the Actions run to completion.
4. Write journal entry; update memory index/topic file.

## Todo

- [ ] Live leak scan clean
- [ ] Visual + regression checks pass
- [ ] Review pass fixed
- [ ] Shipped + CI green
- [ ] Journal + memory

## Success Criteria

All plan-level success criteria green with evidence; nothing on prod or the old vantai stack changed.
