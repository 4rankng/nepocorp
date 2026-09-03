---
title: "Nepocorp demo staging at demo.tingting.vip"
description: "Second stack on the vantai droplet serving anonymized prod data under a generic TingTing company identity; make demo deploys to it; CI matrix repointed vantai→demo."
status: completed
priority: P1
effort: "1d"
tags: [deploy, staging, demo, anonymization]
created: 2026-09-03
---

# Nepocorp demo staging at demo.tingting.vip

## Overview

Provision a second TingTing stack (`/opt/demo`) on the vantai droplet (167.172.76.214), exposed as **demo.tingting.vip**, running nepocorp's own Docker Hub images (`franknguyenvd/tingting-*`). Its database is a **one-time anonymized snapshot of prod** (realistic shape, zero real customer/vendor/person identifiers), presented under generic company "Công ty vận tải TingTing". `make demo` re-deploys code+data-free changes to it. The existing vantai stack (`/opt/vantai`, now running diverged `ghcr.io/4rankng/transting-*` images) is left untouched and is dropped from nepocorp's CI matrix — that stack is reserved for silversea use.

## Brainstorm contract

- **Outcome:** `https://demo.tingting.vip` serves the nepocorp app with anonymized prod-derived data; `make demo` (re-added) deploys there; main-push CI deploys nepo + demo.
- **Constraints:** prod (`nepo.tingting.vip`) untouched; existing `/opt/vantai` stack untouched (additive-only on the server); no real customer data reachable on the demo (verified by automated leak scan); shared-box resources respected (2G swap exists, ~341MB RAM available — demo redis capped at 64MB); drizzle migrations must apply cleanly over the restored snapshot.
- **Non-goals:** silversea repo/deployment work; decommissioning the old vantai stack; changing prod deploy flow; recurring data refresh automation (pipeline is re-runnable on demand, not scheduled).
- **Acceptance criteria:** see Success Criteria below.

## Key decisions (evidence-based)

1. **DNS already resolves** `demo.tingting.vip` → 167.172.76.214 (same IP as vantai). No DNS work needed.
2. **Ports:** demo backend `127.0.0.1:3091`, frontend `127.0.0.1:3001`, adminer (profile-gated) `127.0.0.1:8081` — avoids collision with vantai's 3090/3000/8080.
3. **CI matrix repoint (vantai→demo):** nepocorp CI currently deploys into `/opt/vantai` whose on-disk compose now pulls `ghcr.io/4rankng/transting-*` images — nepocorp's matrix entry is cross-wired with a diverged stack. Replacing it with demo fixes that and matches the target state (box = silversea staging + nepocorp demo). Reversible with a one-line matrix edit.
4. **Repo files are the source of truth for the demo stack** (`deploy/docker-compose.demo.yml`, `deploy/nginx-host-demo.conf`, `deploy/setup-demo-server.sh`) — avoids the drift-by-SSH-patch situation that bit the vantai stack.
5. **Demo login:** all user passwords reset to `admin123` (existing `make restore` precedent), so any account can demo.
6. **Anonymization scope:** customers, suppliers (+linked), drivers, users, plates, phones, tax codes, partner names (cap table/distributions), issuer identity on debit-note templates → deterministic realistic fakes; app_settings company info → "Công ty vận tải TingTing"; free-text columns swept with old→new replacement; volatile/PII tables truncated (agent chats, notifications, push subscriptions, audit logs, photo tables).
7. **One-time anonymization, no pipeline** (user scope cut 2026-09-03): dump prod → restore into local scratch DB `demo_snapshot` → ad hoc SQL transform (throwaway script in /tmp, nothing committed) → dump `--no-owner --no-privileges` → load on server. Never touches the local `tingting` dev DB or any server DB destructively.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | demo.tingting.vip live with anonymized prod-derived data | P1 |
| 2 | `make demo` / `make demo-backend` / `make demo-frontend` deploy targets | P1 |
| 3 | CI deploys to nepo + demo (vantai dropped from matrix) | P1 |
| 4 | Zero real-identifier leakage, machine-verified | P1 |
| 5 | Anonymization approach recorded in journal (one-time, no repo artifact) | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Repo scaffolding: demo stack files](./phase-01-start.md) | Completed |
| 2 | [Server stack provisioning](./phase-02-server-stack-provisioning.md) | Completed |
| 3 | [One-time data anonymization](./phase-03-anonymized-snapshot-pipeline.md) | Completed |
| 4 | [Data load and first boot](./phase-04-data-load-and-first-boot.md) | Completed |
| 5 | [Deploy wiring: make demo + CI](./phase-05-deploy-wiring-make-demo-ci.md) | Completed |
| 6 | [Verification and ship](./phase-06-verification-and-ship.md) | Completed |

## Success Criteria

- [x] `https://demo.tingting.vip` serves the app; `/api/health` green; login works (admin / admin123)
- [x] Company identity shows "Công ty vận tải TingTing" (sidebar/export/debit notes)
- [x] Leak scan: 0 occurrences of any real customer/supplier/driver/user name, plate, phone, or tax code across entity + swept text columns of the demo DB
- [x] `make demo` completes and restarts demo services; CI on main deploys nepo + demo green
- [x] Existing stacks unaffected: `https://nepo.tingting.vip` and `https://vantai.tingting.vip` still healthy; no changes under `/opt/vantai`
- [x] Vantai box memory stable (2G swap present; demo redis capped 64MB)

## Risk Assessment

- **RAM headroom (~341MB avail):** second stack ≈ 200–300MB. Mitigation: 2G swap already present, demo redis `--maxmemory 64mb`, monitor `docker stats` after boot; escalate to droplet resize only if OOM appears.
- **pgvector/local restore:** dev compose uses `pgvector/pgvector:pg16` — compatible with prod dumps.
- **Dump size (gps trails):** if prod dump >300MB, trim `trip_gps_tracks`/`route_polylines` to recent 60d before anonymizing (demo realism barely affected).
- **CI ordering:** CI matrix change lands in the same push that follows server provisioning — demo stack exists before CI ever targets it.
