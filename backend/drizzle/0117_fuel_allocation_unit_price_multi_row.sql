DROP INDEX "trip_fuel_allocations_supplier_once_idx";--> statement-breakpoint
DROP INDEX "trip_fuel_allocations_cash_once_idx";--> statement-breakpoint
ALTER TABLE "trip_fuel_allocations" ADD COLUMN "unit_price" numeric(12, 2);