-- NEPO-28 — AI OCR counters move from MONTHLY grain to DAILY grain.
--
-- The dashboard now plots daily OCR requests, so one row per calendar day is
-- the natural grain; the monthly total becomes the SUM of the month's rows.
--
-- Data transformation: the old counter was CUMULATIVE through the month, so a
-- month's row holds the month's TOTAL, not a day's count. That total is
-- attributed to the LAST DAY of its month — the day the month was actually
-- closed out. This keeps every month's total intact (nothing is lost) and
-- keeps the daily series honest: a month that ran to the end carries its
-- count on the last day, and the days before it read as measured zeros.
--
-- Ordering (backfill BEFORE the constraint change, one transaction):
--   1. add the new column,
--   2. backfill it from the monthly key,
--   3. drop rows that could not be mapped (a malformed key),
--   4. tighten NOT NULL,
--   5. swap the primary key,
--   6. drop the old column.

ALTER TABLE "ocr_usage_counters" ADD COLUMN "usage_date" varchar(10);
--> statement-breakpoint
-- Backfill: 'YYYY-MM' → the last day of that month, 'YYYY-MM-DD'.
UPDATE "ocr_usage_counters"
SET "usage_date" = to_char(
  (("year_month" || '-01')::date + (interval '1 month' - interval '1 day')),
  'YYYY-MM-DD'
)
WHERE "year_month" ~ '^\d{4}-\d{2}$';
--> statement-breakpoint
-- A key that is not a valid month cannot be mapped onto a day — drop it.
DELETE FROM "ocr_usage_counters" WHERE "usage_date" IS NULL;
--> statement-breakpoint
ALTER TABLE "ocr_usage_counters" ALTER COLUMN "usage_date" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ocr_usage_counters" DROP CONSTRAINT IF EXISTS "ocr_usage_counters_pkey";
--> statement-breakpoint
ALTER TABLE "ocr_usage_counters" ADD PRIMARY KEY ("usage_date");
--> statement-breakpoint
ALTER TABLE "ocr_usage_counters" DROP COLUMN "year_month";
