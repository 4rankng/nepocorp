---
title: "Server stack provisioning"
status: todo
---

# Phase 2: Server stack provisioning

## Overview

Run the scaffolding on `root@vantai.tingting.vip`. Additive only — nothing under `/opt/vantai` is modified; the new nginx vhost is a separate `sites-available/demo` file.

## Requirements

- [x] `demo.tingting.vip` vhost live with a valid Let's Encrypt cert
- [x] `demo-postgres-1`, `demo-redis-1` running (backend/frontend deferred to Phase 4 so the first boot uses real data)
- [x] Existing vantai containers and vhost untouched and still healthy

## Implementation Steps

1. `ssh root@vantai.tingting.vip 'bash -s' < deploy/setup-demo-server.sh`
2. Verify: `docker ps` shows demo postgres+redis; `curl -sI https://demo.tingting.vip` (502 from nginx is expected until frontend boots — the vhost+cert is what's proven); `certbot certificates` lists demo.
3. Confirm vantai stack still green: `docker ps`, `curl -s https://vantai.tingting.vip/api/health`.

## Todo

- [x] Run setup script
- [x] Cert issued
- [x] Postgres + redis healthy

## Success Criteria

Demo infra exists on the box; TLS terminates for demo.tingting.vip; zero changes to /opt/vantai (verify via `docker inspect` unchanged + compose file mtime).
