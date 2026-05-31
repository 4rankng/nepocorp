CREATE TABLE "salary_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" integer,
	"year" integer,
	"start_date" date,
	"end_date" date,
	"label" varchar(100),
	"default_start_day" integer,
	"default_end_day" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "cap_table_history" ALTER COLUMN "percentage" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "cap_table_history" ADD COLUMN "contribution_amount" numeric(15, 0) DEFAULT '0' NOT NULL;