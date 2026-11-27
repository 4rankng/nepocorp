-- NEPO-68 đối soát — Phải trả attribution for lot fees: which supplier a
-- Trả-NCC cost row is owed to. Nullable: unattributed rows stay in the
-- "chưa gắn NCC" bucket of the payables lot-fee section. No ledger posting
-- happens from this link alone (accruals stay in the expense flow).
ALTER TABLE "shipment_costs" ADD COLUMN "supplier_id" integer;--> statement-breakpoint
ALTER TABLE "shipment_costs" ADD CONSTRAINT "shipment_costs_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shipment_costs_supplier_idx" ON "shipment_costs" USING btree ("supplier_id");
