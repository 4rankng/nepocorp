-- N1 tires: replace warranty-until with purchase date, add trailer linkage +
-- disposal (thanh lý) metadata. status stays varchar(20) (DISPOSED already fits).

ALTER TABLE "tires" RENAME COLUMN "warranty_until" TO "purchased_at";--> statement-breakpoint

ALTER TABLE "tires" ADD COLUMN "trailer_id" integer;--> statement-breakpoint
ALTER TABLE "tires" ADD COLUMN "disposal_date" date;--> statement-breakpoint
ALTER TABLE "tires" ADD COLUMN "disposal_reason" varchar(120);--> statement-breakpoint

ALTER TABLE "tires" ADD CONSTRAINT "tires_trailer_id_trailers_id_fk"
  FOREIGN KEY ("trailer_id") REFERENCES "trailers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "tires_trailer_id_idx" ON "tires" ("trailer_id");
