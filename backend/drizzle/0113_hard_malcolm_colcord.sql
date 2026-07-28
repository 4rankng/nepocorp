ALTER TABLE "vehicle_schedules" ADD COLUMN IF NOT EXISTS "source_key" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_schedules_source_key_idx" ON "vehicle_schedules" USING btree ("source_key");--> statement-breakpoint
WITH actor AS (
  SELECT "id"
  FROM "users"
  ORDER BY CASE WHEN "role" = 'ADMIN' THEN 0 ELSE 1 END, "id"
  LIMIT 1
),
legacy_truck_schedules AS (
  SELECT
    'TRUCK'::"vehicle_component" AS "vehicle_component",
    t."id" AS "vehicle_id",
    seed."kind",
    seed."source_key",
    seed."title",
    ((seed."due_on"::timestamp + interval '12 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh') AS "due_at",
    (((seed."due_on"::timestamp + interval '12 hours') - interval '30 days') AT TIME ZONE 'Asia/Ho_Chi_Minh') AS "remind_at"
  FROM "trucks" t
  CROSS JOIN LATERAL (
    VALUES
      ('INSPECTION'::"vehicle_schedule_kind", CONCAT('legacy-truck:nextInspectionDate:', t."id"), 'Đăng kiểm', t."next_inspection_date"),
      ('INSURANCE'::"vehicle_schedule_kind", CONCAT('legacy-truck:insuranceExpiryDate:', t."id"), 'Bảo hiểm', t."insurance_expiry_date"),
      ('MAINTENANCE'::"vehicle_schedule_kind", CONCAT('legacy-truck:lastOilServiceDate:', t."id"), 'Thay dầu kế tiếp', t."last_oil_service_date")
  ) AS seed("kind", "source_key", "title", "due_on")
  WHERE seed."due_on" IS NOT NULL
),
insert_legacy_truck_schedules AS (
  INSERT INTO "vehicle_schedules" (
    "vehicle_component",
    "vehicle_id",
    "kind",
    "source_key",
    "title",
    "due_at",
    "remind_at",
    "status",
    "created_by",
    "updated_by"
  )
  SELECT
    seed."vehicle_component",
    seed."vehicle_id",
    seed."kind",
    seed."source_key",
    seed."title",
    seed."due_at",
    seed."remind_at",
    'ACTIVE'::"vehicle_schedule_status",
    actor."id",
    actor."id"
  FROM legacy_truck_schedules seed
  CROSS JOIN actor
  WHERE NOT EXISTS (
    SELECT 1
    FROM "vehicle_schedules" existing
    WHERE existing."source_key" = seed."source_key"
  )
  ON CONFLICT ("source_key") DO NOTHING
  RETURNING "id"
),
renewable_expense_candidates AS (
  SELECT
    e."id" AS "expense_id",
    e."vehicle_component",
    e."truck_id" AS "vehicle_id",
    CASE lower(trim(c."name"))
      WHEN 'đăng kiểm' THEN 'INSPECTION'::"vehicle_schedule_kind"
      WHEN 'dang kiem' THEN 'INSPECTION'::"vehicle_schedule_kind"
      WHEN 'bảo hiểm' THEN 'INSURANCE'::"vehicle_schedule_kind"
      WHEN 'bao hiem' THEN 'INSURANCE'::"vehicle_schedule_kind"
      WHEN 'phí đường bộ' THEN 'ROAD_FEE'::"vehicle_schedule_kind"
      WHEN 'phi duong bo' THEN 'ROAD_FEE'::"vehicle_schedule_kind"
      ELSE NULL
    END AS "kind",
    CASE lower(trim(c."name"))
      WHEN 'đăng kiểm' THEN 'Đăng kiểm'
      WHEN 'dang kiem' THEN 'Đăng kiểm'
      WHEN 'bảo hiểm' THEN 'Bảo hiểm'
      WHEN 'bao hiem' THEN 'Bảo hiểm'
      WHEN 'phí đường bộ' THEN 'Phí đường bộ'
      WHEN 'phi duong bo' THEN 'Phí đường bộ'
      ELSE NULL
    END AS "title",
    e."valid_to",
    COALESCE(c."reminder_lead_days", 30) AS "reminder_lead_days",
    ROW_NUMBER() OVER (
      PARTITION BY e."vehicle_component", e."truck_id",
        CASE lower(trim(c."name"))
          WHEN 'đăng kiểm' THEN 'INSPECTION'
          WHEN 'dang kiem' THEN 'INSPECTION'
          WHEN 'bảo hiểm' THEN 'INSURANCE'
          WHEN 'bao hiem' THEN 'INSURANCE'
          WHEN 'phí đường bộ' THEN 'ROAD_FEE'
          WHEN 'phi duong bo' THEN 'ROAD_FEE'
          ELSE NULL
        END
      ORDER BY e."valid_to" DESC, e."id" DESC
    ) AS "rank_in_kind"
  FROM "expenses" e
  INNER JOIN "expense_categories" c ON c."id" = e."category_id"
  WHERE e."deleted_at" IS NULL
    AND c."is_renewable" = true
    AND e."valid_to" IS NOT NULL
    AND e."truck_id" IS NOT NULL
    AND e."vehicle_component" IN ('TRUCK', 'TRAILER')
),
latest_renewable_expense_candidates AS (
  SELECT *
  FROM renewable_expense_candidates
  WHERE "kind" IS NOT NULL
    AND "rank_in_kind" = 1
),
existing_active_backfilled_renewable_schedules AS (
  SELECT
    vs."id",
    vs."vehicle_component",
    vs."vehicle_id",
    vs."kind",
    vs."source_key",
    ROW_NUMBER() OVER (
      PARTITION BY vs."vehicle_component", vs."vehicle_id", vs."kind"
      ORDER BY vs."updated_at" DESC, vs."id" DESC
    ) AS "rank_in_kind"
  FROM "vehicle_schedules" vs
  WHERE vs."status" = 'ACTIVE'
    AND vs."source_key" LIKE 'renewable-expense:%'
),
update_renewable_expense_schedules AS (
  UPDATE "vehicle_schedules" existing
  SET
    "source_key" = CONCAT('renewable-expense:', candidate."expense_id"),
    "title" = candidate."title",
    "due_at" = candidate."valid_to" AT TIME ZONE 'Asia/Ho_Chi_Minh',
    "remind_at" = (candidate."valid_to" - make_interval(days => candidate."reminder_lead_days")) AT TIME ZONE 'Asia/Ho_Chi_Minh',
    "updated_at" = now(),
    "updated_by" = actor."id"
  FROM latest_renewable_expense_candidates candidate
  INNER JOIN existing_active_backfilled_renewable_schedules existing_backfilled
    ON existing_backfilled."vehicle_component" = candidate."vehicle_component"
    AND existing_backfilled."vehicle_id" = candidate."vehicle_id"
    AND existing_backfilled."kind" = candidate."kind"
    AND existing_backfilled."rank_in_kind" = 1
  CROSS JOIN actor
  WHERE existing."id" = existing_backfilled."id"
    AND existing_backfilled."source_key" <> CONCAT('renewable-expense:', candidate."expense_id")
  RETURNING existing."id", existing."vehicle_component", existing."vehicle_id", existing."kind"
),
insert_renewable_expense_schedules AS (
  INSERT INTO "vehicle_schedules" (
    "vehicle_component",
    "vehicle_id",
    "kind",
    "source_key",
    "title",
    "due_at",
    "remind_at",
    "status",
    "created_by",
    "updated_by"
  )
  SELECT
    candidate."vehicle_component",
    candidate."vehicle_id",
    candidate."kind",
    CONCAT('renewable-expense:', candidate."expense_id"),
    candidate."title",
    candidate."valid_to" AT TIME ZONE 'Asia/Ho_Chi_Minh',
    (candidate."valid_to" - make_interval(days => candidate."reminder_lead_days")) AT TIME ZONE 'Asia/Ho_Chi_Minh',
    'ACTIVE'::"vehicle_schedule_status",
    actor."id",
    actor."id"
  FROM latest_renewable_expense_candidates candidate
  CROSS JOIN actor
  WHERE NOT EXISTS (
    SELECT 1
    FROM "vehicle_schedules" existing
    WHERE existing."source_key" = CONCAT('renewable-expense:', candidate."expense_id")
  )
    AND NOT EXISTS (
      SELECT 1
      FROM update_renewable_expense_schedules updated
      WHERE updated."vehicle_component" = candidate."vehicle_component"
        AND updated."vehicle_id" = candidate."vehicle_id"
        AND updated."kind" = candidate."kind"
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "vehicle_schedules" existing
      WHERE existing."vehicle_component" = candidate."vehicle_component"
        AND existing."vehicle_id" = candidate."vehicle_id"
        AND existing."kind" = candidate."kind"
        AND existing."status" = 'ACTIVE'
    )
  ON CONFLICT ("source_key") DO NOTHING
  RETURNING "id"
)
SELECT
  (SELECT count(*) FROM insert_legacy_truck_schedules) AS "legacy_truck_rows",
  (SELECT count(*) FROM update_renewable_expense_schedules) AS "renewable_expense_updates",
  (SELECT count(*) FROM insert_renewable_expense_schedules) AS "renewable_expense_rows";
