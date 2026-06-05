-- Migration: set default salary period to calendar month (1st → last day)
-- If a default row already exists, update it. Otherwise insert one.
-- defaultStartDay=1, defaultEndDay=31 with startDay <= endDay signals "same-month" mode
-- in salary-period.service.ts (endDay is clamped to actual month length at query time).

INSERT INTO salary_periods (is_default, default_start_day, default_end_day, month, year, start_date, end_date, created_at, updated_at)
SELECT true, 1, 31, NULL, NULL, NULL, NULL, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM salary_periods WHERE is_default = true AND deleted_at IS NULL
);

-- If a default row already existed with a different configuration, update it
UPDATE salary_periods
SET
  default_start_day = 1,
  default_end_day   = 31,
  updated_at        = NOW()
WHERE is_default = true
  AND deleted_at IS NULL
  AND (default_start_day IS DISTINCT FROM 1 OR default_end_day IS DISTINCT FROM 31);
