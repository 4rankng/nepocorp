CREATE TABLE "ocr_usage_counters" (
	"year_month" varchar(7) PRIMARY KEY NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
