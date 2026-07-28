CREATE TABLE "trip_fuel_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"supplier_id" integer,
	"liters" numeric(10, 2) NOT NULL,
	"payment_method" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trip_fuel_allocations_liters_positive" CHECK ("trip_fuel_allocations"."liters" > 0),
	CONSTRAINT "trip_fuel_allocations_payment_method_check" CHECK ("trip_fuel_allocations"."payment_method" IN ('CREDIT', 'CASH')),
	CONSTRAINT "trip_fuel_allocations_counterparty_check" CHECK (("trip_fuel_allocations"."payment_method" = 'CREDIT' AND "trip_fuel_allocations"."supplier_id" IS NOT NULL)
      OR ("trip_fuel_allocations"."payment_method" = 'CASH' AND "trip_fuel_allocations"."supplier_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "trip_fuel_allocations" ADD CONSTRAINT "trip_fuel_allocations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_fuel_allocations" ADD CONSTRAINT "trip_fuel_allocations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_fuel_allocations_trip_idx" ON "trip_fuel_allocations" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_fuel_allocations_supplier_idx" ON "trip_fuel_allocations" USING btree ("supplier_id");--> statement-breakpoint
INSERT INTO "trip_fuel_allocations" ("trip_id", "supplier_id", "liters", "payment_method")
SELECT "id", "fuel_supplier_id", "fuel_liters", 'CREDIT'
FROM "trips"
WHERE "fuel_supplier_id" IS NOT NULL
  AND "fuel_liters" IS NOT NULL
  AND "fuel_liters" > 0;
