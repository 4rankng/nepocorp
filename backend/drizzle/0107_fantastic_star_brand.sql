-- pgvector ships in the pgvector/pgvector:pg16 image but still needs
-- CREATE EXTENSION per database. 0104_faq_knowledge_base (orphaned from the
-- journal) was the only migration creating it, so fresh databases never got it
-- before this file — create it here, idempotently (no-op where it exists).
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_path" text NOT NULL,
	"heading" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"doc_version" text,
	"lang" text DEFAULT 'vi' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_source_idx" ON "knowledge_chunks" USING btree ("source_type","source_path");--> statement-breakpoint
-- HNSW index for cosine similarity search (same pattern as faq_entries).
-- Partial: only rows with embeddings (NULL until the backfill script embeds them).
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_idx"
  ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;
