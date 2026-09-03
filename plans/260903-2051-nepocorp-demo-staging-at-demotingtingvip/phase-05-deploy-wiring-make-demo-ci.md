---
title: "Deploy wiring: make demo + CI"
status: todo
---

# Phase 5: Deploy wiring — make demo + CI

## Overview

Re-add `make demo` targets (currently missing — only stale help text references them) pointed at demo.tingting.vip, and repoint the CI deploy matrix from vantai to demo.

## Requirements

- [x] Root `Makefile`: `DEMO_SERVER := demo.tingting.vip`, `DEMO_PATH := /opt/demo`, `DEMO_COMPOSE := deploy/docker-compose.demo.yml`; targets `demo` (backend+frontend), `demo-backend` (push image → ssh pull/restart → migrate), `demo-frontend` (push image → ssh pull/restart); fix stale help block; add to `.PHONY`.
- [x] `.github/workflows/ci-cd.yml`: deploy matrix becomes nepo (`deploy/docker-compose.prod.yml`) + demo (`deploy/docker-compose.demo.yml`) via a per-entry `compose_file` var; vantai entry removed (that stack now runs diverged `ghcr.io/4rankng/transting-*` images — nepocorp CI shouldn't touch it).
- [x] Demo deploy reuses the same images as prod (`franknguyenvd/tingting-*:latest`) — no extra build.

## Implementation Steps

1. Edit Makefile (root only; backend/frontend Makefiles stay prod-only).
2. Edit ci-cd.yml matrix + script `compose_file` interpolation.
3. Local sanity: `make -n demo-backend` prints the expected ssh sequence.

## Todo

- [x] Makefile targets + help
- [x] CI matrix repoint

## Success Criteria

`make -n demo` resolves; CI yaml valid (`gh workflow` lint or `yq` parse); first pushed commit deploys nepo+demo green.
