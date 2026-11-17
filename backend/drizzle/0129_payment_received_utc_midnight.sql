-- NEPO-48: customer payment "Ngày nhận" rows were stored at midnight
-- Indochina time (T00:00:00+07:00 = 17:00:00Z of the PREVIOUS day), while
-- every ledger reader displays by slicing toISOString() — the repo-wide
-- "Indochina wall time at UTC-offset 0" convention. Net effect: every
-- back-dated payment rendered one day early in the sổ chi tiết (a 16/10
-- receipt showed 15/10) and sat on the wrong side of period boundaries.
--
-- recordPayment now stores UTC midnight of the received day; this migration
-- shifts the mis-stored rows onto the same convention.
--
-- The exact 17:00:00.000000 time-of-day is the +07-midnight fingerprint —
-- receivedDateToTimestamp produced exactly it, and nothing else does:
-- entry-time defaults carry Date.now() millisecond noise, seeded rows use
-- round office hours. Idempotent: shifted rows land on 00:00:00.000000 and
-- no longer match the predicate.
UPDATE ledger
SET timestamp = timestamp + interval '7 hours'
WHERE entity_type = 'CUSTOMER'
  AND txn_type = 'PAYMENT_RECEIVED'
  AND timestamp::time = TIME '17:00:00';
