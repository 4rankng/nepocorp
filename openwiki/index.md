---
okf_version: "0.2"
---

# Files

- [System Architecture](architecture.md) - End-to-end architecture of the NEPO Logistics platform — monorepo topology, runtime topology, request lifecycle, RBAC boundaries, and data flow between React, Express, Drizzle, and PostgreSQL.
- [Deployment & Environments](deployment.md) - Rollout topology for the three environments — local dev compose, production nepo.tingting.vip, demo staging demo.tingting.vip on an anonymized snapshot — plus Makefile deploy targets, prod-migrate safety rules, backup/restore, and host nginx routing.
- [Vietnamese Domain Glossary](domain-glossary.md) - Vietnamese ↔ English term map for trips, ledger, fuel, allowances, penalties, advances, salary, fleet, billing documents, and RBAC — each term tied to the enums, tables, and services that implement it.
- [Quickstart — Reading & Navigating the NEPO Code Wiki](quickstart.md) - Task-routing map for agents and contributors — what to read first, which wiki page owns which job, where the authoritative Vietnamese docs live, and the Makefile entry points for each environment.

# Directories

- [backend](backend/)
- [development](development/)
- [frontend](frontend/)
- [shared](shared/)
