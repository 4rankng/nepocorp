-- One live account per username/email/phone (kanban 101026095010).
--
-- The old indexes were plain UNIQUE constraints, so a SOFT-DELETED account kept
-- its identifier reserved forever: re-creating the same username/email/phone
-- answered 409 "Dữ liệu đã tồn tại" while /users (which hides deleted rows) listed
-- no such account. Ops read that as "creating a user is broken".
--
-- The new indexes are partial (live rows only). Safe on existing data by
-- construction: the constraints being dropped also covered deleted rows, so no two
-- live rows can already share an identifier.
--
-- DROP CONSTRAINT IF EXISTS / CREATE INDEX IF NOT EXISTS keep this file safe to
-- re-apply by hand (the psql path used for partial-index migrations) before the
-- drizzle runner records it.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_phone_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_active_unq" ON "users" USING btree ("username") WHERE "users"."username" IS NOT NULL AND "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_active_unq" ON "users" USING btree ("email") WHERE "users"."email" IS NOT NULL AND "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_active_unq" ON "users" USING btree ("phone") WHERE "users"."phone" IS NOT NULL AND "users"."deleted_at" IS NULL;
