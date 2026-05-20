CREATE TYPE "public"."customer_status" AS ENUM('ACTIVE', 'LOCKED');--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "tax_code" varchar(20);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "contact_person" varchar(255);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "credit_limit" numeric(15, 0);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "status" "customer_status" DEFAULT 'ACTIVE';