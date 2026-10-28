CREATE TABLE "ocr_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" integer NOT NULL,
	"model" varchar(160),
	"status" varchar(16) NOT NULL,
	"response" text,
	"error_msg" text,
	"user_id" integer,
	CONSTRAINT "ocr_requests_status_check" CHECK ("ocr_requests"."status" in ('completed','failed'))
);
--> statement-breakpoint
ALTER TABLE "ocr_requests" ADD CONSTRAINT "ocr_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ocr_requests_created_at_idx" ON "ocr_requests" USING btree ("created_at");