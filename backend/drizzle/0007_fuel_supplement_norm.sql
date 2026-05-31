-- Add fuel supplement norm snapshot column to trips.
-- Records the per-trip fuel supplement norm at trip creation time for deterministic recalculation.
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "fuel_supplement_norm_applied" numeric(6,2);
