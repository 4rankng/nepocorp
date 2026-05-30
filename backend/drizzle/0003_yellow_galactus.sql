ALTER TABLE "fuel_config" ADD COLUMN "warning_threshold" numeric(6, 2) DEFAULT '37';--> statement-breakpoint
ALTER TABLE "fuel_config" ADD COLUMN "critical_threshold" numeric(6, 2) DEFAULT '40';