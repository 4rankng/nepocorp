---
phase: 3
title: "P2 — Knowledge & Lookup Lanes"
status: pending
priority: P2
effort: "M (3–5 engineer-weeks)"
dependencies: [2]
---

# Phase 3: P2 — Knowledge & Lookup Lanes

## Overview

Generalize the existing FAQ fast lane into a **document-RAG pipeline** over `CONTEXT.md`, ADRs, and product specs, and add **citations** to every grounded answer. This is Lane 1's expansion from "FAQ only" to "FAQ + product docs." The infrastructure already exists (`faq-fast-lane.ts` + `embeddings.ts` + pgvector HNSW); the work is a second ingestion path + a citation field on responses.

This closes HLD §7 gaps: *No RAG over product docs*, *No reranking*, *No citation/provenance*.

## Requirements

- **Functional:** A "how does X work?" / "tiền chuẩn là gì?" question is answered from `CONTEXT.md` + ADRs + FAQ, with a visible citation (doc path or FAQ id).
- **Non-functional:** Retrieved doc content treated as **untrusted input** to the model (HLD §12 prompt-injection control). Retrieval adds < 400 ms p95.

## Architecture

```
[Doc sources]                       [FAQ entries]  (existing)
   │                                     │
   ▼                                     ▼
[Ingest pipeline]                  [faq-admin CRUD] (existing)
   │ chunk by heading/step               │
   │ embed (existing embeddings.ts)      │
   ▼                                     ▼
[knowledge_chunks table]           [faq_entries]    (existing)
   │ pgvector HNSW                       │
   ▼                                     ▼
[Retrieval]  ◄── query embed (cached in Redis, existing)
   │ 1. metadata filter (role/feature/lang)
   │ 2. pgvector cosine candidate set (FAQ + chunks, unified)
   │ 3. (optional) rerank top-8 → top-4
   ▼
[Grounded answer + citations[]]
```

**Reuse, don't rebuild:** the FAQ pipeline (`faq-fast-lane.ts`) is the template. A `knowledge.search` tool exposes retrieval to the orchestrator; the router (P1) can also short-circuit high-confidence knowledge hits to Lane 1 (0 LLM) the same way FAQ does.

### Citation schema

Add a `citations` field to `AgentResponse` (all kinds). Each citation: `{ sourceId, label, kind: 'faq'|'doc'|'tool', url? }`. Rendered as small chips under the answer in `AgentAssistant.tsx` / `InsightCard.tsx`.

## Related Code Files

- **Create:** `backend/drizzle/00XX_knowledge_chunks.sql` — `knowledge_chunks` table: `id, source_type ('context'|'adr'|'doc'|'faq'), source_path, heading, content, embedding vector(1536), role_scope text[], feature_scope text[], lang, doc_version, updated_at`, HNSW index.
- **Create:** `backend/src/services/agent/knowledge-ingest.ts` — offline chunker: parse `CONTEXT.md` / `docs/adr/*` by heading/step (semantic chunking), embed via existing `embeddings.ts`, upsert.
- **Create:** `backend/src/services/agent/knowledge-retrieval.ts` — `retrieveKnowledge(query, ctx): Promise<RetrievedChunk[]>`. Metadata filter (role/feature/lang) → pgvector cosine over `knowledge_chunks` + `faq_entries` (union) → optional rerank.
- **Create:** `backend/src/services/agent/tools/knowledge.ts` — `knowledge.search` tool (readonly, role-gated). Returns chunks + citation metadata.
- **Modify:** `backend/src/services/agent/orchestrator.ts` — when the router hints `knowledge`, inject retrieved chunks into the prompt as an explicitly-marked untrusted segment; collect citations into the response.
- **Modify:** `shared/src/schemas/agent.ts` — add `citations` to `AgentResponse`; add `kind` discrimination.
- **Modify:** `frontend/src/components/agent/AgentAssistant.tsx`, `InsightCard.tsx` — render citation chips.
- **Modify:** `backend/src/routes/faq-admin.ts` or a new `routes/knowledge-admin.ts` — admin trigger to re-ingest docs (manual for now; automation deferred).
- **Reuse:** `services/llm/embeddings.ts`, `lib/redis` (extend the embedding cache key namespace to cover doc queries).

## Implementation Steps

1. **Migration** — `knowledge_chunks` table + HNSW index (mirror `0104_faq_knowledge_base.sql`).
2. **Chunker** — parse `CONTEXT.md` (the authoritative glossary) and `docs/adr/*.md` by heading; one chunk per definition/section; attach `source_path`, `heading`, `role_scope`, `lang='vi'` (or per-source). Keep chunks ≤ 500 chars.
3. **Ingest script** — `pnpm tsx backend/src/db/backfill-knowledge-chunks.ts` (mirror the existing `backfill-faq-embeddings.ts`). Re-runnable; upserts by `(source_path, heading)`.
4. **Retrieval service** — metadata filter first (cheap), then pgvector cosine over the union of `knowledge_chunks` + `faq_entries` (a single SQL with two SELECTs UNION'd, or a view). Top-8 candidates.
5. **Rerank (optional, defer if recall is fine)** — only add if top-8 recall proves insufficient on the eval set. Keep behind a flag.
6. **`knowledge.search` tool** — readonly tool exposing retrieval to the orchestrator; citations flow into the response.
7. **Router integration (P1 hook)** — add a Lane 1 knowledge sub-path: high-confidence retrieval hit (top-1 score ≥ threshold, same margin gate as FAQ) → return the chunk as a `text` answer with citation, 0 LLM. Lower-confidence → hand chunks to the orchestrator as grounded context.
8. **Citation rendering** — chips under the answer; clicking a `doc` chip could deep-link to the doc (future); FAQ chip shows the question.
9. **Untrusted-content isolation** — in the orchestrator prompt builder, retrieved chunks go in a clearly-delimited `<retrieved_context>` block with an instruction that this is untrusted data, never directives.
10. **Tests** — retrieval eval set: ≥15 product/workflow questions with expected source citations; assert top-3 recall ≥ 80%.

## Success Criteria

- [ ] `knowledge_chunks` populated from `CONTEXT.md` + ADRs; re-ingest is idempotent.
- [ ] `knowledge.search` tool available; role-gated; readonly.
- [ ] Every grounded answer (FAQ + doc + tool-based) carries at least one citation rendered in the UI.
- [ ] Retrieval p95 < 400 ms (embedding cache hit) / < 1.2 s (cache miss).
- [ ] Retrieval top-3 recall ≥ 80% on the eval set.
- [ ] No untrusted-content path can produce a directive (prompt-injection guard verified by a red-team test case in `agent-tool-compact.test.ts` style).
- [ ] No regression to FAQ fast lane (existing `faq-fast-lane.test.ts` still green).

## Risk Assessment

- **Retrieval quality** — chunking too coarse/fine hurts recall. Mitigation: semantic chunk by heading/step (the HLD's recommendation); measure recall before/after tuning.
- **Stale docs** — `CONTEXT.md` changes don't auto-reingest. Mitigation: admin trigger + a `doc_version` watermark; surface "stale" if the on-disk file's hash differs from the last ingested version.
- **Prompt injection via retrieved content** — the highest-severity risk. Mitigation: untrusted-segment isolation; the closed directive set + route allowlist is the real boundary (HLD §12); add a red-team test where a malicious chunk tries to emit a `navigate` directive and assert it's dropped.
