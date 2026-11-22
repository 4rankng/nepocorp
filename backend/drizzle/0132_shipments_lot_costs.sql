ALTER TYPE "public"."role" ADD VALUE 'DISPATCHER';--> statement-breakpoint
CREATE TABLE "shipment_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"cost_type" varchar(32) NOT NULL,
	"direction" varchar(10) DEFAULT 'SUPPLIER' NOT NULL,
	"service_mode" varchar(10) DEFAULT 'SERVICE' NOT NULL,
	"description" varchar(500) NOT NULL,
	"currency" varchar(3) DEFAULT 'VND' NOT NULL,
	"fx_amount" numeric(18, 2),
	"exchange_rate" numeric(18, 4),
	"amount" numeric(15, 0) NOT NULL,
	"vat_rate" numeric(5, 3) DEFAULT '0.080' NOT NULL,
	"awaiting_invoice" boolean DEFAULT false NOT NULL,
	"incurred_date" date NOT NULL,
	"note" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_costs_direction_check" CHECK ("shipment_costs"."direction" IN ('CUSTOMER', 'SUPPLIER')),
	CONSTRAINT "shipment_costs_service_mode_check" CHECK ("shipment_costs"."service_mode" IN ('SERVICE', 'ADVANCE')),
	CONSTRAINT "shipment_costs_currency_check" CHECK ("shipment_costs"."currency" IN ('VND', 'USD'))
);
--> statement-breakpoint
CREATE TABLE "shipment_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"doc_type" varchar(32) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"storage_key" varchar(255) NOT NULL,
	"mime_type" varchar(120),
	"file_size" integer,
	"note" text,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_code" varchar(32) NOT NULL,
	"customer_id" integer NOT NULL,
	"flow_type" varchar(10),
	"shipping_line" varchar(120),
	"booking_no" varchar(100),
	"bl_no" varchar(100),
	"vessel_voyage" varchar(120),
	"pol" varchar(100),
	"pod" varchar(100),
	"etd" date,
	"eta" date,
	"cutoff_date" date,
	"container_seals" text,
	"customs_declaration_no" varchar(100),
	"customs_declaration_date" date,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "shipments_shipment_code_unique" UNIQUE("shipment_code")
);
--> statement-breakpoint
ALTER TABLE "billing_documents" ADD COLUMN "shipment_id" integer;--> statement-breakpoint
ALTER TABLE "billing_documents" ADD COLUMN "parent_document_id" integer;--> statement-breakpoint
ALTER TABLE "billing_documents" ADD COLUMN "document_number" varchar(60);--> statement-breakpoint
ALTER TABLE "billing_documents" ADD COLUMN "issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "billing_documents" ADD COLUMN "shipment_info" jsonb;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "shipment_id" integer;--> statement-breakpoint
ALTER TABLE "shipment_costs" ADD CONSTRAINT "shipment_costs_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_costs" ADD CONSTRAINT "shipment_costs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipment_costs_shipment_idx" ON "shipment_costs" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "shipment_documents_shipment_idx" ON "shipment_documents" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "shipments_customer_idx" ON "shipments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "shipments_cutoff_date_idx" ON "shipments" USING btree ("cutoff_date");--> statement-breakpoint
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_documents_lot_main_unique" ON "billing_documents" USING btree ("shipment_id") WHERE "billing_documents"."deleted_at" IS NULL AND "billing_documents"."type" = 'DEBIT_NOTE' AND "billing_documents"."parent_document_id" IS NULL AND "billing_documents"."shipment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "trips_shipment_id_idx" ON "trips" USING btree ("shipment_id");