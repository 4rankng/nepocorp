---
title: "Repo scaffolding: demo stack files"
status: todo
---

# Phase 1: Repo scaffolding — demo stack files

## Overview

Create the repo-side files that define the demo stack. These are the source of truth (scp'd to the server in Phase 2), unlike the vantai stack which was patched in place over SSH and drifted.

## Requirements

- [x] `deploy/docker-compose.demo.yml` — full stack: postgres (pgvector/pg16, db/user `demo`), redis (64MB cap), backend (`franknguyenvd/tingting-backend:latest`, host port `127.0.0.1:3091:3090`, `CORS_ORIGIN=https://demo.tingting.vip`), frontend (`127.0.0.1:3001:80`), adminer (profile-gated, `127.0.0.1:8081:8080`). Compose project `name: demo`; volumes under `/opt/demo/data/...`.
- [x] `deploy/nginx-host-demo.conf` — vhost for `demo.tingting.vip`: `/uploads/` → `/opt/demo/data/uploads/`, `/api/` + `/socket.io/` (WS upgrade, 300s) → `127.0.0.1:3091`, `/` → `127.0.0.1:3001`, ACME challenge root. HTTP-only initially; certbot adds SSL blocks.
- [x] `deploy/setup-demo-server.sh` — one-time server provisioning: create `/opt/demo/{deploy,data/{postgres,redis,uploads}}`, generate fresh `JWT_SECRET`/`DB_PASSWORD`, copy bot/maps keys from `/opt/vantai/deploy/.env`, write `.env` (chmod 600), place compose file, install nginx vhost, `nginx -t && reload`, run `certbot --nginx -d demo.tingting.vip`, `docker compose up -d postgres redis`.

## Implementation Steps

1. Write the three files, modeled on `deploy/docker-compose.prod.yml`, `deploy/nginx-host-vantai.conf`, and `deploy/setup-server.sh` respectively.
2. Validate compose locally: `docker compose -f deploy/docker-compose.demo.yml config` (syntax only — do not `up`).

## Todo

- [x] docker-compose.demo.yml
- [x] nginx-host-demo.conf
- [x] setup-demo-server.sh

## Success Criteria

`docker compose config` parses clean; file set matches the decisions in plan.md (ports, paths, name, CORS, redis cap).
