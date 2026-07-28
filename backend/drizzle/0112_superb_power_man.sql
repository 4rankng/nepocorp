CREATE TYPE "public"."vehicle_schedule_kind" AS ENUM('MAINTENANCE', 'INSPECTION', 'INSURANCE', 'ROAD_FEE', 'DOCUMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."vehicle_schedule_status" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "vehicle_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_component" "vehicle_component" NOT NULL,
	"vehicle_id" integer NOT NULL,
	"kind" "vehicle_schedule_kind" NOT NULL,
	"title" varchar(255) NOT NULL,
	"document_number" varchar(120),
	"notes" text,
	"due_at" timestamp with time zone NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"status" "vehicle_schedule_status" DEFAULT 'ACTIVE' NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" integer,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" integer,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_schedules_remind_before_due_chk" CHECK ("vehicle_schedules"."remind_at" <= "vehicle_schedules"."due_at")
);
--> statement-breakpoint
ALTER TABLE "vehicle_schedules" ADD CONSTRAINT "vehicle_schedules_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_schedules" ADD CONSTRAINT "vehicle_schedules_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_schedules" ADD CONSTRAINT "vehicle_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_schedules" ADD CONSTRAINT "vehicle_schedules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vehicle_schedules_vehicle_idx" ON "vehicle_schedules" USING btree ("vehicle_component","vehicle_id");--> statement-breakpoint
CREATE INDEX "vehicle_schedules_status_remind_due_idx" ON "vehicle_schedules" USING btree ("status","remind_at","due_at","id");