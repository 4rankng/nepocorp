-- NEPO-49 — Tyre tracking board (Bảng theo dõi lốp xe).
-- Per-truck 22-slot sheet (docs/design/THEO-DOI-LOP.xlsx): each tyre_positions
-- row is one data row of the sheet (nhãn hiệu, cỡ lốp, loại gai, số seri,
-- model, ngày thay, ghi chú); tyre_changes holds the replacement history
-- per slot (ngày, seri cũ → seri mới). Inline cell edits write no history
-- row; the "Thay lốp" flow writes one.
CREATE TABLE "tyre_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"truck_id" integer NOT NULL,
	"position_number" integer NOT NULL,
	"old_serial" varchar(64),
	"new_serial" varchar(64),
	"changed_at" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tyre_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"truck_id" integer NOT NULL,
	"position_number" integer NOT NULL,
	"serial" varchar(64),
	"brand" varchar(64),
	"size" varchar(32),
	"tread_type" varchar(16),
	"model" varchar(64),
	"last_changed_at" date,
	"note" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tyre_positions_truck_position_unique" UNIQUE("truck_id","position_number")
);
--> statement-breakpoint
ALTER TABLE "tyre_changes" ADD CONSTRAINT "tyre_changes_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tyre_positions" ADD CONSTRAINT "tyre_positions_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tyre_changes_truck_position_idx" ON "tyre_changes" USING btree ("truck_id","position_number");--> statement-breakpoint
CREATE INDEX "tyre_positions_truck_id_idx" ON "tyre_positions" USING btree ("truck_id");