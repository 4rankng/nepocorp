-- A truck may hold only ONE active driver. Existing data already violates that
-- (kanban 101026003240 item f: 15C-180.99 had two non-deleted driver profiles,
-- so fleet and dispatch disagreed about who drives it), so de-duplicate first:
-- per truck keep the profile that has a linked user account (an orphan profile
-- cannot be managed from /users at all), otherwise the oldest row; clear the
-- truck on the rest. Trips and salary history are untouched — only the truck
-- link is dropped, so nothing is lost and the driver can be re-assigned.
UPDATE "drivers" SET "assigned_truck_id" = NULL, "updated_at" = now()
WHERE "assigned_truck_id" IS NOT NULL
  AND "deleted_at" IS NULL
  AND "id" <> (
    SELECT d2."id" FROM "drivers" d2
    WHERE d2."assigned_truck_id" = "drivers"."assigned_truck_id"
      AND d2."deleted_at" IS NULL
    ORDER BY (d2."user_id" IS NULL), d2."id"
    LIMIT 1
  );

-- Partial unique index. Written with IF NOT EXISTS on purpose: drizzle-kit's
-- runner strips partial-index predicates when applying, so this migration is
-- applied through psql (make prod-migrate-file) and the guard keeps a later
-- runner pass from creating a second, full index. See skill kanban-work.
CREATE UNIQUE INDEX IF NOT EXISTS "drivers_assigned_truck_active_unq" ON "drivers" USING btree ("assigned_truck_id") WHERE "drivers"."assigned_truck_id" IS NOT NULL AND "drivers"."deleted_at" IS NULL;
