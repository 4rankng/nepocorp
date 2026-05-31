ALTER TABLE "trailers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "trailers" CASCADE;--> statement-breakpoint
ALTER TABLE "trips" RENAME COLUMN "trailer_id" TO "trailer_type";--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_trailer_id_trailers_id_fk";
--> statement-breakpoint
ALTER TABLE "trips" DROP CONSTRAINT "trips_trailer_id_trailers_id_fk";
--> statement-breakpoint
ALTER TABLE "trucks" ADD COLUMN "trailer_plate_number" varchar(20);--> statement-breakpoint
ALTER TABLE "trucks" ADD COLUMN "trailer_type" "trailer_type";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "trailer_id";--> statement-breakpoint
DROP TYPE "public"."trailer_status";