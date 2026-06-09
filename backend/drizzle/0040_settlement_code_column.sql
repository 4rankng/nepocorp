-- Add code column to advance_settlements with PT-YYMM-XXXX format
ALTER TABLE "advance_settlements" ADD COLUMN "code" varchar(20);

-- Backfill existing rows: derive PT-YYMM-XXXX from created_at and id
-- Uses CTE because PostgreSQL doesn't allow window functions directly in UPDATE SET
WITH ranked AS (
  SELECT id, CONCAT(
    'PT-',
    TO_CHAR(created_at, 'YYMM'),
    '-',
    LPAD(ROW_NUMBER() OVER (PARTITION BY TO_CHAR(created_at, 'YYMM') ORDER BY id)::text, 4, '0')
  ) AS new_code
  FROM "advance_settlements"
)
UPDATE "advance_settlements" s
SET "code" = r.new_code
FROM ranked r
WHERE s.id = r.id;

-- Now make it NOT NULL and add unique index
ALTER TABLE "advance_settlements" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "advance_settlements_code_unique_idx" ON "advance_settlements" ("code");
