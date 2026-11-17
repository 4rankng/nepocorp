ALTER TABLE "ledger" ADD COLUMN "txn_table" varchar(32);

-- NEPO-50 backfill — encodes the central mapping in src/lib/ledger-txn-table.ts
-- (backend/src/lib/ledger-txn-table.ts). txn_type alone is ambiguous for
-- UNLOCK_REVERSAL / ADJUSTMENT / FORWARDER_ADVANCE, so those families are
-- disambiguated by the posting-note prefix, most specific first; the mapping
-- test (ledger-txn-table.test.ts) re-derives this CASE from live rows and fails
-- if the two ever drift.
UPDATE "ledger" SET "txn_table" = CASE
  -- rows without a txn reference
  WHEN "txn_id" IS NULL THEN NULL
  -- ambiguous families: note prefix decides (ordered most-specific-first)
  WHEN "txn_type" IN ('UNLOCK_REVERSAL', 'FORWARDER_ADVANCE') AND ("note" LIKE 'Phí chi hộ%' OR "note" LIKE 'Chi hộ%') THEN 'trip_expenses'
  WHEN "txn_type" = 'ADJUSTMENT' AND "note" LIKE 'Điều chỉnh phí chi hộ%' THEN 'trip_expenses'
  WHEN "txn_type" = 'ADJUSTMENT' AND "note" LIKE 'Đối trừ công nợ #%' THEN 'debt_offsets'
  WHEN "txn_type" = 'ADJUSTMENT' AND "note" LIKE 'Điều chỉnh công nợ theo Giấy báo nợ%' THEN 'billing_documents'
  WHEN "txn_type" = 'ADJUSTMENT' AND "note" LIKE 'Hủy kỷ luật #%' THEN 'penalties'
  WHEN "txn_type" = 'ADJUSTMENT' AND ("note" LIKE 'Điều chỉnh chi phí%' OR "note" LIKE 'Ghi lại chi phí sau điều chỉnh%' OR "note" LIKE 'Hủy chi phí%') THEN 'expenses'
  -- ambiguous families: unmatched notes fall back to the type default,
  -- mirroring TXN_TYPE_TABLES in ledger-txn-table.ts
  WHEN "txn_type" = 'UNLOCK_REVERSAL' THEN 'trips'
  WHEN "txn_type" = 'ADJUSTMENT' THEN 'trips'
  WHEN "txn_type" = 'FORWARDER_ADVANCE' THEN 'advance_requests'
  -- unambiguous families
  WHEN "txn_type" IN ('TRIP_REVENUE', 'DRIVER_SALARY', 'FUEL_EXPENSE', 'EXTERNAL_CARRIER_COST', 'COMMISSION', 'PAYMENT_RECEIVED') THEN 'trips'
  WHEN "txn_type" = 'SERVICE_FEE' THEN 'trip_expenses'
  WHEN "txn_type" = 'PENALTY' THEN 'penalties'
  WHEN "txn_type" = 'VENDOR_EXPENSE' THEN 'expenses'
  WHEN "txn_type" = 'FORWARDER_SETTLEMENT' THEN 'advance_settlements'
  ELSE NULL
END;
