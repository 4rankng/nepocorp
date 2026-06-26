CREATE TABLE "debit_note_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"document_type" varchar(20) DEFAULT 'DEBIT_NOTE' NOT NULL,
	"logo_storage_key" varchar(500),
	"title_text" varchar(100) DEFAULT 'GIẤY BÁO NỢ' NOT NULL,
	"issuer_name" varchar(200),
	"issuer_address" varchar(300),
	"issuer_tax_code" varchar(50),
	"accent_color" varchar(20) DEFAULT '#1F4E79' NOT NULL,
	"show_container_column" boolean DEFAULT true NOT NULL,
	"show_unit_column" boolean DEFAULT true NOT NULL,
	"grouping_mode" varchar(20) DEFAULT 'ROUTE' NOT NULL,
	"amount_in_words" boolean DEFAULT false NOT NULL,
	"orientation" varchar(10) DEFAULT 'landscape' NOT NULL,
	"terms_text" text,
	"signature_left_label" varchar(100) DEFAULT 'Khách hàng',
	"signature_right_label" varchar(100) DEFAULT 'Kế toán trưởng',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "billing_documents" ADD COLUMN "debit_note_template_id" integer;--> statement-breakpoint
ALTER TABLE "billing_documents" ADD COLUMN "debit_note_template_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "debit_note_template_id" integer;--> statement-breakpoint
ALTER TABLE "debit_note_templates" ADD CONSTRAINT "debit_note_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_debit_note_template_id_debit_note_templates_id_fk" FOREIGN KEY ("debit_note_template_id") REFERENCES "public"."debit_note_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_debit_note_template_id_debit_note_templates_id_fk" FOREIGN KEY ("debit_note_template_id") REFERENCES "public"."debit_note_templates"("id") ON DELETE no action ON UPDATE no action;