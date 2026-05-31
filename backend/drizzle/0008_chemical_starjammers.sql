ALTER TABLE "road_config" ALTER COLUMN "toll_per_station" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "road_config" ALTER COLUMN "return_cargo_bonus" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "fuel_supplement_norm_applied" numeric(6, 2);