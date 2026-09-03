---
title: "Data load and first boot"
status: todo
---

# Phase 4: Data load and first boot

## Overview

Ship the anonymized DB to the demo stack and boot backend + frontend against it.

## Requirements

- [x] Anonymized dump produced with `--no-owner --no-privileges` (avoids `nepocorp` role ownership statements)
- [x] Dump restored into demo postgres (db/user `demo`); `drizzle-kit migrate` runs clean inside the demo backend container (schema from snapshot + any newer main-branch migrations)
- [x] `https://demo.tingting.vip/api/health` green; login as admin/admin123 works

## Implementation Steps

1. Local: `pg_dump --no-owner --no-privileges` the anonymized scratch DB → gzip → `scp` to `root@vantai.tingting.vip:/tmp/`.
2. Server: `docker cp` into `demo-postgres-1`, `psql -U demo -d demo` restore (single transaction), then `docker compose -f deploy/docker-compose.demo.yml up -d backend frontend`.
3. Run pending migrations: `docker exec demo-backend-1 npx drizzle-kit migrate`.
4. Smoke: health endpoint, login via API (`/api/auth/login` admin/admin123), fetch a customers page and a trips page — fake names, real amounts.

## Todo

- [x] Dump shipped + restored
- [x] Backend/frontend up + migrated
- [x] Login + API smoke pass

## Success Criteria

Demo site fully functional with anonymized data; drizzle journal consistent (no desync warnings).
