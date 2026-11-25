-- NEPO-70 — the (customer, period) unique guard must cover monthly/legacy
-- debit notes only. Lot notes (shipment_id IS NOT NULL) kept matching it, so
-- the second lot of the same customer in the same month died on
-- 409 "Dữ liệu đã tồn tại" (POST /api/finance/billing-documents). Per-lot
-- uniqueness stays enforced by billing_documents_lot_main_unique
-- (1 lô = 1 Báo nợ chính).
--
-- Safe by construction: the new predicate is strictly narrower than the old
-- one, so no existing row can violate it and no data is touched.
DROP INDEX "billing_documents_active_period_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "billing_documents_active_period_unique" ON "billing_documents" USING btree ("type","entity_type","entity_id","range_from","range_to") WHERE "billing_documents"."deleted_at" IS NULL AND "billing_documents"."type" = 'DEBIT_NOTE' AND "billing_documents"."parent_document_id" IS NULL AND "billing_documents"."shipment_id" IS NULL;
