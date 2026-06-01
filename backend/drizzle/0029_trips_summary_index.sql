CREATE INDEX IF NOT EXISTS "trips_deleted_at_departure_date_idx" ON "trips" ("deleted_at", "departure_date");
