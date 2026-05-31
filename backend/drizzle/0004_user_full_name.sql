-- Add human-readable full name to users.
-- Used as actor label in audit messages (replaces email).
-- Backfill for known seed accounts and from drivers table where available.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" varchar(255);--> statement-breakpoint

-- Backfill drivers from drivers.name
UPDATE "users" u SET "full_name" = d."name"
FROM "drivers" d
WHERE d."user_id" = u."id" AND u."full_name" IS NULL;--> statement-breakpoint
-- Any remaining users: derive from username so audit messages aren't empty
UPDATE "users" SET "full_name" = "username" WHERE "full_name" IS NULL;
